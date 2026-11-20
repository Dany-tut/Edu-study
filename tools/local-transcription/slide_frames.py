"""Bounded sequential frame extraction and conservative OCR reuse.

numpy only: the Vision path runs in the speech runtime, which has no OpenCV.
Frames are RGB uint8 arrays (h, w, 3).
"""
import os
import select
import subprocess
import time
from collections import deque
from contextlib import contextmanager


def exact(stream, size, timeout=45):
    """Unbuffered pipe reads with a per-frame deadline; no unbounded stderr pipe."""
    data = bytearray()
    deadline = time.monotonic() + timeout
    while len(data) < size:
        left = deadline - time.monotonic()
        if left <= 0 or not select.select([stream], [], [], left)[0]:
            raise TimeoutError('Не удалось вовремя прочитать кадр видео.')
        part = os.read(stream.fileno(), min(size-len(data), 1024*1024))
        if not part:
            if not data: return b''
            raise ValueError('Неполный кадр видео.')
        data.extend(part)
    return bytes(data)


def ppm(stream):
    def line():
        data = bytearray()
        while len(data) < 80:
            c = exact(stream, 1)
            if not c: return bytes(data)
            data.extend(c)
            if c == b'\n': return bytes(data)
        raise ValueError('Неверный заголовок кадра.')
    signature = line()
    if not signature: return None
    if signature != b'P6\n': raise ValueError('Неверный формат кадра.')
    w, h = map(int, line().split())
    if line() != b'255\n' or not (0 < w*h <= 25_000_000): raise ValueError('Неверный размер кадра.')
    body = exact(stream, w*h*3)
    if len(body) != w*h*3: raise ValueError('Неполный кадр видео.')
    import numpy as np
    return np.frombuffer(body, dtype=np.uint8).reshape(h,w,3)


def ppm_bytes(data):
    """A single PPM frame already in memory (seek probes)."""
    import tempfile
    # ppm() reads a real descriptor with a deadline; a regular file is always ready.
    with tempfile.TemporaryFile() as handle:
        handle.write(data); handle.flush(); handle.seek(0)
        image = ppm(handle)
    if image is None: raise ValueError('Не удалось прочитать кадр видео.')
    return image


def area_resize(gray, width, height):
    """Box-average resize (like cv2.INTER_AREA when shrinking)."""
    import numpy as np
    def axis(size, count):
        edges = np.linspace(0, size, count+1)
        lo = np.minimum(np.floor(edges[:-1]).astype(int), size-1)
        hi = np.maximum(lo+1, np.ceil(edges[1:]).astype(int))
        return lo, hi
    rows = gray.astype(np.float32)
    lo, hi = axis(rows.shape[0], height)
    cumulative = np.vstack([np.zeros((1, rows.shape[1]), np.float32), np.cumsum(rows, axis=0)])
    rows = (cumulative[hi]-cumulative[lo]) / (hi-lo)[:, None]
    lo, hi = axis(rows.shape[1], width)
    cumulative = np.hstack([np.zeros((rows.shape[0], 1), np.float32), np.cumsum(rows, axis=1)])
    return (cumulative[:, hi]-cumulative[:, lo]) / (hi-lo)[None, :]


@contextmanager
def frames(command):
    # PPM has explicit dimensions and avoids PNG encode/decode per sample.
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
    def stream():
        while True:
            image = ppm(process.stdout)
            if image is None: break
            yield image
        if process.wait(timeout=10): raise ValueError('Не удалось прочитать видео до конца.')
    try:
        yield stream()
    finally:
        process.stdout.close()
        if process.poll() is None:
            process.terminate()
            try: process.wait(timeout=2)
            except subprocess.TimeoutExpired: process.kill(); process.wait()


@contextmanager
def timed_frames(command):
    """Frames plus their stream times from a `showinfo` filter in `command`.

    showinfo logs to stderr (needs `-v info`); a thread drains it so neither
    pipe can fill up and stall FFmpeg. Yields an iterator of (seconds, image).
    """
    import re
    import threading
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
    times, ready = deque(), threading.Condition()
    done = [False]
    def drain():
        for line in iter(process.stderr.readline, b''):
            match = re.search(rb'Parsed_showinfo.*?pts_time:\s*(-?[\d.]+)', line)
            if match:
                with ready: times.append(float(match.group(1))); ready.notify()
        with ready: done[0] = True; ready.notify()
    reader = threading.Thread(target=drain, daemon=True); reader.start()
    def stream():
        while True:
            image = ppm(process.stdout)
            if image is None: break
            with ready:
                if not ready.wait_for(lambda: times or done[0], timeout=45) or not times:
                    raise ValueError('Не удалось прочитать время кадра видео.')
                at = times.popleft()
            yield at, image
        if process.wait(timeout=10): raise ValueError('Не удалось прочитать видео до конца.')
    try:
        yield stream()
    finally:
        process.stdout.close()
        if process.poll() is None:
            process.terminate()
            try: process.wait(timeout=2)
            except subprocess.TimeoutExpired: process.kill(); process.wait()
        reader.join(timeout=2)
        process.stderr.close()


class TitleCache:
    """Compare against OCR'd frames, not the last frame (no gradual drift).

    Local tile differences catch a single changed letter/number. A refresh at
    least once per 60 seconds bounds reuse even when compression hides a change.
    Eight images bound memory independent of video duration.
    """
    def __init__(self, recognize):
        self.recognize = recognize
        self.entries = deque(maxlen=8)
        self.calls = self.hits = 0

    @staticmethod
    def signature(image):
        import numpy as np
        rgb = image.astype(np.float32)
        gray = rgb[..., 0]*.299 + rgb[..., 1]*.587 + rgb[..., 2]*.114
        small = area_resize(gray, 512, 128)
        # 3×3 Gaussian (1-2-1), edges replicated.
        padded = np.pad(small, 1, mode='edge')
        small = (padded[:-2]+2*padded[1:-1]+padded[2:]) / 4
        small = (small[:, :-2]+2*small[:, 1:-1]+small[:, 2:]) / 4
        return np.clip(np.rint(small), 0, 255).astype(np.uint8)

    @staticmethod
    def unchanged(a, b):
        import numpy as np
        mask = np.abs(a.astype(np.int16)-b.astype(np.int16)) > 18
        tiles = mask.reshape(8,16,32,16).mean(axis=(1,3))
        return mask.mean() < .0005 and tiles.max() < .02

    def read(self, image, at):
        signature = self.signature(image)
        for reference, title, checked_at in reversed(self.entries):
            if at-checked_at < 60 and self.unchanged(signature, reference):
                self.hits += 1
                return title
        title = self.recognize(image)
        self.calls += 1
        self.entries.append((signature,title,at))
        return title
