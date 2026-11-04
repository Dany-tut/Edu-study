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

from flask import Flask, abort, jsonify, request
from link_video import fetch, LIMIT, DownloadUnavailable
import job_store

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = LIMIT + 1024 * 1024
ROOT = Path(__file__).resolve().parent
HOME = Path(os.environ.get('ISKRA_TRANSCRIPTION_HOME', str(Path.home() / 'Library/Application Support/Iskra/transcription')))
HOME.mkdir(mode=0o700, parents=True, exist_ok=True)
ORIGIN = os.environ.get('ISKRA_APP_ORIGIN', 'https://edu-study-app.vercel.app')
gate = threading.Lock()
JOBS = HOME / 'jobs'
JOBS.mkdir(mode=0o700, exist_ok=True)
jobs = job_store.load(JOBS)

@app.before_request
def verify():
    if request.host != '127.0.0.1:18764' or request.headers.get('Origin') != ORIGIN:
        abort(403)
    if request.method == 'OPTIONS':
        return '', 204
    if request.headers.get('X-Iskra-Module') != 'transcription-v1':
        abort(403)

@app.after_request
def cors(response):
    if request.headers.get('Origin') == ORIGIN:
        response.headers.update({'Access-Control-Allow-Origin': ORIGIN,
            'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers':'Content-Type, X-Iskra-Module, Authorization',
            'Access-Control-Allow-Private-Network':'true','Cache-Control':'no-store'})
    return response

def device():
    token = request.headers.get('Authorization', '').removeprefix('Bearer ')
    if len(token)!=64 or any(c not in '0123456789abcdef' for c in token) or not (HOME/token).is_file():
        abort(403)
    return token

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
        cmd=['ffmpeg','-nostdin','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac','-i',str(source),'-map','0:a:0','-vn','-ac','1','-ar','16000','-f','segment','-segment_time','90','-reset_timestamps','1',str(folder/'audio-%05d.wav')]
        if 'audio' not in job['completed']:
            for old in folder.glob('audio-*.wav'): old.unlink()
            if subprocess.run(cmd,capture_output=True,pass_fds=(worker_lock.fileno(),)).returncode:
                raise ValueError('Не удалось прочитать звук. Проверьте файл или ссылку.')
            job['completed'].append('audio')
            job_store.save(folder, job)
        env=dict(os.environ,HF_HUB_OFFLINE='1',TOKENIZERS_PARALLELISM='false')
        for label,script,args in [('Распознаём речь','recognize.py',[folder]),('Ищем паузы','silence.py',[folder]),('Читаем слайды','slides.py',[source,folder/'slides.json']),('Собираем главы','topics.py',[folder])]:
            if script in job['completed']: continue
            stage(label)
            python=os.environ.get('ISKRA_WHISPER_PYTHON',sys.executable) if script in ('recognize.py','silence.py') else sys.executable
            subprocess.run([python,str(ROOT/script),*map(str,args)],check=True,env=env,pass_fds=(worker_lock.fileno(),))
            if script=='recognize.py' and not json.loads((folder/'segments.json').read_text()):
                raise ValueError('В записи не найдено речи.')
            job['completed'].append(script)
            job_store.save(folder, job)
        montage=folder/'montage.json'
        stage('Готово',segments=json.loads((folder/'segments.json').read_text()),chapters=json.loads((folder/'chapters.json').read_text()),
              montage=json.loads(montage.read_text()) if montage.exists() else None,done=True)
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        stage(str(exc) if type(exc) is ValueError else 'Обработка не завершилась. Проверьте запись и повторите.',error=True)
    finally:
        if job['state'].get('done') or job['state'].get('error'):
            for artifact in folder.iterdir():
                if artifact.name not in ('job.json', '.worker.lock') and artifact.is_file(): artifact.unlink(missing_ok=True)
        worker_lock.close()
        gate.release()

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
        if bool(file)==bool(link):abort(400)
        jid=uuid.uuid4().hex
        folder=JOBS/jid
        folder.mkdir(mode=0o700)
        if file:file.save(folder/'input')
        job={'id':jid,'owner':token,'link':link,'completed':[], 'state':{'stage':'Запись принята'}}
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
        try:state['bytes']=sum(p.stat().st_size for p in folder.iterdir() if p.is_file())
        except (FileNotFoundError, ValueError):pass
    else:
        try:
            detail=json.loads(((JOBS/jid)/'progress.json').read_text())
            if detail['step']==state['stage']:state['progress']=detail
        except (FileNotFoundError, ValueError):pass
    return jsonify(state)

def resume_jobs():
    # Serial worker: do not overlap heavy model processes after a restart.
    for job in list(jobs.values()):
        if job['state'].get('done') or job['state'].get('error'): continue
        gate.acquire()
        process(job, JOBS/job['id'], job['link'])

if __name__=='__main__':
    os.umask(0o077)
    module_lock = open(HOME / '.module.lock', 'a')
    try: fcntl.flock(module_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print('Модуль Искры уже работает. Вернитесь в браузер.', flush=True)
        sys.exit(0)
    threading.Thread(target=resume_jobs, daemon=True).start()
    app.run(host='127.0.0.1',port=18764,threaded=True)
