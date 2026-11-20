import importlib
import os
import tempfile
import unittest

import job_store


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch_env(self.tmp.name)
        self.env.start()
        import server
        self.s = importlib.reload(server)
        self.token = 'a' * 64
        (self.s.HOME / self.token).touch()
        self.headers = {'Origin': 'https://iskra-study.ru', 'X-Iskra-Module': 'transcription-v1',
                        'Authorization': 'Bearer ' + self.token}
        self.client = self.s.app.test_client()

    def tearDown(self):
        self.env.stop(); self.tmp.cleanup()

    def post(self, **form):
        return self.client.post('/jobs', data=form, base_url='http://127.0.0.1:18764', headers=self.headers)

    def test_second_job_is_accepted_and_queued_never_rejected_as_busy(self):
        # Серийного отказа «занят» больше нет: оба задания принимаются (202) и
        # встают в очередь — диспетчер в тесте не запущен, поэтому оба ждут.
        first = self.post(link='https://example.com/a')
        second = self.post(link='https://example.com/b')
        self.assertEqual((first.status_code, second.status_code), (202, 202))
        self.assertEqual(len(self.s.pending), 2)
        self.assertEqual(self.s.pending, [first.get_json()['id'], second.get_json()['id']])

    def test_job_is_accepted_even_while_another_is_running(self):
        with self.s.queue_cv: self.s.running.add('busy' + '0' * 28)
        resp = self.post(link='https://example.com/c')
        self.assertEqual(resp.status_code, 202)
        self.assertIn(resp.get_json()['id'], self.s.pending)

    def test_jobs_endpoint_reports_queue_position(self):
        first = self.post(link='https://example.com/a').get_json()['id']
        second = self.post(link='https://example.com/b').get_json()['id']
        state = self.client.get('/jobs/' + second, base_url='http://127.0.0.1:18764', headers=self.headers).json
        self.assertTrue(state['queued']); self.assertEqual(state['position'], 2)
        self.assertEqual(state['stage'], 'В очереди')
        state_one = self.client.get('/jobs/' + first, base_url='http://127.0.0.1:18764', headers=self.headers).json
        self.assertEqual(state_one['position'], 1)

    def test_queue_endpoint_is_owner_scoped_summary(self):
        mine = self.post(link='https://example.com/a').get_json()['id']
        # Задание другого компьютера не должно попасть в сводку этого токена.
        other = 'c' * 64; (self.s.HOME / other).touch()
        folder = self.s.JOBS / ('f' * 32); folder.mkdir()
        job = {'id': 'f' * 32, 'owner': other, 'link': '', 'state': {'stage': 'В очереди'}}
        job_store.save(folder, job); self.s.jobs[job['id']] = job
        with self.s.queue_cv:
            self.s.pending.append(job['id'])
            self.s.running.add(mine); self.s.pending.remove(mine)
        summary = self.client.get('/queue', base_url='http://127.0.0.1:18764', headers=self.headers).json
        self.assertEqual(summary['counts'], {'running': 1, 'queued': 0})
        self.assertEqual([r['id'] for r in summary['running']], [mine])
        self.assertEqual(summary['maxParallel'], self.s.QUEUE_CONFIG.max_parallel)


def patch_env(home):
    from unittest.mock import patch
    return patch.dict(os.environ, ISKRA_TRANSCRIPTION_HOME=home)


if __name__ == '__main__':
    unittest.main()
