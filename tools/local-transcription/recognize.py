import json, sys, wave
from pathlib import Path
import mlx_whisper
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
for chunk in chunks:
    with wave.open(str(chunk)) as f: length=f.getnframes()/f.getframerate()
    result=mlx_whisper.transcribe(str(chunk),path_or_hf_repo=str(model),verbose=None,condition_on_previous_text=False)
    for s in result['segments']:
        text=s['text'].strip()
        start=max(0,s['start'])
        end=min(length,s['end'])
        if (s.get('no_speech_prob',0)<0.8 and end>start and any(c.isalnum() for c in text)):
            segments.append(dict(start=round(offset+start,3),end=round(offset+end,3),text=text))
    offset+=length
    record(folder,'Распознаём речь',offset,total,'seconds')
(folder/'segments.json').write_text(json.dumps(segments,ensure_ascii=False))
