"""Apple Vision text reader bundled in the .app (Contents/MacOS/IskraFrameText).

The app passes its path in ISKRA_FRAME_TEXT. Helpers from apps up to 1.0.8 used
the Latin-only `.fast` Vision level and printed bare strings: Russian headings
came out as «KneTorue». Such a helper does not answer `--version`, so it is
detected and not used for slide chapters (RapidOCR stays the fallback).
"""
import json
import os
import select
import subprocess
import time

PROTOCOL = 2


def helper():
    """Path of a helper that speaks protocol 2, else None. Never compiles."""
    path = os.environ.get('ISKRA_FRAME_TEXT', '')
    if not path or not os.access(path, os.X_OK): return None
    try:
        out = subprocess.run([path, '--version'], stdin=subprocess.DEVNULL, capture_output=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    words = out.stdout.decode('utf-8', 'replace').split()
    if out.returncode or len(words) != 2 or words[0] != 'iskra-frame-text': return None
    try: return path if int(words[1]) >= PROTOCOL else None
    except ValueError: return None


def lines_from(payload):
    """Validated geometry rows (fractions, origin top-left)."""
    rows = []
    for item in payload if isinstance(payload, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get('text'), str): continue
        try:
            rows.append(dict(text=item['text'], x=float(item.get('x', 0)), y=float(item.get('y', 0)),
                             width=float(item.get('width', 0)), height=float(item.get('height', 0))))
        except (TypeError, ValueError):
            continue
    return rows


def read_image(path_to_helper, encoded, timeout=15):
    """One PNG/JPEG/PPM frame → rows. Used by the per-transcription slide pass."""
    try:
        out = subprocess.run([path_to_helper, '--lines'], input=encoded, capture_output=True, timeout=timeout)
        return lines_from(json.loads(out.stdout or b'[]'))
    except (ValueError, OSError, subprocess.SubprocessError):
        return []


class VisionStream:
    """One helper process for the whole job: frames in as PPM, a JSON line out."""

    def __init__(self, path_to_helper, timeout=30):
        self.timeout = timeout
        self.process = subprocess.Popen([path_to_helper, '--stream'], stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        self.pending = b''
        # The first frame loads Vision's text model; under load (speech running
        # in parallel) that alone can take tens of seconds.
        self.first = True

    def __call__(self, image):
        """`image` — RGB uint8 array (h, w, 3)."""
        height, width = image.shape[:2]
        try:
            self.process.stdin.write(b'P6\n%d %d\n255\n' % (width, height))
            self.process.stdin.write(image.tobytes())
            self.process.stdin.flush()
        except (BrokenPipeError, OSError) as error:
            raise ValueError('Распознавание слайдов остановилось. Повторите задание.') from error
        deadline = time.monotonic() + (max(self.timeout, 120) if self.first else self.timeout)
        self.first = False
        while b'\n' not in self.pending:
            left = deadline - time.monotonic()
            if left <= 0 or not select.select([self.process.stdout], [], [], left)[0]:
                raise ValueError('Распознавание слайдов не ответило вовремя. Повторите задание.')
            part = os.read(self.process.stdout.fileno(), 65536)
            if not part: raise ValueError('Распознавание слайдов остановилось. Повторите задание.')
            self.pending += part
        line, self.pending = self.pending.split(b'\n', 1)
        try: return lines_from(json.loads(line))
        except ValueError: return []

    def close(self):
        for stream in (self.process.stdin, self.process.stdout):
            try: stream.close()
            except OSError: pass
        try: self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill(); self.process.wait()

    def __enter__(self): return self

    def __exit__(self, *_): self.close()
