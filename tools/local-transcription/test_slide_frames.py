import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from slide_frames import TitleCache, frames, ppm


class FrameTests(unittest.TestCase):
    def cache(self):
        calls = []
        cache = TitleCache(lambda image: calls.append(image.copy()) or str(len(calls)))
        cache.signature = lambda image: image
        return cache, calls

    def test_static_and_compression_noise_reuse(self):
        cache, calls = self.cache()
        image = np.full((128,512),100,dtype=np.uint8)
        self.assertEqual(cache.read(image,0),'1')
        self.assertEqual(cache.read(image+3,2),'1')
        self.assertEqual(len(calls),1)
        self.assertEqual(cache.read(image,60),'2')  # periodic independent check

    def test_small_local_letter_change_not_hidden_by_global_average(self):
        image = np.zeros((128,512),dtype=np.uint8)
        changed = image.copy();changed[10:13,10:13]=255
        self.assertFalse(TitleCache.unchanged(image,changed))
        cache,calls=self.cache();cache.read(image,0);cache.read(changed,2)
        self.assertEqual(len(calls),2)

    def test_gradual_change_compared_to_recognized_reference(self):
        cache,calls=self.cache();image=np.full((128,512),100,dtype=np.uint8)
        cache.read(image,0);cache.read(image+10,2);cache.read(image+20,4)
        self.assertEqual(len(calls),2)

    def test_repeated_slide_and_backward_refinement_reuse(self):
        cache,calls=self.cache();a=np.zeros((128,512),dtype=np.uint8);b=a+100
        self.assertEqual(cache.read(a,0),'1');self.assertEqual(cache.read(b,6),'2')
        self.assertEqual(cache.read(a,14),'1');self.assertEqual(cache.read(b,5.5),'2')
        self.assertEqual(len(calls),2)

    def test_cache_memory_bounded(self):
        cache,calls=self.cache()
        for i in range(12):cache.read(np.full((128,512),i*20,dtype=np.uint8),i*60)
        self.assertEqual(len(cache.entries),8)

    def test_invalid_or_partial_frames_fail_closed(self):
        for data in [b'garbage\n',b'P6\n1 1\n255\n\x00',b'P6\n9000 9000\n255\n']:
            read,write=os.pipe();os.write(write,data);os.close(write)
            with os.fdopen(read,'rb',buffering=0) as stream:
                with self.assertRaises(ValueError):ppm(stream)

    def test_decoder_is_reaped_on_consumer_error(self):
        import sys
        with tempfile.TemporaryDirectory() as directory:
            pidfile=Path(directory)/'pid'
            command=[sys.executable,'-c',f'import os,time;open({str(pidfile)!r},"w").write(str(os.getpid()));time.sleep(60)']
            with self.assertRaises(RuntimeError):
                with frames(command):
                    import time
                    for _ in range(100):
                        if pidfile.exists():break
                        time.sleep(.01)
                    pid=int(pidfile.read_text());raise RuntimeError('consumer failed')
            with self.assertRaises(ProcessLookupError):os.kill(pid,0)


@unittest.skipUnless(os.environ.get('ISKRA_TEST_FFMPEG'), 'Explicit local FFmpeg fixture test')
class VideoTimingTests(unittest.TestCase):
    def test_sparse_vfr_uses_displayed_frame_not_future_frame(self):
        import slide_chapters as slides
        ffmpeg=os.environ['ISKRA_TEST_FFMPEG']
        with tempfile.TemporaryDirectory() as directory:
            video=Path(directory)/'sparse.mp4'
            filters=r'drawbox=color=blue:t=fill:enable=between(t\,5.5\,9),drawbox=color=white:t=fill:enable=gte(t\,9),select=eq(n\,0)+eq(n\,11)+eq(n\,18)+eq(n\,31)'
            subprocess.run([ffmpeg,'-nostdin','-v','error','-f','lavfi','-i','color=red:s=320x180:r=2:d=16',
                            '-vf',filters,'-fps_mode','vfr','-c:v','libx264','-threads','2',str(video)],check=True)
            def engine(image):
                red,green,blue=image[0,0]
                text='Белая тема' if min(blue,green,red)>200 else 'Синяя тема' if blue>red else 'Красная тема'
                return [{'text':text,'height':.3,'y':.1}]
            with patch.object(slides,'FFMPEG',ffmpeg):
                result,metrics=slides.process_video(video,16,'top-left',engine)
            self.assertEqual(result,[{'start':0,'title':'Красная тема'}, {'start':5.5,'title':'Синяя тема'}, {'start':9,'title':'Белая тема'}])
            self.assertLess(metrics['ocr'],metrics['samples'])

if __name__=='__main__':unittest.main()
