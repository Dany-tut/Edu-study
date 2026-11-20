import importlib
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from job_control import members


class CancelTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, ISKRA_TRANSCRIPTION_HOME=self.tmp.name)
        self.env.start()
        import server
        self.s = importlib.reload(server)
        self.token = 'a'*64
        (self.s.HOME/self.token).touch()
        self.headers = {'Origin':'https://iskra-study.ru', 'X-Iskra-Module':'transcription-v1', 'Authorization':'Bearer '+self.token}
        self.client = self.s.app.test_client()
        self.threads = []
        root = Path(self.tmp.name)/'code';root.mkdir()
        # Real process group including a child that ignores TERM. A late success
        # after TERM must never override cancellation; KILL must reach the child.
        (root/'job_worker.py').write_text('''import json,os,signal,subprocess,sys,time
from pathlib import Path
folder=Path(os.environ['ISKRA_TRANSCRIPTION_HOME'])/'jobs'/sys.argv[1]
child=subprocess.Popen([sys.executable,'-c','import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);time.sleep(120)'])
(folder/'child.pid').write_text(str(child.pid))
def late(*args):
 job=json.loads((folder/'job.json').read_text());job['state']={'stage':'Готово','done':True}
 (folder/'job.json').write_text(json.dumps(job))
signal.signal(signal.SIGTERM,late)
(folder/'ready').touch()
while True: time.sleep(.1)
''')
        self.s.ROOT = root
    def tearDown(self):
        for thread,folder in self.threads:
            if thread.is_alive(): (folder/'.cancel').touch();thread.join(10)
        self.env.stop();self.tmp.cleanup()
    def start_job(self,jid):
        job={'id':jid,'owner':self.token,'link':'','completed':[], 'state':{'stage':'Разделяем голоса','stageStartedAt':time.time()-600}}
        folder=self.s.JOBS/jid;folder.mkdir();self.s.job_store.save(folder,job);self.s.jobs[jid]=job
        thread=threading.Thread(target=self.s.run_job,args=(jid,));thread.start();self.threads.append((thread,folder))
        end=time.monotonic()+10
        while not (folder/'ready').exists():
            if time.monotonic()>end:self.fail('worker did not start')
            time.sleep(.05)
        return job,folder,thread
    def request(self,method,path):
        return getattr(self.client,method)(path,base_url='http://127.0.0.1:18764',headers=self.headers)
    def test_cancel_tree_late_success_gate_restart_and_owner(self):
        for jid in ['b'*32,'c'*32]:
            job,folder,thread=self.start_job(jid)
            pid=json.loads((folder/'.process.json').read_text())['pid']
            wrong={**self.headers,'Authorization':'Bearer '+'d'*64};(self.s.HOME/('d'*64)).touch()
            self.assertEqual(self.client.delete('/jobs/'+jid,base_url='http://127.0.0.1:18764',headers=wrong).status_code,404)
            self.assertEqual(self.request('post','/update').status_code,409)
            state=self.request('get','/jobs/'+jid).json
            self.assertTrue(state['canCancel']);self.assertGreaterEqual(state['elapsedSeconds'],600)
            response=self.request('delete','/jobs/'+jid)
            self.assertEqual(response.status_code,202)
            self.assertTrue(response.json['cancelling']);self.assertIn(jid,self.s.running)
            thread.join(10);self.assertFalse(thread.is_alive())
            self.assertFalse(members(pid));self.assertNotIn(jid,self.s.running)
            state=self.request('get','/jobs/'+jid).json
            self.assertTrue(state['cancelled']);self.assertFalse(state.get('done',False))
            self.assertTrue(self.s.job_store.load(self.s.JOBS)[jid]['state']['cancelled'])
            self.assertEqual(self.request('delete','/jobs/'+jid).status_code,200)
        with patch.object(self.s,'process') as process:
            self.s.resume_jobs();process.assert_not_called()
    def test_observer_failure_stops_group_before_wait(self):
        from job_control import supervise
        folder=self.s.JOBS/('f'*32);folder.mkdir()
        self.s.job_store.save(folder,{'state':{'stage':'running'}})
        captured=[]
        def observe():
            if (folder/'ready').exists():
                captured.append(json.loads((folder/'.process.json').read_text())['pid'])
                raise ValueError('broken observer')
        with self.assertRaisesRegex(ValueError,'broken observer'):
            supervise(folder,[sys.executable,str(self.s.ROOT/'job_worker.py'),folder.name],observe)
        self.assertTrue(captured);self.assertFalse(members(captured[0]))

    def test_cancel_queued_job_before_process_launch(self):
        jid='e'*32;folder=self.s.JOBS/jid;folder.mkdir()
        job={'id':jid,'owner':self.token,'link':'','state':{'stage':'В очереди'}}
        self.s.jobs[jid]=job;self.s.job_store.save(folder,job)
        # Задание ждёт в очереди — отмена снимает его из очереди сразу, без запуска.
        with self.s.queue_cv: self.s.pending.append(jid)
        self.assertEqual(self.request('delete','/jobs/'+jid).status_code,202)
        self.assertNotIn(jid,self.s.pending)
        self.assertTrue(self.s.jobs[jid]['state']['cancelled'])
        # Повторный прогон супервизора ничего не запускает: маркер .cancel на месте.
        self.s.run_job(jid)
        self.assertTrue(job['state']['cancelled']);self.assertNotIn(jid,self.s.running)
        self.assertFalse((folder/'ready').exists())

if __name__=='__main__':unittest.main()
