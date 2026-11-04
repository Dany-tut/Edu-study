import json, math, sys, wave
from pathlib import Path
import mlx_whisper
import numpy as np
from progress import record

folder=Path(sys.argv[1])
model=next(Path.home().glob('.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo/snapshots/*/weights.safetensors')).parent
offset=0
segments=[]
chunks=sorted(folder.glob('audio-*.wav'))
total=0
for chunk in chunks:
    with wave.open(str(chunk)) as f: total+=f.getnframes()/f.getframerate()
record(folder,'Распознаём речь',0,total,'seconds')
# Whisper на тишине «слышит» шаблонные фразы («Thank you.», «Продолжение
# следует…») каждые 30 секунд. Реплика над беззвучным звуком — выдумка:
# отбрасываем, иначе она и в расшифровке, и мешает искать паузы.
SILENT_DB=-55.0
HALLUCINATIONS={'thank you.','thank you','thanks for watching!','продолжение следует...','спасибо за внимание.','субтитры сделал dimatorzok','редактор субтитров а.семкин корректор а.егорова'}
def level(samples,start,end,rate):
    part=samples[int(start*rate):max(int(start*rate)+1,int(end*rate))]
    rms=float(np.sqrt(np.mean(part.astype(np.float64)**2))) if len(part) else 0.0
    return 20*math.log10(rms/32768) if rms>0 else -90.0
for chunk in chunks:
    with wave.open(str(chunk)) as f:
        rate=f.getframerate(); length=f.getnframes()/rate
        samples=np.frombuffer(f.readframes(f.getnframes()),dtype=np.int16)
    result=mlx_whisper.transcribe(str(chunk),path_or_hf_repo=str(model),verbose=None,condition_on_previous_text=False)
    for s in result['segments']:
        text=s['text'].strip()
        start=max(0,s['start'])
        end=min(length,s['end'])
        db=level(samples,start,end,rate)
        if db<SILENT_DB or (text.lower() in HALLUCINATIONS and db<-45): continue
        if (s.get('no_speech_prob',0)<0.8 and end>start and any(c.isalnum() for c in text)):
            segments.append(dict(start=round(offset+start,3),end=round(offset+end,3),text=text))
    offset+=length
    record(folder,'Распознаём речь',offset,total,'seconds')
(folder/'segments.json').write_text(json.dumps(segments,ensure_ascii=False))
