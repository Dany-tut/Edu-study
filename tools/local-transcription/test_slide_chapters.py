import importlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from slide_chapters import heading, scan, same, suspicious


class SlideChapterTests(unittest.TestCase):
    def test_noise_never_beats_or_replaces_real_heading(self):
        for noise in ['V гч ···', 'sm rч ···', 'mm o ···', 'om V', 'мт ч ···', 'mm ч ···']:
            self.assertTrue(suspicious(noise))
            # Ellipsis/mixed-script fragments must not outrank a readable heading.
            self.assertEqual(heading([{'text':noise,'height':.3,'y':0}, {'text':'ТРИПАНОСОМА','height':.1,'y':.2}]), 'ТРИПАНОСОМА')
            # A frame with only shards has no heading: better no chapter than «om V».
            self.assertEqual(heading([{'text':noise,'height':.3,'y':0}]), '')
        for short in ['pH', 'Na', 'Ёж', 'ДНК', 'РНК']:
            self.assertEqual(heading([{'text':short,'height':.1,'y':.1}]), short)

    def test_global_unique_titles_and_first_appearance(self):
        def read(t):
            return 'ТРИПАНОСОМА' if t < 6 or t >= 14 else 'ЛЯМБЛИЯ'
        result = scan(read, 20)
        self.assertEqual(result, [{'start':0,'title':'ТРИПАНОСОМА'}, {'start':6,'title':'ЛЯМБЛИЯ'}])
    def test_refines_transition_and_ignores_transient_overlay(self):
        def read(t):
            if t == 2:return 'Инструменты рисования'
            if t < 7.25:return 'Первая тема'
            return 'Вторая тема'
        result = scan(read, 16)
        self.assertEqual([c['title'] for c in result], ['Первая тема','Вторая тема'])
        self.assertLessEqual(abs(result[1]['start']-7.25),.5)
    def test_distinct_short_titles_and_numbered_subtopics(self):
        self.assertFalse(same('ДНК','РНК'))
        self.assertFalse(same('Деление клетки 1','Деление клетки 2'))
        self.assertTrue(same('ТРИПАНОСОМА','Трипаносома.'))
    def test_title_beats_body_footer_and_page_number(self):
        lines=[{'text':'БИОЛОГИЯ • ЕГЭ 16','height':.2,'y':.05},
               {'text':'1. Жгутиковое паразитическое простейшее','height':.12,'y':.5},
               {'text':'ТРИПАНОСОМА','height':.15,'y':.1},
               {'text':'16','height':.2,'y':.1}]
        self.assertEqual(heading(lines),'ТРИПАНОСОМА')
        self.assertEqual(heading([lines[0],lines[3]]),'')
    def test_slide_pipeline_does_not_run_speech_or_modify_existing_job(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ,ISKRA_TRANSCRIPTION_HOME=root):
            import server
            s=importlib.reload(server)
            folder=s.JOBS/('b'*32);folder.mkdir();(folder/'input').write_bytes(b'fixture')
            job={'id':folder.name,'owner':'a'*64,'link':'','mode':'slides','titleRegion':'top-left','completed':[],'state':{'stage':'Запись принята'}}
            s.gate.acquire()
            def run(cmd,**kwargs):
                self.assertEqual(Path(cmd[1]).name,'slide_chapters.py')
                (folder/'chapters.json').write_text('[{"start":0,"title":"ТРИПАНОСОМА"}]')
                return subprocess.CompletedProcess(cmd,0)
            with patch.object(s,'ensure_models') as models,patch.object(s.subprocess,'run',side_effect=run) as worker:
                s.run_pipeline(job,folder,'')
            models.assert_not_called();self.assertEqual(worker.call_count,1)
            self.assertTrue(job['state']['done']);self.assertEqual(job['state']['mode'],'slides')
            self.assertNotIn('segments',job['state']);self.assertNotIn('montage',job['state'])
            self.assertFalse(s.gate.locked())
    def test_empty_scan_does_not_invent_chapters(self):
        self.assertEqual(scan(lambda _: '',20),[])

if __name__=='__main__':unittest.main()
