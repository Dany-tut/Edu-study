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


class Stalled(Exception):
    pass


class VisionStream:
    """One helper process for the whole job: frames in as PPM, a JSON line out.

    Vision occasionally stalls inside TextRecognition (an internal semaphore
    that never fires, seen a few times in hundreds of runs). A stalled or dead
    helper is killed and restarted, and the frame is read again; only repeated
    failures of the same frame end the job.
    """

    def __init__(self, path_to_helper, timeout=15, first_timeout=45, attempts=3):
        self.path, self.timeout, self.first_timeout, self.attempts = path_to_helper, timeout, first_timeout, attempts
        self.restarts = 0
        self.process = None
        self.start()

    def start(self):
        self.process = subprocess.Popen([self.path, '--stream'], stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        self.pending = b''
        # The first frame loads Vision's text model; under load (speech running
        # in parallel) that alone can take a while.
        self.first = True

    def once(self, image):
        height, width = image.shape[:2]
        try:
            self.process.stdin.write(b'P6\n%d %d\n255\n' % (width, height))
            self.process.stdin.write(image.tobytes())
            self.process.stdin.flush()
        except (BrokenPipeError, OSError) as error:
            raise Stalled() from error
        deadline = time.monotonic() + (self.first_timeout if self.first else self.timeout)
        while b'\n' not in self.pending:
            left = deadline - time.monotonic()
            if left <= 0 or not select.select([self.process.stdout], [], [], left)[0]: raise Stalled()
            part = os.read(self.process.stdout.fileno(), 65536)
            if not part: raise Stalled()
            self.pending += part
        self.first = False
        line, self.pending = self.pending.split(b'\n', 1)
        try: return lines_from(json.loads(line))
        except ValueError: return []

    def __call__(self, image):
        """`image` — RGB uint8 array (h, w, 3)."""
        for attempt in range(self.attempts):
            try: return self.once(image)
            except Stalled:
                self.kill()
                if attempt+1 == self.attempts: break
                self.restarts += 1
                self.start()
        raise ValueError('Распознавание слайдов не отвечает. Перезапустите Mac и повторите задание.')

    def kill(self):
        if self.process is None: return
        if self.process.poll() is None: self.process.kill()
        self.close()

    def close(self):
        if self.process is None: return
        for stream in (self.process.stdin, self.process.stdout):
            try: stream.close()
            except OSError: pass
        try: self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill(); self.process.wait()
        self.process = None

    def __enter__(self): return self

    def __exit__(self, *_): self.close()
