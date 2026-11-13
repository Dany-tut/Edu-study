"""Loopback-only Iskra processing companion. It never receives any Supabase credential."""
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import threading
import uuid
import time
import fcntl
import hashlib
import io
import re
import signal
import zipfile

from flask import Flask, abort, jsonify, request
from link_video import fetch, downloaded, LIMIT, DownloadUnavailable
from media_tools import FFMPEG
import job_store

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = LIMIT + 1024 * 1024
ROOT = Path(__file__).resolve().parent
HOME = Path(os.environ.get('ISKRA_TRANSCRIPTION_HOME', str(Path.home() / 'Library/Application Support/Iskra/transcription')))
HOME.mkdir(mode=0o700, parents=True, exist_ok=True)
PRODUCTION_ORIGINS = frozenset({
    'https://iskra-study.ru',
    'https://edu-study-app.vercel.app',
})
DEV_ORIGIN = os.environ.get('ISKRA_APP_ORIGIN')
UPDATE_URL = 'https://iskra-study.ru'
ALLOWED_ORIGINS = PRODUCTION_ORIGINS | ({DEV_ORIGIN} if DEV_ORIGIN else set())
gate = threading.Lock()
JOBS = HOME / 'jobs'
JOBS.mkdir(mode=0o700, exist_ok=True)
# Голоса: модели разделения и запомненные отпечатки. Отпечатки — биометрия,
# поэтому живут только здесь, в папке модуля, и отдельно для каждого
# подключённого профиля; в урок попадают одни имена.
VOICE_MODELS = HOME / 'voice-models'
def voice_memory(token): return HOME / f"voices-{hashlib.sha256(token.encode()).hexdigest()[:16]}.json"
jobs = job_store.load(JOBS)
last_activity = time.monotonic()
IDLE_STOP_SECONDS = 30 * 60

def is_code(name):
    return (name.endswith(('.py','.swift')) or name=='start.command') and not name.startswith('test_')

def fingerprint(files):
    """Отпечаток кода модуля — тот же, что считает scripts/buildTranscriptionModule.mjs."""
    h=hashlib.sha256()
    for name in sorted(n for n in files if is_code(n)):
        h.update(name.encode()+b'\0'); h.update(files[name]); h.update(b'\0')
    return h.hexdigest()[:12]

def module_version(root=ROOT):
    """Страница Искры сравнивает отпечаток с версией архива на сайте и обновляет модуль."""
    return fingerprint({p.name: p.read_bytes() for p in root.iterdir() if p.is_file() and is_code(p.name)})
VERSION = module_version()
# Large speech/topic models are prepared by the first real transcription only.
RUNTIME = Path.home() / 'Library/Application Support/Iskra/transcription-runtime'
MODEL_SPECS = (
    ('mlx-community/whisper-large-v3-turbo', 'whisper'),
    ('mlx-community/Qwen2.5-3B-Instruct-4bit', 'topics'),
)

def ensure_models(stage):
    """Download heavy weights on demand, never when the local service starts."""
    hf=RUNTIME/'bin'/'hf'
    if not hf.is_file():raise ValueError('Не найден менеджер моделей. Перезапустите установку модуля Искры.')
    for model,kind in MODEL_SPECS:
        root=Path.home()/'.cache/huggingface/hub'/('models--'+model.replace('/','--'))/'snapshots'
        if any(root.glob('*/weights.safetensors' if kind=='whisper' else '*/model*.safetensors')):continue
        label='Whisper' if kind=='whisper' else 'глав'
        stage('Загружаем модель '+label)
        args=[str(hf),'download',model,'--include','*.json','*.safetensors','*.txt','*.jinja']
        result=subprocess.run(args,capture_output=True,text=True,timeout=7200)
        if result.returncode:
            raise ValueError('Не удалось загрузить модель '+label+'. Проверьте интернет и свободное место, затем начните заново.')
# Уровень Б — материал для дообучения распознавания. Только по включённому
# учителем переключателю и только здесь, на Mac: звук записи (сжатый) и
# отрывки реплик, которые учитель исправил, с правильным текстом. В Искру и
# куда-либо ещё не отправляется. Звук без исправлений живёт TRAINING_DAYS дней.
TRAINING = HOME / 'training'
TRAINING_DAYS = 60
def training_audio(jid): return TRAINING / 'audio' / f'{jid}.ogg'

@app.before_request
def verify():
    if request.host != '127.0.0.1:18764' or request.headers.get('Origin') not in ALLOWED_ORIGINS:
        abort(403)
    if request.method == 'OPTIONS':
        return '', 204
    if request.headers.get('X-Iskra-Module') != 'transcription-v1':
        abort(403)
    global last_activity
    last_activity=time.monotonic()

@app.after_request
def cors(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.update({'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers':'Content-Type, X-Iskra-Module, Authorization',
            'Access-Control-Allow-Private-Network':'true','Cache-Control':'no-store'})
    return response

def device():
    token = request.headers.get('Authorization', '').removeprefix('Bearer ')
    if len(token)!=64 or any(c not in '0123456789abcdef' for c in token) or not (HOME/token).is_file():
        abort(403)
    return token

@app.get('/version')
def version():
    # Без токена: версия не секрет, а подсказать «обновите модуль» нужно и
    # до подключения компьютера.
    # update — модуль умеет обновляться сам (POST /update).
    return jsonify(version=VERSION, update=True)

UPDATE_NAME = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.-]*')
# Исполняемые файлы архива не переносятся при самообновлении: подписанный ffmpeg
# установленного приложения остаётся в bundle. В отпечаток они не входят.
BINARIES = {'ffmpeg', 'ffprobe'}

def install(data, expected):
    """Разложить архив с сайта поверх папки модуля. Сначала всё проверить, потом писать."""
    files={}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for info in archive.infolist():
            name=info.filename.removeprefix('Iskra/')
            if info.is_dir() or name==info.filename: continue
            limit=200*1024**2 if name in BINARIES else 8*1024**2
            if not UPDATE_NAME.fullmatch(name) or info.file_size>limit: raise ValueError('В архиве лишний файл: '+info.filename)
            files[name]=archive.read(info)
    if 'server.py' not in files or 'start.command' not in files: raise ValueError('Архив модуля неполный.')
    version=fingerprint(files)
    if expected and version!=expected: raise ValueError('На сайте уже другая версия. Обновите страницу.')
    for name,body in files.items():
        if name in BINARIES: continue
        tmp=ROOT/('.'+name+'.new')
        tmp.write_bytes(body)
        tmp.chmod(0o755 if name=='start.command' or name in BINARIES else 0o644)
        os.replace(tmp, ROOT/name)
    # Код, которого в новой версии нет, иначе отпечаток навсегда разойдётся с сайтом.
    for p in ROOT.iterdir():
        if p.is_file() and is_code(p.name) and p.name not in files: p.unlink()
    return version

def restart():
    # start.command заново: зависимости докачаются, если новой версии нужны.
    # Порт и замок модуля закрываются при exec — файлы Python не наследуются.
    os.execv('/bin/zsh', ['/bin/zsh', str(ROOT/'start.command')])

@app.post('/update')
def update():
    """Обновиться с сайта Искры без ZIP в «Загрузках»: файлы скачивает сам модуль
    (curl), поэтому macOS не помечает их «из интернета» и не просит разрешения."""
    device()
    expected=str((request.get_json(silent=True) or {}).get('version',''))[:12]
    if not gate.acquire(False): return jsonify(error='Модуль занят расшифровкой. Обновится, когда она закончится.'),409
    try:
        got=subprocess.run(['curl','-fsSL','--max-time','120',UPDATE_URL+'/downloads/iskra-transcription-mac.zip'],capture_output=True)
        if got.returncode: raise ValueError('Не удалось скачать обновление. Проверьте интернет.')
        version=install(got.stdout, expected)
    except (ValueError, zipfile.BadZipFile) as error:
        gate.release()
        return jsonify(error=str(error) if isinstance(error, ValueError) else 'Архив обновления повреждён.'),502
    print(f'Модуль обновлён до {version}, перезапускаемся…', flush=True)
    # Замок не отпускаем: новых заданий до перезапуска не будет.
    threading.Timer(0.5, restart).start()
    return jsonify(version=version),202

@app.post('/connect')
def connect():
    token=secrets.token_hex(32)
    (HOME/token).touch(mode=0o600)
    return jsonify(token=token)

@app.delete('/connect')
def disconnect():
    (HOME/device()).unlink(missing_ok=True)
    return '',204

def process(job,folder,link):
    worker_lock = open(folder / '.worker.lock', 'a')
    fcntl.flock(worker_lock, fcntl.LOCK_EX)
    def stage(label,**fields):
        job['state']={'stage':label,**fields}
        job_store.save(folder, job)
    try:
        source=folder/'input'
        if link and 'download' not in job['completed']:
            while True:
                try:
                    stage('Скачиваем видео')
                    fetch(link,folder)
                    job['completed'].append('download')
                    job_store.save(folder, job)
                    break
                except DownloadUnavailable:
                    stage('Загрузка на паузе: ждём интернет. Повторим автоматически.', paused=True)
                    time.sleep(15)
        stage('Готовим звуковую дорожку')
        cmd=[FFMPEG,'-nostdin','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac','-i',str(source),'-map','0:a:0','-vn','-ac','1','-ar','16000','-f','segment','-segment_time','90','-reset_timestamps','1',str(folder/'audio-%05d.wav')]
        if 'audio' not in job['completed']:
            for old in folder.glob('audio-*.wav'): old.unlink()
            if subprocess.run(cmd,capture_output=True,pass_fds=(worker_lock.fileno(),)).returncode:
                raise ValueError('Не удалось прочитать звук. Проверьте файл или ссылку.')
            job['completed'].append('audio')
            job_store.save(folder, job)
        if job.get('training') and not training_audio(job['id']).exists():
            # Сжатая копия звука переживёт уборку папки задания: из неё потом
            # вырезаются исправленные учителем реплики. ~7 МБ на час записи.
            training_audio(job['id']).parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            subprocess.run([FFMPEG,'-nostdin','-v','error','-y','-protocol_whitelist','file,pipe','-i',str(source),'-map','0:a:0','-vn','-ac','1','-ar','16000','-c:a','libopus','-b:a','16k',str(training_audio(job['id']))],
                           capture_output=True,pass_fds=(worker_lock.fileno(),))
        ensure_models(stage)
        env=dict(os.environ,HF_HUB_OFFLINE='1',TOKENIZERS_PARALLELISM='false')
        if job.get('tracks') and 'recognize.py' not in job['completed']:
            stage('Распознаём речь')
            recognize_tracks(job,folder,env,worker_lock)
            job['completed'].append('recognize.py')
            job_store.save(folder, job)
        for label,script,args in [('Распознаём речь','recognize.py',[folder]),('Разделяем голоса','diarize.py',[folder,VOICE_MODELS,voice_memory(job['owner'])]),('Ищем паузы','silence.py',[folder,source]),('Читаем слайды','slides.py',[source,folder/'slides.json']),('Собираем главы','topics.py',[folder])]:
            if script in job['completed']: continue
            # С дорожками голоса уже известны — угадывать нечего.
            if script=='diarize.py' and job.get('tracks'): continue
            stage(label)
            python=os.environ.get('ISKRA_WHISPER_PYTHON',sys.executable) if script in ('recognize.py','silence.py','diarize.py') else sys.executable
            subprocess.run([python,str(ROOT/script),*map(str,args)],check=True,env=env,pass_fds=(worker_lock.fileno(),))
            if script=='recognize.py' and not json.loads((folder/'segments.json').read_text()):
                raise ValueError('В записи не найдено речи.')
            job['completed'].append(script)
            job_store.save(folder, job)
        montage=folder/'montage.json'
        voices=folder/'voices.json'
        stage('Готово',segments=json.loads((folder/'segments.json').read_text()),chapters=json.loads((folder/'chapters.json').read_text()),
              montage=json.loads(montage.read_text()) if montage.exists() else None,
              voices=json.loads(voices.read_text()) if voices.exists() else None,done=True)
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        stage(str(exc) if type(exc) is ValueError else 'Обработка не завершилась. Проверьте запись и повторите.',error=True)
    finally:
        if job['state'].get('done') or job['state'].get('error'):
            for artifact in folder.iterdir():
                if artifact.name not in ('job.json', '.worker.lock') and artifact.is_file(): artifact.unlink(missing_ok=True)
        worker_lock.close()
        gate.release()

def recognize_tracks(job,folder,env,worker_lock):
    """Каждую дорожку — отдельно: реплики сразу с именем участника."""
    merged,voices=[],[]
    for i,name in enumerate(job['tracks']):
        sub=folder/f'track{i}'
        sub.mkdir(exist_ok=True)
        cmd=[FFMPEG,'-nostdin','-v','error','-i',str(folder/f'track-{i}'),'-map','0:a:0','-vn','-ac','1','-ar','16000','-f','segment','-segment_time','90','-reset_timestamps','1',str(sub/'audio-%05d.wav')]
        if subprocess.run(cmd,capture_output=True,pass_fds=(worker_lock.fileno(),)).returncode:
            raise ValueError(f'Не удалось прочитать дорожку «{name}».')
        python=os.environ.get('ISKRA_WHISPER_PYTHON',sys.executable)
        subprocess.run([python,str(ROOT/'recognize.py'),str(sub)],check=True,env=env,pass_fds=(worker_lock.fileno(),))
        own=json.loads((sub/'segments.json').read_text())
        for seg in own: seg['speaker']=f't{i+1}'
        merged+=own
        voices.append({'id':f't{i+1}','name':name,'seconds':round(sum(s['end']-s['start'] for s in own),1)})
    merged.sort(key=lambda s:s['start'])
    if not merged: raise ValueError('В дорожках не найдено речи.')
    (folder/'segments.json').write_text(json.dumps(merged,ensure_ascii=False))
    (folder/'voices.json').write_text(json.dumps({'segments':[s['speaker'] for s in merged],'voices':voices},ensure_ascii=False))

@app.post('/voices')
def remember():
    """Запомнить голоса, которым дали имя: в следующих уроках узнаются сами."""
    token=device()
    items=(request.get_json(silent=True) or {}).get('voices') or []
    path=voice_memory(token)
    memory=json.loads(path.read_text()) if path.exists() else []
    for item in items:
        label=str(item.get('label','')).strip()[:60]
        emb=item.get('embedding')
        if not label or not isinstance(emb,str) or len(emb)>16384: continue
        memory=[m for m in memory if m['label']!=label]
        memory.append({'label':label,'role':'teacher' if item.get('role')=='teacher' else 'student','embedding':emb})
    path.write_text(json.dumps(memory[-200:]))
    path.chmod(0o600)
    return jsonify(count=len(memory))

@app.delete('/voices')
def forget():
    """Забыть все запомненные голоса этого профиля."""
    voice_memory(device()).unlink(missing_ok=True)
    return '',204

@app.post('/jobs')
def start():
    token=device()
    if not gate.acquire(False): return jsonify(error='На компьютере уже обрабатывается запись.'),409
    folder=None
    try:
        size=request.content_length or 0
        if size and shutil.disk_usage(JOBS).free < 2*size+128*1024**2:
            gate.release()
            return jsonify(error='Недостаточно свободного места на Mac для этой записи.'),413
        file=request.files.get('video')
        link=request.form.get('link','').strip()
        # Дорожки участников (Zoom «записывать звук каждого отдельно»): по
        # файлу на человека — голоса известны точно, без угадывания.
        tracks=[t for t in request.files.getlist('tracks') if t and t.filename]
        if bool(file)==bool(link):abort(400)
        jid=uuid.uuid4().hex
        folder=JOBS/jid
        folder.mkdir(mode=0o700)
        if file:file.save(folder/'input')
        names=[]
        for i,t in enumerate(tracks):
            t.save(folder/f'track-{i}')
            names.append(Path(t.filename).stem[:60] or f'Участник {i+1}')
        # Словарь предмета от страницы: подсказка распознаванию и известные ошибки.
        terms=request.form.get('terms','')
        if terms and len(terms)<200_000:
            try:
                data=json.loads(terms)
                (folder/'terms.json').write_text(json.dumps({'prompt':[str(t)[:80] for t in data.get('prompt',[])][:120],
                    'replace':[[str(h)[:80],str(w)[:80]] for h,w in data.get('replace',[]) if isinstance(h,str) and isinstance(w,str)][:400]},ensure_ascii=False))
            except (ValueError, TypeError, AttributeError): pass
        job={'id':jid,'owner':token,'link':link,'tracks':names,'completed':[], 'state':{'stage':'Запись принята'},'training':request.form.get('training')=='1'}
        job_store.save(folder, job)
        jobs[jid]=job
        threading.Thread(target=process,args=(job,folder,link),daemon=True).start()
        return jsonify(id=jid),202
    except Exception:
        if folder:shutil.rmtree(folder, ignore_errors=True)
        gate.release()
        raise

@app.get('/jobs/<jid>')
def progress(jid):
    token=device()
    job=jobs.get(jid)
    if not job or job['owner']!=token:abort(404)
    state=job['state'].copy()
    if state['stage']=='Скачиваем видео':
        folder=(JOBS/jid)
        try:
            current,total=downloaded(folder)
            if total:state['progress']={'step':state['stage'],'current':current,'total':total,'unit':'bytes'}
            else:state['bytes']=current
        except (FileNotFoundError, ValueError):pass
    else:
        try:
            detail=json.loads(((JOBS/jid)/'progress.json').read_text())
            if detail['step']==state['stage']:state['progress']=detail
        except (FileNotFoundError, ValueError):pass
    return jsonify(state)

@app.post('/training')
def training():
    """Учитель исправил реплику — отрывок звука с правильным текстом в материал для дообучения."""
    token=device()
    body=request.get_json(silent=True) or {}
    jid=str(body.get('job',''))
    job=jobs.get(jid)
    if not job or job['owner']!=token: abort(404)
    audio=training_audio(jid)
    if not audio.exists(): return jsonify(saved=0)
    subject=''.join(c for c in str(body.get('subject',''))[:40] if c.isalnum() or c in '-_') or 'other'
    clips=TRAINING/'clips'/subject
    clips.mkdir(mode=0o700, parents=True, exist_ok=True)
    saved=0
    with open(TRAINING/'manifest.jsonl','a') as manifest:
        for item in (body.get('items') or [])[:50]:
            try: start=max(0.0,float(item['start'])-0.2); end=float(item['end'])+0.2
            except (KeyError, TypeError, ValueError): continue
            text=str(item.get('text','')).strip()[:1000]
            if not text or not 0<end-start<=30: continue
            clip=clips/f'{jid}-{int(start*1000)}.wav'
            if subprocess.run([FFMPEG,'-nostdin','-v','error','-y','-ss',f'{start:.3f}','-to',f'{end:.3f}','-i',str(audio),'-ac','1','-ar','16000',str(clip)],capture_output=True).returncode: continue
            # Одна строка — один отрывок: звук, правильный текст и как было распознано.
            manifest.write(json.dumps({'audio':str(clip.relative_to(TRAINING)),'text':text,'before':str(item.get('before',''))[:1000],
                                       'subject':subject,'job':jid,'start':round(start,3),'end':round(end,3),'at':int(time.time())},ensure_ascii=False)+'\n')
            saved+=1
    return jsonify(saved=saved)

def prune_training():
    """Звук записей, из которых так ничего и не вырезали, — не дольше TRAINING_DAYS дней."""
    folder=TRAINING/'audio'
    if not folder.exists(): return
    edge=time.time()-TRAINING_DAYS*86400
    for f in folder.glob('*.ogg'):
        if f.stat().st_mtime<edge: f.unlink(missing_ok=True)

def resume_jobs():
    # Serial worker: do not overlap heavy model processes after a restart.
    for job in list(jobs.values()):
        if job['state'].get('done') or job['state'].get('error'): continue
        gate.acquire()
        process(job, JOBS/job['id'], job['link'])

def idle_shutdown():
    """Stop the on-demand LaunchAgent after 30 idle minutes and no active job."""
    while True:
        time.sleep(30)
        if not gate.locked() and time.monotonic()-last_activity>=IDLE_STOP_SECONDS:
            os.kill(os.getpid(),signal.SIGTERM)
            return

if __name__=='__main__':
    os.umask(0o077)
    module_lock = open(HOME / '.module.lock', 'a')
    try: fcntl.flock(module_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print('Модуль Искры уже работает. Вернитесь в браузер.', flush=True)
        sys.exit(0)
    prune_training()
    threading.Thread(target=resume_jobs, daemon=True).start()
    threading.Thread(target=idle_shutdown, daemon=True).start()
    app.run(host='127.0.0.1',port=18764,threaded=True)
