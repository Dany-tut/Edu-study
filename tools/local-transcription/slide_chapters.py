"""Independent chapters from visible slide headings; no speech/model inference."""
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import unicodedata
from difflib import SequenceMatcher
from functools import lru_cache

from media_tools import FFMPEG, duration as media_duration
from progress import record
from slide_frames import TitleCache, frames

REGIONS = {
    'top-left': (0, 0, .65, .24), 'top-right': (.35, 0, .65, .24),
    'bottom-left': (0, .76, .65, .24), 'bottom-right': (.35, .76, .65, .24),
    'top': (0, 0, 1, .24), 'bottom': (0, .76, 1, .24),
}
SAFE = ['-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac']
STEP = 2


def ensure_runtime(folder):
    """Install OCR separately: never change the running speech environment.

    Runs inside the supervised job group, including pip/model downloads, so
    cancellation terminates setup too. Incomplete setup is retried next time.
    """
    home = Path(os.environ.get('ISKRA_TRANSCRIPTION_HOME', str(Path.home() / 'Library/Application Support/Iskra/transcription')))
    runtime = home / 'slide-runtime-1'
    python = runtime / 'bin/python'
    ready = runtime / '.ready'
    if Path(sys.prefix).resolve() == runtime.resolve(): return
    record(folder, 'Читаем слайды', 0, 0, 'frames', 'Подготавливаем распознавание слайдов')
    if not ready.exists():
        subprocess.run([sys.executable, '-m', 'venv', str(runtime)], check=True, timeout=90)
        subprocess.run([str(python), '-m', 'pip', 'install', '--only-binary=:all:',
                        '--timeout', '20', '--retries', '2', '--disable-pip-version-check',
                        'rapidocr==3.10.0', 'onnxruntime==1.32.0'], check=True, timeout=600)
        ready.write_text('rapidocr3.10.0 onnxruntime1.32.0')
    os.execv(str(python), [str(python), str(Path(__file__).resolve()), *sys.argv[1:]])


def ocr_engine():
    from rapidocr import RapidOCR, LangRec, OCRVersion, ModelType
    return RapidOCR(params={
        'Rec.lang_type': LangRec.CYRILLIC, 'Rec.ocr_version': OCRVersion.PPOCRV5,
        'Rec.model_type': ModelType.MOBILE, 'Det.ocr_version': OCRVersion.PPOCRV5,
        'Det.model_type': ModelType.MOBILE, 'Global.use_cls': False,
        'EngineConfig.onnxruntime.intra_op_num_threads': 2,
        'EngineConfig.onnxruntime.inter_op_num_threads': 1,
    })


def recognize(engine, image):
    result = engine(image)
    if result.boxes is None or not result.txts: return ''
    height, width = result.img.shape[:2]
    lines = []
    for box, text, score in zip(result.boxes, result.txts, result.scores):
        if score < .5: continue
        x, y = box.min(axis=0); right, bottom = box.max(axis=0)
        lines.append(dict(text=text, x=float(x/width), y=float(y/height),
                          width=float((right-x)/width), height=float((bottom-y)/height)))
    # Detection can split a heading (and bullet prefix) into individual words.
    rows = []
    for line in sorted(lines, key=lambda line: line['y']):
        row = next((r for r in rows if abs((line['y']+line['height']/2)-(r[0]['y']+r[0]['height']/2)) < min(line['height'],r[0]['height'])*.5), None)
        if row is None: rows.append([line])
        else: row.append(line)
    merged = []
    for row in rows:
        row.sort(key=lambda line: line['x'])
        merged.append(dict(text=' '.join(line['text'] for line in row), x=min(line['x'] for line in row),
                           y=min(line['y'] for line in row), height=max(line['height'] for line in row)))
    return heading(merged)


def normalize(text):
    return ' '.join(re.findall(r'\w+', unicodedata.normalize('NFKC', text).casefold().replace('ё', 'е')))


def same(a, b):
    a, b = normalize(a), normalize(b)
    if a == b: return True
    # Do not merge chapter2 with chapter3 or short terms such as DNA/RNA.
    return min(len(a), len(b)) >= 8 and re.findall(r'\d+', a) == re.findall(r'\d+', b) and SequenceMatcher(None, a, b).ratio() >= .92


def meaningful(text):
    text = text.strip()
    if not 3 <= len(text) <= 110 or len([c for c in text if c.isalpha()]) < 3: return False
    if re.match(r'^\d+[.)]\s', text): return False  # bullet-point body text
    if re.search(r'\b(егэ|огэ)\b', text, re.I) and len(text.split()) <= 5: return False
    if re.search(r'https?://|www\.|@|©|copyright', text, re.I): return False
    return True


def heading(lines):
    candidates = [line for line in lines if isinstance(line, dict) and meaningful(str(line.get('text', '')))]
    if not candidates: return ''
    # Large text near the beginning of the selected title band wins. Body lists,
    # page numbers and course footers are excluded before ranking.
    best = max(candidates, key=lambda line: float(line.get('height', 0)) / (.12 + max(0, float(line.get('y', 0)))))
    text = best['text'].strip()
    continuation = [line for line in candidates if line is not best
        and abs(float(line.get('x', 0))-float(best.get('x', 0))) < .08
        and .8 <= float(line.get('height', 0))/max(.001, float(best.get('height', 0))) <= 1.2
        and 0 < float(line.get('y', 0))-float(best.get('y', 0)) < float(best.get('height', 0))*1.8]
    if continuation:
        text += ' ' + min(continuation, key=lambda line: line.get('y', 0))['text'].strip()
    return text if len(text) <= 140 else best['text'].strip()


def scan(read, duration, report=lambda *_: None):
    """Two observations reject transient overlays. Deduplicate across the video.

    Coarse sampling2s, binary refinement to0.5s around first appearance.
    Brief headings shorter than the sample interval may be missed.
    """
    times = list(range(0, max(1, math.ceil(duration)), STEP))
    chapters, pending, first_seen = [], None, []
    for index, at in enumerate(times):
        title = read(at)
        if title and not any(same(title, text) for _, text in first_seen): first_seen.append((at, title))
        if title and pending and same(title, pending[1]):
            if not any(same(title, row['title']) for row in chapters):
                first = next(t for t, text in first_seen if same(title, text))
                lo, hi = max(0, first-STEP), first
                while hi-lo > .5:
                    middle = (lo+hi)/2
                    if same(read(middle), title): hi = middle
                    else: lo = middle
                chapters.append({'start': round(hi, 2), 'title': title})
            # Keep the first observation of a continuous slide.
        else:
            pending = (at, title) if title else None
        report(index+1, len(times))
    return sorted(chapters, key=lambda row: row['start'])


def process_video(source, duration, region, engine, report=lambda *_: None):
    x, y, w, h = REGIONS[region]
    crop = f'crop=iw*{w}:ih*{h}:iw*{x}:ih*{y},scale=min(1800\\,iw*2):-2'
    cache = TitleCache(lambda image: recognize(engine, image))
    # Round timestamps upwards: a frame occurring after t must not be assigned
    # to sample t. Refinement below still seeks directly around a new heading.
    command = [FFMPEG, '-nostdin', '-v', 'error', '-threads', '2', '-filter_threads', '1',
        *SAFE, '-i', str(source), '-an', '-sn', '-vf',
        f'fps=1/{STEP}:start_time=0:round=up:eof_action=pass,{crop}',
        '-f', 'image2pipe', '-c:v', 'ppm', '-']
    sampled = 0
    with frames(command) as stream:
        @lru_cache(maxsize=16)
        def read(at):
            nonlocal sampled
            # scan visits coarse samples monotonically, with occasional earlier
            # bisection probes. Never move/restart the sequential decoder for those.
            if at == sampled*STEP:
                try: image = next(stream)
                except StopIteration as error: raise ValueError('Видео закончилось раньше ожидаемого. Проверьте запись.') from error
                sampled += 1
            else:
                # Keep pre-seek frames for fps to choose the frame displayed at
                # this time. Accurate seek would jump to a future frame in VFR.
                import cv2
                import numpy as np
                out = subprocess.run([FFMPEG, '-nostdin', '-v', 'error', '-threads', '2',
                    '-filter_threads', '1', *SAFE, '-ss', str(at), '-noaccurate_seek', '-i', str(source),
                    '-frames:v', '1', '-vf', f'fps=2:start_time=0:round=up:eof_action=pass,{crop}', '-f', 'image2pipe', '-c:v', 'png', '-'],
                    capture_output=True, timeout=30, check=True)
                image = cv2.imdecode(np.frombuffer(out.stdout, dtype=np.uint8), cv2.IMREAD_COLOR)
                if image is None: raise ValueError('Не удалось прочитать кадр видео.')
            return cache.read(image, at)
        result = scan(read, duration, report)
    return result, dict(samples=sampled, ocr=cache.calls, reused=cache.hits)


def main(source, folder, region):
    folder, source = Path(folder), Path(source)
    if region not in REGIONS: raise ValueError('Выберите расположение заголовка на слайде.')
    try:
        ensure_runtime(folder)
    except (OSError, subprocess.SubprocessError) as error:
        raise ValueError('Не удалось подготовить распознавание слайдов. Проверьте интернет и свободное место на Mac, затем повторите.') from error
    record(folder, 'Читаем слайды', 0, 0, 'frames', 'Загружаем распознавание слайдов')
    try:
        engine = ocr_engine()
    except Exception as error:
        raise ValueError('Не удалось подготовить распознавание слайдов. Проверьте интернет и свободное место на Mac, затем повторите.') from error
    duration = media_duration(source, SAFE)
    if duration <= 0: raise ValueError('Не удалось определить длительность видео.')
    chapters, metrics = process_video(source, duration, region, engine,
        lambda done, total: record(folder, 'Читаем слайды', done, total, 'frames', 'Ищем заголовки слайдов'))
    print(f'Slide OCR metrics: {metrics}', flush=True)
    if not chapters:
        raise ValueError('Заголовки не найдены. Выберите другую область слайда и повторите. Текущие главы не изменены.')
    (folder/'chapters.json').write_text(json.dumps(chapters, ensure_ascii=False))
    print(f'Slide chapters {folder.name}: {len(chapters)} unique headings, duration={duration:.1f}s, region={region}', flush=True)


if __name__ == '__main__':
    try: main(*sys.argv[1:])
    except Exception as error:
        # Safe, explicit user-facing failure; the service retains the old lesson.
        message = str(error) if isinstance(error, ValueError) else 'Не удалось прочитать заголовки слайдов. Проверьте запись и повторите.'
        (Path(sys.argv[2])/'slide-error.txt').write_text(message)
        raise
