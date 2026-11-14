"""Bounded sequential frame extraction and conservative OCR reuse."""
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
    import cv2
    return cv2.cvtColor(np.frombuffer(body, dtype=np.uint8).reshape(h,w,3), cv2.COLOR_RGB2BGR)


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
        import cv2
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.GaussianBlur(cv2.resize(gray, (512,128), interpolation=cv2.INTER_AREA), (3,3), 0)

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
