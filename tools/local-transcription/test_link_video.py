import tempfile
import unittest
from pathlib import Path
import socket
import subprocess
from unittest.mock import patch

import link_video


class DriveLinkTests(unittest.TestCase):
    def test_extracts_only_supported_public_drive_file_links(self):
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        self.assertEqual(link_video.drive_file_id(f'https://drive.google.com/file/d/{fid}/view?usp=sharing'),fid)
        self.assertEqual(link_video.drive_file_id(f'https://drive.google.com/open?id={fid}'),fid)
        self.assertIsNone(link_video.drive_file_id(f'https://drive.google.com/file/d/{fid}/edit'))
        self.assertIsNone(link_video.drive_file_id(f'https://example.com/file/d/{fid}/view'))
        self.assertIsNone(link_video.drive_file_id('http://drive.google.com/file/d/a/view'))

    def test_builds_confirmation_request_only_for_same_file_and_drive_host(self):
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        html=f'''<form action="https://drive.usercontent.google.com/download" method="get">
          <input type="hidden" name="id" value="{fid}">
          <input type="hidden" name="export" value="download">
          <input type="hidden" name="confirm" value="t123">
        </form>'''
        url=link_video.drive_confirmation_url(html,'https://drive.google.com/uc?export=download',fid)
        self.assertEqual(url,f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t123')
        self.assertIsNone(link_video.drive_confirmation_url(
            html.replace('drive.usercontent.google.com','attacker.example'),
            'https://drive.google.com/uc?export=download',fid))
        self.assertIsNone(link_video.drive_confirmation_url(
            html.replace(fid,'OtherFileId12345'),
            'https://drive.google.com/uc?export=download',fid))

    def test_reads_http_only_confirmation_cookie(self):
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        with tempfile.TemporaryDirectory() as tmp:
            cookies=Path(tmp)/'cookies.txt'
            cookies.write_text('#HttpOnly_drive.google.com\tTRUE\t/\tTRUE\t0\tdownload_warning_abc\tcookie-token\n')
            url=link_video.drive_confirmation_url('<html>Download anyway</html>',
                f'https://drive.google.com/uc?export=download&id={fid}',fid,cookies)
        self.assertIn('confirm=cookie-token',url)
        self.assertIn('id='+fid,url)

    def test_downloads_large_drive_video_after_confirmation_without_network(self):
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        warning=f'''<form action="https://drive.usercontent.google.com/download" method="get">
          <input type="hidden" name="id" value="{fid}">
          <input type="hidden" name="export" value="download">
          <input type="hidden" name="confirm" value="confirm-token">
        </form>'''
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            def request(url, _folder, _limit, cookie_file=None, body_name='.drive-response'):
                body=folder/body_name
                if 'confirm-token' not in url:
                    body.write_text(warning)
                    return 0,'200','', 'text/html; charset=UTF-8',body
                body.write_bytes(b'video bytes' * 100)
                return 0,'200','', 'application/octet-stream',body
            with patch.object(link_video,'_curl_once',side_effect=request) as curl, \
                 patch.object(link_video,'_verify_video') as verify:
                link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',folder,1_000_000)
            self.assertEqual(curl.call_count,2)
            self.assertTrue((folder/'input').exists())
            self.assertEqual((folder/'input').stat().st_size,1100)
            self.assertEqual((folder/'.download-size').read_text(),'1100\n')
            verify.assert_called_once()
            self.assertFalse((folder/'.drive-cookies').exists())

    def test_rejects_non_video_payload_and_oversize_response(self):
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            payload=folder/'.drive-response'
            payload.write_bytes(b'not a video')
            with patch.object(link_video,'_curl_once',return_value=(0,'200','', 'application/octet-stream',payload)), \
                 patch.object(link_video,'_verify_video',side_effect=ValueError('not video')):
                with self.assertRaisesRegex(ValueError,'not video'):
                    link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',folder,1000)
            payload.write_bytes(b'x'*1001)
            with patch.object(link_video,'_curl_once',return_value=(0,'200','', 'application/octet-stream',payload)), \
                 patch.object(link_video,'_verify_video'):
                with self.assertRaisesRegex(ValueError,'Размер видео'):
                    link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',folder,1000)

    def test_every_drive_request_rejects_private_addresses_before_curl(self):
        with tempfile.TemporaryDirectory() as tmp:
            private=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))]
            with patch.object(link_video.socket,'getaddrinfo',return_value=private), \
                 patch.object(link_video.subprocess,'run') as curl:
                with self.assertRaisesRegex(ValueError,'общедоступная'):
                    link_video._curl_once('https://drive.usercontent.google.com/download',Path(tmp),1_000_000)
            curl.assert_not_called()

    def test_video_probe_requires_a_decodable_video_stream(self):
        with patch.object(link_video.subprocess,'run',return_value=subprocess.CompletedProcess([],0)) as ffmpeg:
            link_video._verify_video('/tmp/video-fixture','ffmpeg-mock')
        command=ffmpeg.call_args.args[0]
        self.assertIn('-protocol_whitelist',command); self.assertEqual(command[command.index('-map')+1],'0:v:0')
        with patch.object(link_video.subprocess,'run',return_value=subprocess.CompletedProcess([],1)):
            with self.assertRaisesRegex(ValueError,'должна открывать видео'):
                link_video._verify_video('/tmp/html-fixture','ffmpeg-mock')


if __name__=='__main__':
    unittest.main()
