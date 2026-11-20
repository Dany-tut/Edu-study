"""Slide-title quality on fixtures: a clean slide and screen recordings with
PowerPoint/Copilot chrome. Rows in fixtures/slides/*.vision.json are recorded
from the bundled Vision helper (frame_text.swift) on the «top-left» crop."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import frame_ocr
from slide_chapters import heading, meaningful, ui_chrome

FIXTURES = Path(__file__).parent/'fixtures'/'slides'


def rows(name):
    return json.loads((FIXTURES/f'{name}.top-left.vision.json').read_text())


class ChromeFilterTests(unittest.TestCase):
    def test_clean_slide_heading(self):
        self.assertEqual(heading(rows('slide-clean')), 'Клеточное строение')

    def test_screen_recording_chrome_is_not_a_heading(self):
        # Toolbar tabs sit higher than the slide title; the title must still win.
        self.assertEqual(heading(rows('slide-screen-chrome')), 'Клеточное строение')
        self.assertEqual(heading(rows('slide-screen-chrome-2')), 'Деление клетки')
        chrome_only = [row for row in rows('slide-screen-chrome') if row['text'] != 'Клеточное строение']
        self.assertEqual(heading(chrome_only), '')

    def test_reported_garbage_is_rejected(self):
        # Real chapter titles from a teacher's lesson (17.11) and old helper output.
        for junk in ['Draw a Ask Copilot + of 31 CD', 'KneTorue', '/Uy Knetorwe', '2 of 31',
                     'Slide 2 of 31 English (United States) Notes', 'File Home', 'Insert',
                     'Design Slide Show', 'Ask Copilot', 'Стр. 3 из 12', 'Слайд 4 / 20',
                     '1. KneTKa - eAMHMua CTpoeHMS1)KMBoro', 'CD', 'Uy', 'a']:
            self.assertEqual(heading([{'text':junk,'height':.4,'y':0}]), '', junk)
        self.assertTrue(ui_chrome('Draw a Ask Copilot + of 31 CD'))

    def test_real_headings_survive(self):
        for title in ['Клеточное строение', 'Запись реакции', 'Reading', 'Speaking Part 2', 'ДНК', 'АТФ',
                      'pH', 'Na', 'Ёж', 'Вид и популяция', 'iPhone и экология', 'Present Simple',
                      'Деление клетки 2', 'Митоз', 'The water cycle']:
            self.assertTrue(meaningful(title), title)
            self.assertEqual(heading([{'text':title,'height':.3,'y':.1}]), title)

    def test_large_title_beats_small_text_higher_up(self):
        lines = [{'text':'Строение клетки и тканей организма','height':.08,'y':.02},
                 {'text':'Митохондрии','height':.3,'y':.4}]
        self.assertEqual(heading(lines), 'Митохондрии')


class HelperDetectionTests(unittest.TestCase):
    def test_old_latin_only_helper_is_not_used(self):
        with tempfile.TemporaryDirectory() as directory:
            old = Path(directory)/'IskraFrameText'
            # ≤ 1.0.8: ignores arguments, cannot decode empty stdin, exits 2.
            old.write_text('#!/bin/sh\ncat >/dev/null\nexit 2\n'); old.chmod(0o755)
            with patch.dict(os.environ, ISKRA_FRAME_TEXT=str(old)):
                self.assertIsNone(frame_ocr.helper())
            new = Path(directory)/'new'
            new.write_text('#!/bin/sh\necho iskra-frame-text 2\n'); new.chmod(0o755)
            with patch.dict(os.environ, ISKRA_FRAME_TEXT=str(new)):
                self.assertEqual(frame_ocr.helper(), str(new))
        with patch.dict(os.environ, ISKRA_FRAME_TEXT=''):
            self.assertIsNone(frame_ocr.helper())

    def test_vision_path_never_installs_rapidocr(self):
        import slide_chapters
        with tempfile.TemporaryDirectory() as folder, \
             patch.object(slide_chapters.frame_ocr, 'helper', return_value='/bin/helper'), \
             patch.object(slide_chapters.frame_ocr, 'VisionStream') as stream, \
             patch.object(slide_chapters, 'media_duration', return_value=10.0), \
             patch.object(slide_chapters, 'process_video', return_value=([{'start':0,'title':'Митоз'}], {})), \
             patch.object(slide_chapters, 'ensure_runtime') as install, \
             patch.object(slide_chapters, 'ocr_engine') as rapid:
            slide_chapters.main('/nonexistent.mp4', folder, 'top-left')
            install.assert_not_called(); rapid.assert_not_called(); stream.assert_called_once_with('/bin/helper')
            self.assertEqual(json.loads((Path(folder)/'chapters.json').read_text()), [{'start':0,'title':'Митоз'}])


class KeyframeScanTests(unittest.TestCase):
    def test_dense_reading_only_where_title_changed_or_keyframes_far_apart(self):
        from slide_chapters import keyframe_changes
        same = lambda a, b: a == b
        keys = [(0, 'A'), (10, 'A'), (20, 'B'), (30, 'B'), (40, 'B'), (70, 'B'), (80, 'C'), (90, 'C')]
        self.assertEqual(keyframe_changes(keys, same), [(10, 20), (40, 80)])
        self.assertEqual(keyframe_changes([(0, 'A'), (10, 'A')], same), [])


class StreamRecoveryTests(unittest.TestCase):
    def test_stalled_helper_is_restarted_and_frame_reread(self):
        import numpy as np
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory)/'started'
            helper = Path(directory)/'helper'
            # First start hangs without answering; the restart answers normally.
            helper.write_text(f'''#!/bin/sh
if [ ! -f "{marker}" ]; then touch "{marker}"; sleep 30; exit 0; fi
while IFS= read -r magic; do IFS= read -r size; IFS= read -r depth
  set -- $size; head -c $(( $1 * $2 * 3 )) >/dev/null
  echo '[{{"text":"Митоз","x":0,"y":0.1,"width":0.5,"height":0.3}}]'
done
'''); helper.chmod(0o755)
            with frame_ocr.VisionStream(str(helper), timeout=2, first_timeout=1) as engine:
                rows = engine(np.zeros((4, 6, 3), dtype=np.uint8))
                self.assertEqual(engine.restarts, 1)
                self.assertEqual(rows[0]['text'], 'Митоз')
                self.assertEqual(engine(np.zeros((4, 6, 3), dtype=np.uint8))[0]['text'], 'Митоз')

    def test_helper_that_never_answers_fails_the_job(self):
        import numpy as np
        with tempfile.TemporaryDirectory() as directory:
            helper = Path(directory)/'helper'
            helper.write_text('#!/bin/sh\nsleep 30\n'); helper.chmod(0o755)
            with frame_ocr.VisionStream(str(helper), timeout=1, first_timeout=1, attempts=2) as engine:
                with self.assertRaisesRegex(ValueError, 'не отвечает'):
                    engine(np.zeros((4, 6, 3), dtype=np.uint8))


@unittest.skipUnless(os.environ.get('ISKRA_TEST_FRAME_TEXT') and os.environ.get('ISKRA_TEST_FFMPEG'),
                     'Local Vision helper + FFmpeg fixture test (macOS)')
class VisionVideoTests(unittest.TestCase):
    """End to end: fixture slides → video → bundled-helper OCR → chapters."""
    def chapters(self, keyint):
        import slide_chapters
        ffmpeg = os.environ['ISKRA_TEST_FFMPEG']
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(slide_chapters, 'FFMPEG', ffmpeg), \
             patch.dict(os.environ, ISKRA_FRAME_TEXT=os.environ['ISKRA_TEST_FRAME_TEXT']):
            video = Path(directory)/'lesson.mp4'
            subprocess.run([ffmpeg, '-nostdin', '-v', 'error',
                '-loop', '1', '-t', '8', '-i', str(FIXTURES/'slide-screen-chrome.png'),
                '-loop', '1', '-t', '8', '-i', str(FIXTURES/'slide-screen-chrome-2.png'),
                '-filter_complex', '[0][1]concat=n=2:v=1,fps=5,format=yuv420p', '-c:v', 'libx264',
                '-g', str(keyint), '-keyint_min', str(keyint), '-sc_threshold', '0', str(video)], check=True)
            helper = frame_ocr.helper()
            self.assertIsNotNone(helper)
            with frame_ocr.VisionStream(helper) as engine:
                return slide_chapters.process_video(video, 16, 'top-left', engine)

    def test_keyframe_scan(self):
        # A keyframe every 3 s (15 frames at 5 fps): change found between keyframes.
        chapters, metrics = self.chapters(15)
        self.assertEqual(metrics['mode'], 'keyframes')
        self.check(chapters)

    def test_sequential_fallback_for_sparse_keyframes(self):
        chapters, metrics = self.chapters(250)
        self.assertEqual(metrics['mode'], 'sequential')
        self.check(chapters)

    def check(self, chapters):
        self.assertEqual([row['title'] for row in chapters], ['Клеточное строение', 'Деление клетки'])
        self.assertEqual(chapters[0]['start'], 0)
        self.assertLessEqual(abs(chapters[1]['start']-8), 1)


if __name__ == '__main__': unittest.main()
