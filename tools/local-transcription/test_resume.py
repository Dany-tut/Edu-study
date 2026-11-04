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
        self.assertEqual([Path(c.args[0][1]).name for c in run.call_args_list],['slides.py','topics.py'])
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

if __name__=='__main__': unittest.main()
