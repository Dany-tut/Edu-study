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


class VisionFailed(ValueError):
    """Vision did not answer even frame by frame: the job ends with this text."""


def write_all(stream, data, deadline):
    """Whole frame into the pipe. A raw pipe write may take only part of a
    large buffer (seen with 1.7 MB frames); a hung helper must not block us."""
    fd = stream.fileno()
    view = memoryview(data)
    while view:
        left = deadline - time.monotonic()
        if left <= 0 or not select.select([], [fd], [], left)[1]: raise Stalled()
        try: written = os.write(fd, view[:1 << 16])
        except (BrokenPipeError, OSError) as error: raise Stalled() from error
        view = view[written:]


class VisionStream:
    """Frames in as PPM, rows out. One helper process for the whole job.

    Vision occasionally stalls inside TextRecognition. A stalled helper is
    killed and restarted; after STREAM_STALLS stalls the job continues with a
    separate helper process per frame (`--lines`), which has not stalled in
    our runs. Only when that also fails twice in a row does the job end.
    """
    STREAM_STALLS = 2

    def __init__(self, path_to_helper, timeout=15, first_timeout=45, single_timeout=30):
        self.path, self.timeout, self.first_timeout, self.single_timeout = path_to_helper, timeout, first_timeout, single_timeout
        self.restarts = 0
        self.single = False
        self.single_failures = 0
        self.process = None
        self.start()

    def start(self):
        self.process = subprocess.Popen([self.path, '--stream'], stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        os.set_blocking(self.process.stdin.fileno(), False)
        self.pending = b''
        # The first frame loads Vision's text model; under load (speech running
        # in parallel) that alone can take a while.
        self.first = True

    @staticmethod
    def ppm(image):
        height, width = image.shape[:2]
        return b'P6\n%d %d\n255\n' % (width, height) + image.tobytes()

    def once(self, image):
        deadline = time.monotonic() + (self.first_timeout if self.first else self.timeout)
        write_all(self.process.stdin, self.ppm(image), deadline)
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

    def one_shot(self, image):
        try:
            out = subprocess.run([self.path, '--lines'], input=self.ppm(image), capture_output=True,
                                 timeout=self.single_timeout)
        except (OSError, subprocess.SubprocessError):
            out = None
        if out is None or out.returncode:
            self.single_failures += 1
            if self.single_failures >= 2:
                raise VisionFailed('Распознавание слайдов не отвечает. Перезапустите Mac и повторите задание.')
            return []
        self.single_failures = 0
        try: return lines_from(json.loads(out.stdout or b'[]'))
        except ValueError: return []

    def __call__(self, image):
        """`image` — RGB uint8 array (h, w, 3)."""
        while not self.single:
            try: return self.once(image)
            except Stalled:
                self.kill()
                self.restarts += 1
                if self.restarts >= self.STREAM_STALLS:
                    self.single = True
                    break
                self.start()
        return self.one_shot(image)

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
