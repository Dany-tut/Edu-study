"""Паузы записи и громкость — без ИИ, по уже нарезанным audio-*.wav.

Пишет montage.json: {duration, step, levels, floor, quiet}.
  levels — громкость в дБ на каждые `step` секунд (форма волны в окне монтажа);
  floor  — уровень фона этой записи (тихие 10 % замеров): пороги окна
           монтажа считаются от него, поэтому шумный класс и тихая комната
           обрабатываются одинаково;
  quiet  — кандидаты в паузы. Их два источника:
           • тихо: громкость ниже max(QUIET_DB, floor + QUIET_ABOVE_FLOOR);
           • без речи: Whisper не нашёл реплик дольше SPEECHLESS_MIN секунд
             (так ловится пауза под музыкой или гудящим проектором);
           отрезки, между которыми меньше MERGE_GAP секунд, склеиваются.
           У каждого — motion: сколько раз за минуту меняется кадр (ffmpeg
           scene). Меняется — на доске пишут: такую паузу лучше ускорить.
Окно монтажа само фильтрует кандидатов своими настройками, поэтому здесь
пороги мягкие: лишнее отрежет преподаватель, а пропущенное не вернуть.
"""
import array, json, math, re, subprocess, sys, wave
from pathlib import Path

from media_tools import FFMPEG

try:
    import numpy as np  # есть в окружении Whisper; без него — медленнее, но так же
except ImportError:
    np = None

STEP = 0.5               # шаг громкости, с
FRAME = 0.1              # окно RMS для поиска тишины, с
QUIET_DB = -30.0         # абсолютный порог тишины
QUIET_ABOVE_FLOOR = 8.0  # или «не громче фона + 8 дБ»
QUIET_MIN = 5.0          # короче — не пауза
SPEECHLESS_MIN = 8.0     # столько без единой реплики — тоже пауза
MERGE_GAP = 1.5          # паузы с таким зазором — одна пауза
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


def runs(flags, min_len):
    """Отрезки [начало, конец] в секундах, где flags истинны не короче min_len."""
    out, start = [], None
    for i, on in enumerate(list(flags) + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if (i - start) * FRAME >= min_len:
                out.append([start * FRAME, i * FRAME])
            start = None
    return out


def merge(spans, gap):
    out = []
    for a, b in sorted(spans):
        if out and a - out[-1][1] <= gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def speechless(folder, total):
    """Промежутки без реплик Whisper — из segments.json, если он уже есть."""
    path = folder / 'segments.json'
    if not path.exists():
        return []
    segments = sorted(json.loads(path.read_text()), key=lambda s: s['start'])
    gaps, last = [], 0.0
    for s in segments + [{'start': total, 'end': total}]:
        if s['start'] - last >= SPEECHLESS_MIN:
            gaps.append([last, s['start']])
        last = max(last, s['end'])
    return gaps


def motion(source, start, end):
    """Сколько раз в минуту меняется кадр на отрезке. None — видео нет."""
    if not source or not Path(source).exists():
        return None
    try:
        out = subprocess.run([FFMPEG, '-nostdin', '-v', 'info', '-ss', f'{start:.2f}', '-t', f'{end - start:.2f}', '-i', str(source),
                              '-map', '0:v:0?', '-vf', "fps=2,scale=160:-1,select='gt(scene,0.03)',showinfo", '-f', 'null', '-'],
                             capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.SubprocessError):
        return None
    if 'Video:' not in out.stderr:
        return None
    changes = len(re.findall(r'Parsed_showinfo.*pts_time', out.stderr))
    return round(changes / max(1e-6, (end - start) / 60), 2)


def main(folder, source=None):
    folder = Path(folder)
    rms, t = [], 0.0
    for chunk in sorted(folder.glob('audio-*.wav')):
        for value, length in frames(chunk, FRAME):
            rms.append(db(value))
            t += length
    per_step = int(round(STEP / FRAME))
    levels = [round(sum(rms[i:i + per_step]) / len(rms[i:i + per_step]), 1) for i in range(0, len(rms), per_step)]
    floor = round(sorted(rms)[int(len(rms) * 0.1)] if rms else FLOOR, 1)
    threshold = max(QUIET_DB, floor + QUIET_ABOVE_FLOOR)
    spans = merge(runs((v <= threshold for v in rms), QUIET_MIN) + speechless(folder, t), MERGE_GAP)
    seg_path = folder / 'segments.json'
    segments = json.loads(seg_path.read_text()) if seg_path.exists() else None
    quiet = []
    for a, b in spans:
        part = rms[int(a / FRAME):max(int(a / FRAME) + 1, int(b / FRAME))]
        span = {'id': f'q{len(quiet)}', 'start': round(a, 2), 'end': round(min(b, t), 2), 'level': round(sum(part) / len(part), 1)}
        # speech: false — Whisper внутри не нашёл ни реплики: это пауза при любой громкости.
        if segments is not None:
            span['speech'] = any(x['end'] > a + 0.3 and x['start'] < b - 0.3 for x in segments)
        m = motion(source, a, b)
        if m is not None:
            span['motion'] = m
        quiet.append(span)
    (folder / 'montage.json').write_text(json.dumps({'duration': round(t, 2), 'step': STEP, 'levels': levels, 'floor': floor, 'quiet': quiet}))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
