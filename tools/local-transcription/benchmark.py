"""Замер скорости и WER расшифровки — ДО и ПОСЛЕ, на своих уроках.

Скорость WER на синтетике или на моём железе не показателен: прогоните это на
3–5 своих записях (RU и RU+EN). Ссылочный текст (эталон для WER) — необязателен:
без него считается только скорость (× реального времени).

  python benchmark.py запись1.mp4 запись2.m4a ...
      --engines whisper,gigaam     какие движки сравнить (по умолчанию оба)
      --seg fixed,vad              какую резку сравнить (по умолчанию обе)
      --words                      включить пословные таймкоды
      --ref ПАПКА                  где искать эталоны <имя>.txt (по умолчанию рядом)

Эталон для файла lesson.mp4 — lesson.txt рядом или в --ref. WER считается по
нормализованному тексту (нижний регистр, без пунктуации) — так GigaAM (без
пунктуации) и whisper сравниваются честно.

ВАЖНО: это dev-инструмент. Он не меняет уроки и не ходит в Искру — только
гоняет локальные модели и печатает таблицу.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from media_tools import FFMPEG, duration  # noqa: E402
import vad_segment  # noqa: E402
import asr_config  # noqa: E402

WHITELIST = ['-protocol_whitelist', 'file,pipe', '-format_whitelist',
             'mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac']


def decode_full(source, dest):
    subprocess.run([FFMPEG, '-nostdin', '-v', 'error', *WHITELIST, '-i', str(source),
                    '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', str(dest)], check=True)


def segment_fixed(source, folder):
    subprocess.run([FFMPEG, '-nostdin', '-v', 'error', *WHITELIST, '-i', str(source), '-map', '0:a:0',
                    '-vn', '-ac', '1', '-ar', '16000', '-f', 'segment', '-segment_time', '90',
                    '-reset_timestamps', '1', str(folder / 'audio-%05d.wav')], check=True)


def segment_vad(source, folder):
    full = folder / '.full.wav'
    decode_full(source, full)
    with wave.open(str(full)) as f:
        dur = f.getnframes() / f.getframerate()
    speech = vad_segment.speech_segments(full, asr_config.silero_path(), max_speech=90.0)
    if speech is None:
        full.unlink(missing_ok=True)
        raise RuntimeError('Silero VAD недоступен — поставьте модель silero_vad.onnx в asr-models.')
    cuts = vad_segment.plan_cuts(speech, dur, chunk_max=90.0, min_chunk=20.0)
    vad_segment.slice_wav(full, cuts, folder)
    full.unlink(missing_ok=True)


def run_recognize(folder, engine, words):
    env = dict(os.environ, ISKRA_ASR_ENGINE=engine, HF_HUB_OFFLINE='1', TOKENIZERS_PARALLELISM='false')
    env['ISKRA_WORD_TIMESTAMPS'] = '1' if words else ''
    env.pop('ISKRA_VAD_SEGMENT', None)  # резку делаем сами, не в recognize
    start = time.monotonic()
    subprocess.run([sys.executable, str(ROOT / 'recognize.py'), str(folder)], check=True, env=env)
    wall = time.monotonic() - start
    segments = json.loads((folder / 'segments.json').read_text())
    return wall, segments


def normalize(text):
    return ' '.join(''.join(c.lower() if (c.isalnum() or c.isspace()) else ' ' for c in text).split())


def wer(reference, hypothesis):
    ref, hyp = normalize(reference).split(), normalize(hypothesis).split()
    if not ref:
        return None
    # Левенштейн по словам.
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1] / len(ref)


def reference_for(source, ref_dir):
    for base in ([ref_dir] if ref_dir else []) + [Path(source).parent]:
        candidate = Path(base) / (Path(source).stem + '.txt')
        if candidate.is_file():
            return candidate.read_text()
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('files', nargs='+')
    parser.add_argument('--engines', default='whisper,gigaam')
    parser.add_argument('--seg', default='fixed,vad')
    parser.add_argument('--words', action='store_true')
    parser.add_argument('--ref', default=None)
    args = parser.parse_args()
    engines = [e.strip() for e in args.engines.split(',') if e.strip()]
    segs = [s.strip() for s in args.seg.split(',') if s.strip()]
    rows = []
    for source in args.files:
        source = Path(source)
        dur = duration(source, WHITELIST)
        ref = reference_for(source, args.ref)
        for seg in segs:
            with tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                try:
                    (segment_vad if seg == 'vad' else segment_fixed)(source, folder)
                except Exception as error:  # noqa: BLE001
                    print(f'{source.name} [{seg}]: нарезка не удалась: {error}', flush=True)
                    continue
                chunks = len(list(folder.glob('audio-*.wav')))
                for engine in engines:
                    try:
                        wall, segments = run_recognize(folder, engine, args.words)
                    except subprocess.CalledProcessError as error:
                        print(f'{source.name} [{seg}/{engine}]: {error}', flush=True)
                        continue
                    hypothesis = ' '.join(s['text'] for s in segments)
                    score = wer(ref, hypothesis) if ref else None
                    rows.append((source.name, round(dur, 1), seg, engine, chunks, round(wall, 1),
                                 round(dur / wall, 2) if wall else 0, None if score is None else round(score * 100, 1)))
    print('\n| файл | длит., с | резка | движок | кусков | время, с | ×реал.вр. | WER, % |')
    print('|---|---|---|---|---|---|---|---|')
    for r in rows:
        print('| ' + ' | '.join('—' if v is None else str(v) for v in r) + ' |')


if __name__ == '__main__':
    main()
