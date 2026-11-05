import importlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess
import job_store

class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, ISKRA_TRANSCRIPTION_HOME=self.tmp.name)
        self.env.start()
        import server
        self.s = importlib.reload(server)
        self.token = 'a'*64
        (self.s.HOME/self.token).touch()
        self.headers = {'Origin': self.s.ORIGIN, 'X-Iskra-Module': 'transcription-v1', 'Authorization': 'Bearer '+self.token}
        self.client = self.s.app.test_client()
    def tearDown(self):
        self.env.stop(); self.tmp.cleanup()
    def job(self, completed=None):
        job = {'id':'b'*32, 'owner':self.token, 'link':'', 'completed':completed or [], 'state':{'stage':'Запись принята'}}
        folder=self.s.JOBS/job['id'];folder.mkdir();(folder/'input').write_bytes(b'fixture')
        job_store.save(folder,job);self.s.jobs[job['id']]=job
        return job,folder
    def run_step(self, cmd, **kwargs):
        folder=self.folder
        if 'ffmpeg'==cmd[0]: (folder/'audio-00000.wav').write_bytes(b'audio')
        elif cmd[1].endswith('recognize.py'):(folder/'segments.json').write_text('[{"start":0,"end":2,"text":"Результат A"}]')
        elif cmd[1].endswith('silence.py'):(folder/'montage.json').write_text('{"duration":2,"step":0.5,"levels":[-20,-20,-60,-60],"quiet":[]}')
        elif cmd[1].endswith('slides.py'):(folder/'slides.json').write_text('[]')
        else:(folder/'chapters.json').write_text('[{"start":0,"title":"Глава A"}]')
        return subprocess.CompletedProcess(cmd,0)
    def test_restart_skips_completed_stages_and_keeps_result(self):
        job,self.folder=self.job(['audio','recognize.py'])
        (self.folder/'segments.json').write_text('[{"start":0,"end":2,"text":"Результат A"}]')
        restored=job_store.load(self.s.JOBS)[job['id']]
        self.s.gate.acquire()
        with patch.object(self.s.subprocess,'run',side_effect=self.run_step) as run:
            self.s.process(restored,self.folder,'')
        # Задача старого модуля, прерванная после распознавания, добирает новые шаги: голоса и паузы.
        self.assertEqual([Path(c.args[0][1]).name for c in run.call_args_list],['diarize.py','silence.py','slides.py','topics.py'])
        self.s.jobs=job_store.load(self.s.JOBS)
        result=self.client.get('/jobs/'+job['id'],base_url='http://127.0.0.1:18764',headers=self.headers)
        self.assertTrue(result.json['done']);self.assertEqual(result.json['segments'][0]['text'],'Результат A')
        self.assertFalse((self.folder/'input').exists())
        self.assertEqual((self.folder/'job.json').stat().st_mode & 0o777,0o600)
    def test_download_failure_pauses_and_resumes_same_job(self):
        job,self.folder=self.job(); job['link']='https://example.test/a.mp4'
        def check_pause(_):self.assertTrue(job_store.load(self.s.JOBS)[job['id']]['state']['paused'])
        self.s.gate.acquire()
        with patch.object(self.s,'fetch',side_effect=[self.s.DownloadUnavailable(),None]) as fetch, patch.object(self.s.time,'sleep',side_effect=check_pause), patch.object(self.s.subprocess,'run',side_effect=self.run_step):
            self.s.process(job,self.folder,job['link'])
        self.assertTrue(job['state']['done']);self.assertEqual(fetch.call_count,2)
    def test_wrong_owner_cannot_read_persisted_result(self):
        job,self.folder=self.job();other='c'*64;(self.s.HOME/other).touch()
        result=self.client.get('/jobs/'+job['id'],base_url='http://127.0.0.1:18764',headers={**self.headers,'Authorization':'Bearer '+other})
        self.assertEqual(result.status_code,404)
    def test_invalid_upload_releases_gate(self):
        result=self.client.post('/jobs',base_url='http://127.0.0.1:18764',headers=self.headers,data={})
        self.assertEqual(result.status_code,400);self.assertFalse(self.s.gate.locked())
    def test_finished_job_not_restarted(self):
        job,self.folder=self.job();job['state']={'done':True};job_store.save(self.folder,job)
        self.s.jobs=job_store.load(self.s.JOBS)
        with patch.object(self.s,'process') as proc:self.s.resume_jobs()
        proc.assert_not_called()

    def test_voices_are_remembered_per_profile_and_forgotten(self):
        url=dict(base_url='http://127.0.0.1:18764',headers=self.headers)
        r=self.client.post('/voices',json={'voices':[{'label':'Маша','role':'student','embedding':'AAAA'},{'label':'','embedding':'AAAA'}]},**url)
        self.assertEqual(r.get_json()['count'],1)
        path=self.s.voice_memory(self.token)
        self.assertEqual(json.loads(path.read_text())[0]['label'],'Маша')
        self.assertEqual(oct(path.stat().st_mode & 0o777),'0o600')
        self.client.post('/voices',json={'voices':[{'label':'Маша','role':'teacher','embedding':'BBBB'}]},**url)
        self.assertEqual(json.loads(path.read_text()),[{'label':'Маша','role':'teacher','embedding':'BBBB'}])
        self.assertEqual(self.client.delete('/voices',**url).status_code,204)
        self.assertFalse(path.exists())

    def test_job_keeps_terms_and_training_flag(self):
        url=dict(base_url='http://127.0.0.1:18764',headers=self.headers)
        terms=json.dumps({'prompt':['s-подуровень'],'replace':[['из-под уровн*','s-подуровн*'],[1,'x']]})
        with patch.object(self.s.threading,'Thread'):
            r=self.client.post('/jobs',data={'link':'https://example.com/v','terms':terms,'training':'1'},**url)
        jid=r.get_json()['id'];self.s.gate.release()
        saved=json.loads((self.s.JOBS/jid/'terms.json').read_text())
        self.assertEqual(saved,{'prompt':['s-подуровень'],'replace':[['из-под уровн*','s-подуровн*']]})
        self.assertTrue(self.s.jobs[jid]['training'])

    def test_training_clips_only_for_owner_with_kept_audio(self):
        url=dict(base_url='http://127.0.0.1:18764',headers=self.headers)
        job,self.folder=self.job()
        item={'start':1,'end':2.5,'text':'на s-подуровне','before':'на из-под уровне'}
        self.assertEqual(self.client.post('/training',json={'job':job['id'],'items':[item]},**url).get_json()['saved'],0)
        audio=self.s.training_audio(job['id']);audio.parent.mkdir(parents=True)
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=d=4','-ar','16000','-c:a','libopus',str(audio)],check=True)
        other='c'*64;(self.s.HOME/other).touch()
        self.assertEqual(self.client.post('/training',json={'job':job['id'],'items':[item]},base_url=url['base_url'],headers={**self.headers,'Authorization':'Bearer '+other}).status_code,404)
        r=self.client.post('/training',json={'job':job['id'],'subject':'chemistry','items':[item,{'start':0,'end':99,'text':'длинно'}]},**url)
        self.assertEqual(r.get_json()['saved'],1)
        line=json.loads((self.s.TRAINING/'manifest.jsonl').read_text().splitlines()[0])
        self.assertEqual((line['text'],line['before'],line['subject']),('на s-подуровне','на из-под уровне','chemistry'))
        self.assertTrue((self.s.TRAINING/line['audio']).exists())

    def test_version_is_code_fingerprint(self):
        r=self.client.get('/version',base_url='http://127.0.0.1:18764',headers={k:v for k,v in self.headers.items() if k!='Authorization'})
        self.assertEqual(r.get_json()['version'],self.s.module_version())
        self.assertRegex(r.get_json()['version'],r'^[0-9a-f]{12}$')
        self.assertTrue(r.get_json()['update'])

    def archive(self, files):
        import zipfile
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w') as z:
            for name,body in files.items(): z.writestr(name,body)
        return buf.getvalue()

    def test_update_installs_archive_and_drops_removed_code(self):
        root=Path(self.tmp.name)/'module'; root.mkdir()
        (root/'server.py').write_text('old'); (root/'gone.py').write_text('x'); (root/'test_keep.py').write_text('t')
        self.s.ROOT=root
        files={'Iskra/server.py':b'new','Iskra/start.command':b'#!/bin/zsh','Iskra/README.md':b'r'}
        expected=self.s.fingerprint({k.removeprefix('Iskra/'):v for k,v in files.items()})
        with self.assertRaises(ValueError): self.s.install(self.archive(files),'0'*12)
        self.assertEqual((root/'server.py').read_text(),'old')
        with self.assertRaises(ValueError): self.s.install(self.archive({**files,'Iskra/../evil.py':b'x'}),'')
        self.assertEqual(self.s.install(self.archive(files),expected),expected)
        self.assertEqual(self.s.module_version(root),expected)
        self.assertFalse((root/'gone.py').exists()); self.assertTrue((root/'test_keep.py').exists())
        self.assertTrue(os.access(root/'start.command',os.X_OK))

    def test_update_waits_for_running_job(self):
        self.assertTrue(self.s.gate.acquire(False))
        try:
            r=self.client.post('/update',json={},base_url='http://127.0.0.1:18764',headers=self.headers)
            self.assertEqual(r.status_code,409)
        finally: self.s.gate.release()

if __name__=='__main__': unittest.main()
