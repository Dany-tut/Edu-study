"""Кто говорит: разделение голосов на этом Mac (sherpa-onnx, без облака).

Читает audio-*.wav и segments.json (реплики Whisper), пишет voices.json:
  {"segments": [id голоса для каждой реплики], "voices": [{id, seconds,
   embedding (base64 float32), match?: {label, role, similarity}}]}
match — голос узнан среди запомненных на этом Mac (voices-memory.json).
Модели ждут в HOME/voice-models; нет моделей или пакета — шаг тихо
пропускается, и окно монтажа работает как раньше (все реплики — один голос).

Голосовые отпечатки — биометрия. Они не уходят с компьютера: хранятся здесь,
в папке модуля, и в урок не попадают (в урок — только имена).
"""
import base64, json, sys, wave
from pathlib import Path

MODELS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
MEMORY = Path(sys.argv[3]) if len(sys.argv) > 3 else None
SEGMENTATION = 'sherpa-onnx-pyannote-segmentation-3-0/model.onnx'
EMBEDDING = 'wespeaker_resnet34.onnx'
CLUSTER_THRESHOLD = 0.4   # подобрано на диалоге трёх голосов: 0.5 сливало два женских
MATCH_THRESHOLD = 0.8     # косинусная близость, с которой голос считаем узнанным
MATCH_MARGIN = 0.1        # и настолько ближе второго по сходству
SEGMENT_MIN = 0.8         # короче реплика — отпечаток ненадёжен, решает группировка


def load_audio(folder):
    import numpy as np
    parts = []
    for chunk in sorted(folder.glob('audio-*.wav')):
        with wave.open(str(chunk)) as f:
            parts.append(np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float32) / 32768)
    return np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)


def b64(vec):
    import numpy as np
    return base64.b64encode(np.asarray(vec, dtype=np.float32).tobytes()).decode()


def unb64(text):
    import numpy as np
    return np.frombuffer(base64.b64decode(text), dtype=np.float32)


def main(folder):
    folder = Path(folder)
    out = folder / 'voices.json'
    try:
        import numpy as np
        import sherpa_onnx
    except ImportError:
        return
    if not MODELS or not (MODELS / SEGMENTATION).exists() or not (MODELS / EMBEDDING).exists():
        return
    segments = json.loads((folder / 'segments.json').read_text())
    audio = load_audio(folder)
    if not len(audio) or not segments:
        return
    rate = 16000
    config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(MODELS / SEGMENTATION))),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(MODELS / EMBEDDING)),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=CLUSTER_THRESHOLD),
        min_duration_on=0.3, min_duration_off=0.5)
    turns = sherpa_onnx.OfflineSpeakerDiarization(config).process(audio).sort_by_start_time()

    # Реплике Whisper — голос, который звучит в ней дольше всех.
    def speaker_of(seg):
        best, length = None, 0.0
        for t in turns:
            overlap = min(seg['end'], t.end) - max(seg['start'], t.start)
            if overlap > length:
                best, length = t.speaker, overlap
        return best
    labels = [speaker_of(s) for s in segments]

    extractor = sherpa_onnx.SpeakerEmbeddingExtractor(sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(MODELS / EMBEDDING)))

    def embed(sample):
        stream = extractor.create_stream()
        stream.accept_waveform(rate, sample)
        stream.input_finished()
        emb = np.asarray(extractor.compute(stream), dtype=np.float32)
        return emb / max(1e-9, float(np.linalg.norm(emb)))

    memory = [(m['label'], m.get('role', 'student'), unb64(m['embedding'])) for m in
              (json.loads(MEMORY.read_text()) if MEMORY and MEMORY.exists() else [])]
    keys = [f'v{l + 1}' if l is not None else None for l in labels]
    # Знакомые голоса сверяем по каждой реплике: группировка на коротком
    # отрывке сливает похожие голоса, а сверка реплики с памятью — нет.
    if memory:
        for k, seg in enumerate(segments):
            if seg['end'] - seg['start'] < SEGMENT_MIN:
                continue
            emb = embed(audio[int(seg['start'] * rate):int(seg['end'] * rate)])
            sims = sorted(((float(np.dot(vec, emb)), n) for n, (_, _, vec) in enumerate(memory)), reverse=True)
            if sims[0][0] >= MATCH_THRESHOLD and (len(sims) < 2 or sims[0][0] - sims[1][0] >= MATCH_MARGIN):
                keys[k] = f'k{sims[0][1] + 1}'
    voices = []
    for key in sorted({k for k in keys if k is not None}):
        own = [s for s, k in zip(segments, keys) if k == key]
        sample = np.concatenate([audio[int(s['start'] * rate):int(s['end'] * rate)] for s in own])[:rate * 60]   # минуты хватает
        emb = embed(sample)
        voice = {'id': key, 'seconds': round(sum(s['end'] - s['start'] for s in own), 1), 'embedding': b64(emb)}
        if key.startswith('k'):
            label, role, vec = memory[int(key[1:]) - 1]
            voice['match'] = {'label': label, 'role': role, 'similarity': round(float(np.dot(vec, emb)), 3)}
        elif memory:
            best = max(range(len(memory)), key=lambda n: float(np.dot(memory[n][2], emb)))
            similarity = float(np.dot(memory[best][2], emb))
            if similarity >= MATCH_THRESHOLD:
                voice['match'] = {'label': memory[best][0], 'role': memory[best][1], 'similarity': round(similarity, 3)}
        voices.append(voice)
    out.write_text(json.dumps({'segments': keys, 'voices': voices}))

if __name__ == '__main__':
    main(sys.argv[1])
