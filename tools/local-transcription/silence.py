"""Тихие отрезки и громкость записи — без ИИ, по уже нарезанным audio-*.wav.

Пишет montage.json: {duration, step, levels, quiet}. levels — громкость в дБ
на каждые `step` секунд (для формы волны в окне монтажа), quiet — отрезки
тише порога дольше QUIET_MIN секунд. Окно монтажа само фильтрует их своими
настройками (порог, минимальная длина, запас у краёв), поэтому здесь порог
мягкий и длина короткая: лишнее отрежет преподаватель, а пропущенное не
вернуть.
"""
import array, json, math, sys, wave
from pathlib import Path

try:
    import numpy as np  # есть в окружении Whisper; без него — медленнее, но так же
except ImportError:
    np = None

STEP = 0.5          # шаг громкости, с
FRAME = 0.1         # окно RMS для поиска тишины, с
QUIET_DB = -30.0    # тише — кандидат в паузу («шумный класс» в окне монтажа — −32)
QUIET_MIN = 5.0     # короче — не пауза
FLOOR = -70.0


def db(rms):
    return max(FLOOR, 20 * math.log10(rms / 32768)) if rms > 0 else FLOOR


def frames(path, size):
    with wave.open(str(path)) as f:
        rate, width = f.getframerate(), f.getsampwidth()
        if width != 2:
            raise ValueError('Ожидается 16-битный звук')
        n = max(1, int(rate * size))
        while True:
            chunk = f.readframes(n)
            if not chunk:
                return
            if np is not None:
                samples = np.frombuffer(chunk, dtype=np.int16).astype(np.float64)
                yield float(np.sqrt(np.mean(samples * samples))), len(samples) / rate
            else:
                samples = array.array('h', chunk)
                yield math.sqrt(sum(s * s for s in samples) / len(samples)), len(samples) / rate


def main(folder):
    folder = Path(folder)
    rms, t = [], 0.0
    for chunk in sorted(folder.glob('audio-*.wav')):
        for value, length in frames(chunk, FRAME):
            rms.append(db(value))
            t += length
    per_step = int(round(STEP / FRAME))
    levels = [round(sum(rms[i:i + per_step]) / len(rms[i:i + per_step]), 1) for i in range(0, len(rms), per_step)]
    quiet, start = [], None
    for i, level in enumerate(rms + [0.0]):
        if level <= QUIET_DB and start is None:
            start = i
        elif level > QUIET_DB and start is not None:
            length = (i - start) * FRAME
            if length >= QUIET_MIN:
                part = rms[start:i]
                quiet.append({'id': f'q{len(quiet)}', 'start': round(start * FRAME, 2), 'end': round(i * FRAME, 2),
                              'level': round(sum(part) / len(part), 1)})
            start = None
    (folder / 'montage.json').write_text(json.dumps({'duration': round(t, 2), 'step': STEP, 'levels': levels, 'quiet': quiet}))


if __name__ == '__main__':
    main(sys.argv[1])
