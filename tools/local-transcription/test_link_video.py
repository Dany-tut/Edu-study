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
            def request(url, _folder, _limit, cookie_file=None, body_name='.drive-response', extra=()):
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
            payload=folder/'download.response'
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


class RangeServer:
    """Local stand-in for the Drive file host: Range support, a per-connection
    speed cap, and optionally one dropped connection mid-piece."""
    def __init__(self, data, rate=4*1024**2, drop_once=False, ranges=True):
        import http.server, threading
        server=self
        self.data, self.requests, self.dropped = data, [], not drop_once
        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self,*_):pass
            def do_GET(self):
                server.requests.append(self.headers.get('Range'))
                header=self.headers.get('Range') if ranges else None
                start,end=0,len(data)-1
                if header:
                    a,b=header.split('=')[1].split('-'); start=int(a); end=int(b) if b else len(data)-1
                    self.send_response(206); self.send_header('Content-Range',f'bytes {start}-{end}/{len(data)}')
                else: self.send_response(200)
                self.send_header('Content-Type','video/mp4'); self.send_header('Content-Length',str(end-start+1)); self.end_headers()
                body=data[start:end+1]; sent=0; began=__import__('time').monotonic()
                try:
                    while sent<len(body):
                        if not server.dropped and sent>len(body)//2 and start>0:
                            server.dropped=True; self.connection.close(); return
                        chunk=body[sent:sent+65536]; self.wfile.write(chunk); sent+=len(chunk)
                        ahead=sent/rate-(__import__('time').monotonic()-began)
                        if ahead>0:__import__('time').sleep(ahead)
                except (BrokenPipeError,ConnectionResetError):pass
        self.http=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.url=f'http://127.0.0.1:{self.http.server_port}/download?id=x'
        threading.Thread(target=self.http.serve_forever,daemon=True).start()
    def close(self): self.http.shutdown(); self.http.server_close()


class ParallelDownloadTests(unittest.TestCase):
    def setUp(self):
        self.data=bytes(range(256))*(64*1024)  # 16 MiB, position-dependent
        patcher=patch.object(link_video,'_public_ip',return_value='127.0.0.1'); patcher.start(); self.addCleanup(patcher.stop)
        sizes=patch.multiple(link_video,PART_MIN=1024**2); sizes.start(); self.addCleanup(sizes.stop)

    def test_parallel_pieces_join_in_order_and_resume_after_drop(self):
        server=RangeServer(self.data,drop_once=True); self.addCleanup(server.close)
        with tempfile.TemporaryDirectory() as tmp:
            joined=link_video._download_parts(server.url,Path(tmp),len(self.data),None)
            self.assertEqual(joined.read_bytes(),self.data)
            self.assertFalse(list(Path(tmp).glob('download.*.*')))
        self.assertGreaterEqual(len(server.requests),link_video.PARTS+1)  # one piece resumed

    def test_parallel_is_faster_than_one_connection(self):
        import time
        server=RangeServer(self.data,rate=4*1024**2); self.addCleanup(server.close)
        with tempfile.TemporaryDirectory() as tmp:
            began=time.monotonic(); link_video._download_parts(server.url,Path(tmp),len(self.data),None); parallel=time.monotonic()-began
        # One connection at 4 MiB/s needs ~4 s for 16 MiB.
        self.assertLess(parallel,2.5)

    def test_drive_fetch_uses_ranges_and_cache_skips_second_download(self):
        server=RangeServer(self.data); self.addCleanup(server.close)
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        with tempfile.TemporaryDirectory() as home:
            jobs=Path(home)/'jobs'
            first=jobs/'a'; first.mkdir(parents=True); second=jobs/'b'; second.mkdir()
            real=link_video._curl_once
            def via_local(url,*args,**kwargs):
                return real(server.url,*args,**kwargs)
            with patch.object(link_video,'_curl_once',side_effect=via_local), \
                 patch.object(link_video,'drive_direct_url',return_value=server.url), \
                 patch.object(link_video,'_verify_video'):
                link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',first,1<<30)
                self.assertEqual((first/'input').read_bytes(),self.data)
                self.assertEqual((first/'.download-size').read_text(),f'{len(self.data)}\n')
                count=len(server.requests)
                link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',second,1<<30)
            self.assertEqual(len(server.requests),count)  # served from the Mac cache
            self.assertEqual((second/'input').read_bytes(),self.data)

    def test_server_without_ranges_downloads_in_one_stream(self):
        server=RangeServer(self.data,ranges=False); self.addCleanup(server.close)
        fid='1AbCdEfGhIjKlMnOpQrStUv'
        with tempfile.TemporaryDirectory() as tmp:
            real=link_video._curl_once
            with patch.object(link_video,'_curl_once',side_effect=lambda url,*a,**k:real(server.url,*a,**k)), \
                 patch.object(link_video,'drive_direct_url',return_value=server.url), \
                 patch.object(link_video,'_verify_video'):
                link_video.fetch_drive(f'https://drive.google.com/file/d/{fid}/view',Path(tmp),1<<30)
            self.assertEqual((Path(tmp)/'input').read_bytes(),self.data)
        self.assertEqual(len(server.requests),1)

    def test_progress_counts_bytes_while_pieces_download(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp); (folder/'.download-size').write_text('100\n')
            (folder/'download.100.0').write_bytes(b'x'*30); (folder/'download.100.1').write_bytes(b'x'*20)
            self.assertEqual(link_video.downloaded(folder),(50,100))
            (folder/'download.100.0').unlink(); (folder/'download.100.1').unlink()
            (folder/'download.response').write_bytes(b'x'*70)  # single stream is counted too
            self.assertEqual(link_video.downloaded(folder),(70,100))


if __name__=='__main__':
    unittest.main()
