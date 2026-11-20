import json, math, re, sys, wave
from pathlib import Path
import mlx_whisper
import numpy as np
from progress import record
from model_cache import MODEL_SPECS, require_model
import asr_config
from asr_engine import GigaAM, segments_from_ctc, available as gigaam_available

folder=Path(sys.argv[1])
# Движок и флаги — из окружения (asr_config). По умолчанию: whisper, без
# пословных таймкодов — поведение модуля не меняется.
ENGINE=asr_config.engine()
WANT_WORDS=asr_config.word_timestamps_enabled()
# Веса whisper грузим лениво: при форсированном GigaAM они вообще не нужны.
_whisper=None
def whisper_model():
    global _whisper
    if _whisper is None: _whisper=require_model(*MODEL_SPECS[0])
    return _whisper
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

def whisper_transcribe(audio_or_path):
    kwargs=dict(path_or_hf_repo=str(whisper_model()),verbose=None,condition_on_previous_text=False)
    if WANT_WORDS: kwargs['word_timestamps']=True
    return kwargs,mlx_whisper.transcribe(audio_or_path,**kwargs)

def words_of(segment_words,base):
    """Пословные таймкоды whisper → аддитивное поле words, сдвинутое в запись."""
    out=[]
    for w in segment_words or []:
        word=str(w.get('word','')).strip()
        if not word: continue
        out.append({'word':word,'start':round(max(0,base+w.get('start',0)),3),'end':round(base+w.get('end',0),3)})
    return out

def whisper_chunk(chunk,samples,rate,length):
    """Реплики whisper из одного куска — как раньше, плюс words при флаге."""
    found=[]
    # Без словаря — как раньше, кусок целиком: подсказывать нечего.
    for a,b in (pieces(samples,rate) if PROMPT else [(0,len(samples))]):
        if PROMPT:
            audio=samples[a:b].astype(np.float32)/32768.0
            kwargs=dict(path_or_hf_repo=str(whisper_model()),verbose=None,condition_on_previous_text=False,initial_prompt=PROMPT)
            if WANT_WORDS: kwargs['word_timestamps']=True
            result=mlx_whisper.transcribe(audio,**kwargs)
        else:
            _,result=whisper_transcribe(str(chunk))
        shift=a/rate
        for s in result['segments']:
            text=s['text'].strip()
            start=max(0,shift+s['start'])
            end=min(length,shift+s['end'])
            db=level(samples,start,end,rate)
            if db<SILENT_DB or (text.lower() in HALLUCINATIONS and db<-45) or echoes_prompt(text): continue
            if (s.get('no_speech_prob',0)<0.8 and end>start and any(c.isalnum() for c in text)):
                seg=dict(start=round(offset+start,3),end=round(offset+end,3),text=fix(text))
                if WANT_WORDS:
                    words=words_of(s.get('words'),offset+shift)
                    if words: seg['words']=words
                found.append(seg)
    return found

def gigaam_chunk(giga,samples,rate,length):
    """Реплики GigaAM из одного куска: по паузам между символами, с фильтром тишины."""
    audio=samples.astype(np.float32)/32768.0
    _,timestamps,tokens=giga.recognize(audio,rate)
    found=[]
    for seg in segments_from_ctc(tokens,timestamps,shift=offset,want_words=WANT_WORDS):
        start=seg['start']-offset; end=min(length,seg['end']-offset)
        if level(samples,start,end,rate)<SILENT_DB: continue
        seg['text']=fix(seg['text'])
        if not WANT_WORDS: seg.pop('words',None)
        found.append(seg)
    return found

# ── Комбо (auto): русская речь — GigaAM, английские вставки — whisper ────────
# Движок не на весь урок, а на каждый ~30-секундный кусок. GigaAM (русская модель)
# на английских словах выдаёт латиницу («cell membrane» → «сelmemбrin»), а на
# чистом русском латиницы нет. Поэтому: гоним кусок через быстрый GigaAM; если в
# его выводе набралось латинских букв — в куске был английский, переснимаем этот
# кусок точным whisper. Так русские участки быстрые и с пунктуацией, а английские
# вставки корректны, всё в одной расшифровке. Проба языка по аудио (detect_language)
# тут не годится — она видит лишь доминирующий язык и английские вставки пропускает.
COMBO_LATIN_MIN=2   # столько латинских букв в выводе GigaAM по куску → переснять whisper

def _collect_whisper(result,samples,rate,base):
    """Реплики из результата whisper по куску samples; base — начало куска в записи."""
    out=[]; length=len(samples)/rate
    for s in result['segments']:
        text=s['text'].strip()
        start=max(0,s['start']); end=min(length,s['end'])
        db=level(samples,start,end,rate)
        if db<SILENT_DB or (text.lower() in HALLUCINATIONS and db<-45) or echoes_prompt(text): continue
        if s.get('no_speech_prob',0)<0.8 and end>start and any(c.isalnum() for c in text):
            seg=dict(start=round(base+start,3),end=round(base+end,3),text=fix(text))
            if WANT_WORDS:
                words=words_of(s.get('words'),base)
                if words: seg['words']=words
            out.append(seg)
    return out

def _whisper_piece(audio,samples,rate,base):
    kwargs=dict(path_or_hf_repo=str(whisper_model()),verbose=None,condition_on_previous_text=False)
    if PROMPT: kwargs['initial_prompt']=PROMPT
    if WANT_WORDS: kwargs['word_timestamps']=True
    return _collect_whisper(mlx_whisper.transcribe(audio,**kwargs),samples,rate,base)

def _gigaam_piece(giga,audio,samples,rate,base):
    """Реплики GigaAM по куску + его сырой текст (для проверки на латиницу)."""
    text,timestamps,tokens=giga.recognize(audio,rate)
    out=[]; length=len(samples)/rate
    for seg in segments_from_ctc(tokens,timestamps,shift=base,want_words=WANT_WORDS):
        start=seg['start']-base; end=min(length,seg['end']-base)
        if level(samples,start,end,rate)<SILENT_DB: continue
        seg['text']=fix(seg['text'])
        if not WANT_WORDS: seg.pop('words',None)
        out.append(seg)
    return out,text

def combo_chunk(giga,samples,rate,length):
    """Покусочный роутинг: GigaAM, а куски с английским — переснять whisper."""
    found=[]
    for a,b in pieces(samples,rate):
        sub=samples[a:b]; base=offset+a/rate
        audio=sub.astype(np.float32)/32768.0
        giga_segs,giga_text=_gigaam_piece(giga,audio,sub,rate,base)
        if len(re.findall(r'[A-Za-z]',giga_text))>=COMBO_LATIN_MIN:
            found+=_whisper_piece(audio,sub,rate,base)   # в куске английский — точный whisper
        else:
            found+=giga_segs
    return found

if __name__=='__main__':
    engine=ENGINE
    giga=None
    if engine in ('gigaam','auto'):
        model_p,tokens_p=asr_config.gigaam_paths()
        if gigaam_available(model_p,tokens_p):
            try: giga=GigaAM(model_p,tokens_p)
            except Exception as error: print(f'GigaAM не загрузился ({error}).',flush=True); giga=None
        if giga is None:
            print('GigaAM недоступен — распознаём whisper.',flush=True); engine='whisper'
    for chunk in chunks:
        with wave.open(str(chunk)) as f:
            rate=f.getframerate(); length=f.getnframes()/rate
            samples=np.frombuffer(f.readframes(f.getnframes()),dtype=np.int16)
        if engine=='auto': segments+=combo_chunk(giga,samples,rate,length)
        elif engine=='gigaam': segments+=gigaam_chunk(giga,samples,rate,length)
        else: segments+=whisper_chunk(chunk,samples,rate,length)
        offset+=length
        record(folder,'Распознаём речь',offset,total,'seconds')
    (folder/'segments.json').write_text(json.dumps(segments,ensure_ascii=False))
