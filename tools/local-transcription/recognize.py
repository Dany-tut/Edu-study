import json, math, re, sys, wave
from pathlib import Path
import mlx_whisper
import numpy as np
from progress import record
from model_cache import MODEL_SPECS, require_model

folder=Path(sys.argv[1])
model=require_model(*MODEL_SPECS[0])
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

# ── Словарь предмета (terms.json от страницы Искры) ─────────────────────────
# prompt — термины: Whisper читает их как «уже сказанное» и охотнее пишет их
# так же. Подсказка действует только на своё 30-секундное окно (продолжение по
# прошлому тексту выключено — от него Whisper зацикливается), поэтому звук
# режется на куски до 30 с по тихим местам и подсказка идёт с каждым куском.
# replace — известные ошибки «как распозналось → как правильно»; «*» в конце —
# любое окончание слова. Для дорожек участников словарь лежит уровнем выше.
def load_terms():
    for path in (folder/'terms.json', folder.parent/'terms.json'):
        try: data=json.loads(path.read_text())
        except (OSError, ValueError): continue
        prompt=[str(t)[:80] for t in data.get('prompt',[]) if str(t).strip()][:120]
        pairs=[(str(h)[:80],str(w)[:80]) for h,w in data.get('replace',[]) if str(h).strip() and str(w).strip()][:400]
        return prompt,pairs
    return [],[]
TERMS,PAIRS=load_terms()
PROMPT=(', '.join(TERMS)+'.') if TERMS else None

def compile_rules(pairs):
    rules=[]
    for heard,written in sorted(pairs,key=lambda p:-len(p[0])):
        star=heard.endswith('*')
        words=[re.escape(w) for w in heard.rstrip('*').split()]
        if not words: continue
        # Между словами — пробел или дефис: «из-под уровня» и «из под уровня».
        pattern=r'(?<![\w-])'+r'[\s\-]+'.join(words)+(r'(\w*)' if star else r'(?![\w-])')
        rules.append((re.compile(pattern,re.IGNORECASE),written.rstrip('*'),star))
    return rules
RULES=compile_rules(PAIRS)

def fix(text):
    for rx,written,star in RULES:
        def put(m):
            out=written+(m.group(1) if star else '')
            # Начало предложения — с большой буквы, но только кириллица:
            # латиница здесь обозначения (s-подуровень, pH), их регистр не трогаем.
            return out[0].upper()+out[1:] if m.group(0)[:1].isupper() and out[:1].islower() and 'а'<=out[:1]<='я' else out
        text=rx.sub(put,text)
    return text

def echoes_prompt(text):
    """Подсказка, повторённая Whisper на тишине, — выдумка, как «Thank you.»."""
    clean=text.strip(' .,').lower()
    return bool(PROMPT) and len(clean)>12 and clean in PROMPT.lower()

def level(samples,start,end,rate):
    part=samples[int(start*rate):max(int(start*rate)+1,int(end*rate))]
    rms=float(np.sqrt(np.mean(part.astype(np.float64)**2))) if len(part) else 0.0
    return 20*math.log10(rms/32768) if rms>0 else -90.0

PIECE_MAX=29.5   # окно Whisper — 30 с
PIECE_MIN=20.0   # режем не раньше: короткие куски теряют контекст
def pieces(samples,rate):
    """Границы кусков до 30 с — в самом тихом месте между 20-й и 29,5-й секундой."""
    n=len(samples); start=0; out=[]
    frame=int(rate*0.25)
    while start<n:
        if n-start<=PIECE_MAX*rate: out.append((start,n)); break
        lo=start+int(PIECE_MIN*rate); hi=start+int(PIECE_MAX*rate)-frame
        best=hi; quiet=None
        for at in range(lo,hi,frame):
            e=float(np.mean(np.abs(samples[at:at+frame].astype(np.float64))))
            if quiet is None or e<quiet: quiet=e; best=at+frame//2
        out.append((start,best)); start=best
    return out

if __name__=='__main__':
    for chunk in chunks:
        with wave.open(str(chunk)) as f:
            rate=f.getframerate(); length=f.getnframes()/rate
            samples=np.frombuffer(f.readframes(f.getnframes()),dtype=np.int16)
        # Без словаря — как раньше, кусок целиком: подсказывать нечего.
        for a,b in (pieces(samples,rate) if PROMPT else [(0,len(samples))]):
            if PROMPT:
                audio=samples[a:b].astype(np.float32)/32768.0
                result=mlx_whisper.transcribe(audio,path_or_hf_repo=str(model),verbose=None,condition_on_previous_text=False,initial_prompt=PROMPT)
            else:
                result=mlx_whisper.transcribe(str(chunk),path_or_hf_repo=str(model),verbose=None,condition_on_previous_text=False)
            shift=a/rate
            for s in result['segments']:
                text=s['text'].strip()
                start=max(0,shift+s['start'])
                end=min(length,shift+s['end'])
                db=level(samples,start,end,rate)
                if db<SILENT_DB or (text.lower() in HALLUCINATIONS and db<-45) or echoes_prompt(text): continue
                if (s.get('no_speech_prob',0)<0.8 and end>start and any(c.isalnum() for c in text)):
                    segments.append(dict(start=round(offset+start,3),end=round(offset+end,3),text=fix(text)))
        offset+=length
        record(folder,'Распознаём речь',offset,total,'seconds')
    (folder/'segments.json').write_text(json.dumps(segments,ensure_ascii=False))
