"""Independent chapters from visible slide headings; no speech/model inference."""
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import unicodedata
from difflib import SequenceMatcher
from functools import lru_cache

from media_tools import FFMPEG, duration as media_duration
from progress import record
from slide_frames import TitleCache, frames, ppm_bytes, timed_frames
import frame_ocr

REGIONS = {
    'top-left': (0, 0, .65, .24), 'top-right': (.35, 0, .65, .24),
    'bottom-left': (0, .76, .65, .24), 'bottom-right': (.35, .76, .65, .24),
    'top': (0, 0, 1, .24), 'bottom': (0, .76, 1, .24),
}
SAFE = ['-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac']
STEP = 2
# Keyframe scan: when the title band is the same on two keyframes up to this
# far apart, the slide in between is not read densely. Typical recorders put a
# keyframe every 2–10 s. A different slide shown for less than this between two
# showings of the same slide can be missed; longer gaps are read densely, and a
# video whose keyframes are mostly further apart gets one sequential pass.
MAX_KEY_GAP = 20


def ensure_runtime(folder):
    """Fallback only (app without the Vision helper, ≤ 1.0.8): install RapidOCR
    separately; never change the running speech environment.

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
        # Reuse inference buffers across frames instead of allocating them for
        # every detection/recognition batch. Pixels, models and batching stay intact.
        'EngineConfig.onnxruntime.enable_cpu_mem_arena': True,
        'EngineConfig.onnxruntime.inter_op_num_threads': 1,
    })


def rapid_rows(engine, image):
    """RapidOCR rows from an RGB frame (RapidOCR expects BGR arrays)."""
    result = engine(image[..., ::-1].copy())
    if result.boxes is None or not result.txts: return []
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
    return merged


def normalize(text):
    return ' '.join(re.findall(r'\w+', unicodedata.normalize('NFKC', text).casefold().replace('ё', 'е')))


def same(a, b):
    a, b = normalize(a), normalize(b)
    if a == b: return True
    # Do not merge chapter2 with chapter3 or short terms such as DNA/RNA.
    return min(len(a), len(b)) >= 8 and re.findall(r'\d+', a) == re.findall(r'\d+', b) and SequenceMatcher(None, a, b).ratio() >= .92


def suspicious(text):
    """Prefer a legible heading over toolbar fragments (ranking only)."""
    if re.search(r'[·…]|\.{2,}', text): return True
    words = re.findall(r'[^\W\d_]+', text, re.UNICODE)
    if any(re.search('[а-яё]', w, re.I) and re.search('[a-z]', w, re.I) for w in words): return True
    if len(words) > 1 and all(re.fullmatch('[a-z]{1,2}|[IVX]+', w) for w in words): return True
    prose = [w for w in words if w.upper() not in ABBREVIATIONS and not re.fullmatch('[IVXLCDM]+', w)]
    return bool(prose) and not any(re.search('[аеёиоуыэюяaeiouy]', w, re.I) for w in prose)


ABBREVIATIONS = {'ДНК', 'РНК', 'ЦНС', 'ПНС', 'ЖКТ', 'АТФ', 'DNA', 'RNA', 'ATP', 'PH', 'NA'}
# Screen recordings put the presentation app around the slide: menu tabs,
# Copilot/Zoom buttons, «2 of 31». Compared lowercase, word by word.
# STRONG — words of the app itself, never a slide heading on their own.
UI_STRONG = set("""
file home insert draw design transitions animations review help share copilot
notes arrange extensions add-ons addons designer mute unmute participants toolbar undo redo sorter
файл главная вставка рисование конструктор переходы слайд-шоу рецензирование справка заметки
примечания демонстрацию поделиться расположить дополнения правка
""".split())
# WEAK — also ordinary words («Reading», «Запись реакции»); count only in bulk.
UI_WEAK = set("""
ask present presenting slide slides show view comments record recording format tools zoom chat reactions stop screen
sharing video audio leave meeting fit search outline normal reading english united states russian
new tab window edit options more layout theme background
слайд слайды показ вид демонстрация экрана комментарии запись формат инструменты начать
остановить чат участники звук
""".split())
COUNTER = re.compile(r'\b(?:slide|page|слайд|стр|страница)?\.?\s*\d+\s*(?:of|из|/)\s*\d+\b', re.I)


def ui_chrome(text):
    """Toolbar, tab strip or «N of M» counter of the recording app, not the slide."""
    if COUNTER.search(text): return True
    words = [w.casefold() for w in re.findall(r'[^\W\d_][\w-]*', text, re.UNICODE)]
    if not words: return False
    strong = sum(w in UI_STRONG for w in words)
    ui = strong + sum(w in UI_WEAK for w in words)
    # «Slide Show», «Ask Copilot»: several UI words and nothing else.
    return (strong and ui >= len(words)*.5) or (ui >= 3 and ui >= len(words)*.75) or (len(words) >= 2 and ui == len(words))


def real_word(word):
    """A word a person would write on a slide, not an OCR shard."""
    if word.upper() in ABBREVIATIONS: return True
    if re.fullmatch('[А-ЯЁ]{2,5}', word): return True  # АТФ, ЕГЭ-style abbreviations
    if re.search('[а-яё]', word, re.I) and re.search('[a-z]', word, re.I): return False
    # Case flips inside a word («KneTorue», «eAMHMua») are Cyrillic read as Latin.
    if re.search('[a-zа-яё][A-ZА-ЯЁ]', word) and not re.fullmatch('[a-z][A-Z][a-z]+', word): return False
    vowel = re.search('[аеёиоуыэюяaeiouy]', word, re.I)
    if re.search('[а-яё]', word, re.I): return bool(vowel) and len(word) >= 2
    return bool(vowel) and len(word) >= 3


ELEMENTS = set("""H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge
As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho
Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No
Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og pH""".split())


def has_real_words(text):
    words = re.findall(r'[^\W\d_]+', text, re.UNICODE)
    if len(words) == 1 and words[0] in ELEMENTS: return True  # Na, pH — chemistry slides
    return any(real_word(w) and w.casefold() not in UI_STRONG for w in words)


def meaningful(text):
    text = text.strip()
    if not 2 <= len(text) <= 110 or len([c for c in text if c.isalpha()]) < 2: return False
    if re.match(r'^\d+[.)]\s', text): return False  # bullet-point body text
    if re.search(r'\b(егэ|огэ)\b', text, re.I) and len(text.split()) <= 5: return False
    if re.search(r'https?://|www\.|@|©|copyright', text, re.I): return False
    if re.match(r'[/\\|_~^<>]', text): return False  # frame-edge OCR shard («/Uy …»)
    if ui_chrome(text) or not has_real_words(text): return False
    return True


def heading(lines):
    candidates = [line for line in lines if isinstance(line, dict) and meaningful(str(line.get('text', '')))]
    if not candidates: return ''
    # Large text in the selected title band wins: size first, nearness to the
    # top second. Body lists, page numbers, footers and app chrome are already out.
    readable = [line for line in candidates if not suspicious(line['text'])]
    if not readable: return ''
    candidates = readable
    tallest = max(float(line.get('height', 0)) for line in candidates)
    if tallest > 0: candidates = [line for line in candidates if float(line.get('height', 0)) >= tallest*.6]
    best = max(candidates, key=lambda line: float(line.get('height', 0)) / (1 + max(0, float(line.get('y', 0)))))
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

    `duration` — seconds (uniform samples every STEP) or a sorted list of sample
    times. Refinement bisects to 0.5 s between the previous sample and the first
    appearance. Brief headings seen only once may be missed.
    """
    times = list(range(0, max(1, math.ceil(duration)), STEP)) if isinstance(duration, (int, float)) else list(duration)
    chapters, pending, first_seen = [], None, []
    previous = {}
    for index, at in enumerate(times):
        previous[at] = times[index-1] if index else max(0, at-STEP)
        title = read(at)
        if title and not any(same(title, text) for _, text in first_seen): first_seen.append((at, title))
        if title and pending and same(title, pending[1]):
            if not any(same(title, row['title']) for row in chapters):
                first = next(t for t, text in first_seen if same(title, text))
                lo, hi = min(previous.get(first, first-STEP), first), first
                lo = max(0, lo)
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


def keyframe_changes(samples, unchanged, gap=MAX_KEY_GAP):
    """Intervals between keyframes that need dense sampling: the title band
    changed, or keyframes are too far apart to vouch for what was in between."""
    spans = []
    for (a, sig_a), (b, sig_b) in zip(samples, samples[1:]):
        if b-a > gap or not unchanged(sig_a, sig_b):
            if spans and spans[-1][1] >= a: spans[-1] = (spans[-1][0], b)
            else: spans.append((a, b))
    return spans


def process_video(source, duration, region, engine, report=lambda *_: None, stage=lambda *_: None):
    """`engine(rgb_image) -> rows` with text and geometry (Vision or RapidOCR).

    1. Keyframes only (no full decode): the title band at each keyframe.
    2. Dense 2 s samples only where the band changed between keyframes.
    Videos with sparse keyframes fall back to one sequential 2 s pass.
    `stage(phase, done, total, unit)` reports honest progress per phase.
    """
    x, y, w, h = REGIONS[region]
    crop = f'crop=iw*{w}:ih*{h}:iw*{x}:ih*{y},scale=min(1800\\,iw*2):-2'
    started = time.monotonic()
    timing = {'readFrameSeconds': 0.0, 'ocrSeconds': 0.0, 'keyframeSeconds': 0.0}
    def timed_recognize(image):
        before = time.monotonic()
        result = heading(engine(image))
        timing['ocrSeconds'] += time.monotonic()-before
        return result
    cache = TitleCache(timed_recognize)
    decode = [FFMPEG, '-nostdin', '-threads', '2', '-filter_threads', '1', *SAFE]
    titles = {}

    def probe(at):
        # Keep pre-seek frames for fps to choose the frame displayed at
        # this time. Accurate seek would jump to a future frame in VFR.
        out = subprocess.run([*decode, '-v', 'error', '-ss', str(at), '-noaccurate_seek', '-i', str(source),
            '-frames:v', '1', '-vf', f'fps=2:start_time=0:round=up:eof_action=pass,{crop}', '-f', 'image2pipe', '-c:v', 'ppm', '-'],
            capture_output=True, timeout=30, check=True)
        return ppm_bytes(out.stdout)

    # 1. Keyframes, at most one per STEP (all-intra video stays cheap).
    # The phase is shown at once: the first frame also loads Vision's model.
    stage('Ищем смену слайдов', 0, duration, 'seconds')
    keys = []
    before = time.monotonic()
    command = [*decode, '-v', 'info', '-skip_frame', 'nokey', '-i', str(source), '-an', '-sn', '-fps_mode', 'passthrough',
        '-vf', f"select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,{STEP})',showinfo,{crop}",
        '-f', 'image2pipe', '-c:v', 'ppm', '-']
    try:
        with timed_frames(command) as stream:
            for at, image in stream:
                at = max(0.0, round(at, 3))
                keys.append((at, cache.signature(image)))
                titles[at] = cache.read(image, at)
                stage('Ищем смену слайдов', min(at, duration), duration, 'seconds')
    except frame_ocr.VisionFailed:
        raise  # the reader itself failed: not a reason to re-read the whole video
    except (ValueError, TimeoutError, subprocess.SubprocessError):
        keys = []
    timing['keyframeSeconds'] = time.monotonic()-before
    gaps = sorted(b-a for (a, _), (b, _) in zip(keys, keys[1:]))
    sparse = len(keys) < 2 or gaps[len(gaps)//2] > MAX_KEY_GAP
    if not sparse and keys[0][0] > MAX_KEY_GAP: keys.insert(0, (0.0, None))
    if not sparse and duration-keys[-1][0] > MAX_KEY_GAP: keys.append((duration, None))
    sampled = 0

    def dense(a, b):
        """Samples every STEP inside [a, b] from one short sequential decode."""
        nonlocal sampled
        out = []
        command = [*decode, '-v', 'error', '-ss', str(a), '-i', str(source), '-t', str(max(STEP, b-a)), '-an', '-sn',
            '-vf', f'fps=1/{STEP}:start_time=0:round=up:eof_action=pass,{crop}', '-f', 'image2pipe', '-c:v', 'ppm', '-']
        with frames(command) as stream:
            for index, image in enumerate(stream):
                at = round(a+index*STEP, 3)
                if at > b: break
                sampled += 1
                titles.setdefault(at, cache.read(image, at))
                out.append(at)
        return out

    before = time.monotonic()
    if sparse:
        # Sequential 2 s pass over the whole video (previous behaviour).
        titles.clear()
        stage('Ищем заголовки слайдов', 0, duration, 'seconds')
        command = [*decode, '-v', 'error', '-i', str(source), '-an', '-sn', '-vf',
            f'fps=1/{STEP}:start_time=0:round=up:eof_action=pass,{crop}', '-f', 'image2pipe', '-c:v', 'ppm', '-']
        with frames(command) as stream:
            for index, image in enumerate(stream):
                at = index*STEP
                if at >= max(1, math.ceil(duration)): break
                sampled += 1
                titles[at] = cache.read(image, at)
                stage('Ищем заголовки слайдов', min(at, duration), duration, 'seconds')
    else:
        unchanged = lambda a, b: a is not None and b is not None and TitleCache.unchanged(a, b)
        spans = keyframe_changes(keys, unchanged)
        for index, (a, b) in enumerate(spans):
            stage('Читаем слайды', index, len(spans), 'slides')
            dense(a, b)
        stage('Читаем слайды', len(spans), len(spans), 'slides')
    timing['readFrameSeconds'] = time.monotonic()-before

    @lru_cache(maxsize=64)
    def read(at):
        if at in titles: return titles[at]
        before = time.monotonic()
        image = probe(at)
        timing['readFrameSeconds'] += time.monotonic()-before
        return cache.read(image, at)
    times = sorted(t for t in titles if t <= duration)
    result = scan(read, times, report)
    return result, dict(keyframes=len(keys), samples=sampled, ocr=cache.calls, reused=cache.hits,
                        mode='sequential' if sparse else 'keyframes',
                        elapsedSeconds=time.monotonic()-started, **timing)


def main(source, folder, region):
    folder, source = Path(folder), Path(source)
    if region not in REGIONS: raise ValueError('Выберите расположение заголовка на слайде.')
    duration = media_duration(source, SAFE)
    if duration <= 0: raise ValueError('Не удалось определить длительность видео.')
    progress = lambda *_: None
    def stage(phase, done, total, unit):
        record(folder, 'Читаем слайды', done, total, unit, phase)
    vision = frame_ocr.helper()
    if vision:
        # Apple Vision from the .app: Cyrillic + Latin, nothing to install.
        with frame_ocr.VisionStream(vision) as engine:
            chapters, metrics = process_video(source, duration, region, engine, progress, stage)
            metrics['visionRestarts'] = engine.restarts
    else:
        try:
            ensure_runtime(folder)
        except (OSError, subprocess.SubprocessError) as error:
            raise ValueError('Не удалось подготовить распознавание слайдов. Проверьте интернет и свободное место на Mac, затем повторите.') from error
        record(folder, 'Читаем слайды', 0, 0, 'frames', 'Загружаем распознавание слайдов')
        try:
            rapid = ocr_engine()
        except Exception as error:
            raise ValueError('Не удалось подготовить распознавание слайдов. Проверьте интернет и свободное место на Mac, затем повторите.') from error
        chapters, metrics = process_video(source, duration, region, lambda image: rapid_rows(rapid, image), progress, stage)
    print(f"Slide OCR metrics ({'vision' if vision else 'rapidocr'}): {metrics}", flush=True)
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
