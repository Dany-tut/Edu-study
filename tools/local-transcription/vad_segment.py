"""Резка аудио на куски по паузам (Silero VAD через sherpa-onnx). За флагом.

Зачем. Раньше ffmpeg резал ровно по 90 с (`-segment_time 90`) — граница могла
попасть на середину слова, и это слово рвалось между кусками. Здесь границы
кусков ставятся в тишину между репликами, рядом с целевой длиной (~90 с),
поэтому слова на стыках целы.

Важно: инвариант остального конвейера — куски audio-*.wav идут подряд и вместе
покрывают всю запись без пропусков и без перекрытий (recognize.py копит offset,
silence.py рисует волну, diarize.py склеивает дорожку). Поэтому режем БЕЗ
перекрытия и без выбрасывания тишины: просто переносим границы в тихие места.
Перекрытие здесь не нужно — раз граница в тишине, рвать на стыке уже нечего.

Нет sherpa-onnx или модели silero — зовущий просто откатывается на прежнюю
резку по 90 с (graceful fallback), задание не падает.
"""
import wave
from pathlib import Path

WINDOW = 512  # Silero ждёт окна по 512 отсчётов при 16 кГц


def plan_cuts(speech, total, chunk_max=90.0, min_chunk=20.0):
    """Точки реза (внутренние границы), с. Куски ≤ chunk_max, границы — в паузах.

    speech — [(start, end), ...] речевые отрезки от VAD, в секундах.
    Возвращает отсортированный список времён реза в (0, total); из них получаются
    подряд идущие куски [0, c0], [c0, c1], ..., [cn, total].
    """
    if total <= chunk_max:
        return []
    # Кандидаты в границы — середины пауз между соседними речевыми отрезками.
    gaps = []
    ordered = sorted(speech)
    for (a_start, a_end), (b_start, b_end) in zip(ordered, ordered[1:]):
        if b_start > a_end:
            gaps.append((a_end + b_start) / 2.0)
    cuts = []
    start = 0.0
    while total - start > chunk_max:
        target = start + chunk_max
        floor = start + min_chunk
        # Самая поздняя тихая граница не дальше цели и не ближе min_chunk.
        candidate = None
        for mid in gaps:
            if floor <= mid <= target:
                candidate = mid
            elif mid > target:
                break
        cut = candidate if candidate is not None else target  # нет паузы — режем жёстко
        cuts.append(round(cut, 3))
        start = cut
    return cuts


def speech_segments(wav_path, model_path, threshold=0.5, min_silence=0.25,
                    min_speech=0.2, max_speech=90.0):
    """Речевые отрезки [(start, end), ...] через Silero VAD. None — VAD недоступен."""
    try:
        import numpy as np
        import sherpa_onnx
    except ImportError:
        return None
    if not Path(model_path).is_file():
        return None
    try:
        with wave.open(str(wav_path)) as f:
            rate = f.getframerate()
            samples = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        config = sherpa_onnx.VadModelConfig()
        config.silero_vad.model = str(model_path)
        config.silero_vad.threshold = threshold
        config.silero_vad.min_silence_duration = min_silence
        config.silero_vad.min_speech_duration = min_speech
        config.silero_vad.max_speech_duration = max_speech
        config.sample_rate = rate
        vad = sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=60)
        segments = []
        for i in range(0, len(samples) - WINDOW, WINDOW):
            vad.accept_waveform(samples[i:i + WINDOW])
            while not vad.empty():
                seg = vad.front
                segments.append((seg.start / rate, (seg.start + len(seg.samples)) / rate))
                vad.pop()
        vad.flush()
        while not vad.empty():
            seg = vad.front
            segments.append((seg.start / rate, (seg.start + len(seg.samples)) / rate))
            vad.pop()
        return segments
    except Exception as error:  # noqa: BLE001 — любой сбой VAD = откат на 90 с
        print(f'VAD недоступен, режем по 90 с: {type(error).__name__}: {error}', flush=True)
        return None


def slice_wav(src_wav, cuts, out_folder, prefix='audio-'):
    """Нарезать один wav по точкам реза в out_folder/audio-00000.wav ... подряд."""
    out_folder = Path(out_folder)
    with wave.open(str(src_wav)) as f:
        params = f.getparams()
        rate = f.getframerate()
        width = f.getsampwidth()
        channels = f.getnchannels()
        frames = f.getnframes()
        bounds = [0] + [min(frames, int(round(c * rate))) for c in cuts] + [frames]
        written = []
        for idx in range(len(bounds) - 1):
            a, b = bounds[idx], bounds[idx + 1]
            if b <= a:
                continue
            f.setpos(a)
            data = f.readframes(b - a)
            path = out_folder / f'{prefix}{idx:05d}.wav'
            with wave.open(str(path), 'wb') as out:
                out.setnchannels(channels)
                out.setsampwidth(width)
                out.setframerate(rate)
                out.writeframes(data)
            written.append(path)
    return written
