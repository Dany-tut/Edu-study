import ipaddress, re, shutil, socket, subprocess, sys
from urllib.parse import parse_qs, urljoin, urlsplit

class DownloadUnavailable(Exception):
    pass

LIMIT=2*1024**3
def fetch(url,folder):
    try: return _fetch(url,folder)
    except subprocess.TimeoutExpired as exc: raise DownloadUnavailable() from exc

def _fetch(url,folder):
    limit=min(LIMIT, (shutil.disk_usage(folder).free-128*1024**2)//3)
    if limit<=0:raise ValueError('Недостаточно свободного места на Mac.')
    for _ in range(6):
        p=urlsplit(url)
        if p.scheme not in ('http','https') or not p.hostname or p.username or p.password:
            raise ValueError('Нужна публичная ссылка HTTP или HTTPS.')
        if p.hostname in ('youtube.com','www.youtube.com','m.youtube.com','youtu.be'):
            vid=(parse_qs(p.query).get('v') or [''])[0] if p.path=='/watch' else p.path.split('/')[-1]
            if not re.fullmatch(r'[A-Za-z0-9_-]{11}',vid):raise ValueError('Нужна ссылка на одно видео YouTube.')
            r=subprocess.run([sys.executable,'-m','yt_dlp','--ignore-config','--no-playlist','--no-progress','--max-filesize',str(limit),'--socket-timeout','15','--retries','1','--match-filter','!is_live','-f','bv[height<=720][ext=mp4]+ba[ext=m4a]/b[ext=mp4]','--merge-output-format','mp4','-o',str(folder/'download.%(ext)s'),'--','https://www.youtube.com/watch?v='+vid],capture_output=True,timeout=900)
            video=folder/'download.mp4'
            if r.returncode and any(word in r.stderr.decode(errors='replace').lower() for word in ('timed out','network is unreachable','temporary failure','name resolution','remote end closed connection','connection reset','connection refused')):
                raise DownloadUnavailable()
            if r.returncode or not video.exists() or video.stat().st_size>LIMIT:raise ValueError('Не удалось скачать видео YouTube. Проверьте доступ без входа или выберите файл.')
            video.rename(folder/'input')
            return
        port=p.port or (443 if p.scheme=='https' else 80)
        try: addresses=[ipaddress.ip_address(a[4][0]) for a in socket.getaddrinfo(p.hostname,port,type=socket.SOCK_STREAM)]
        except socket.gaierror as exc: raise DownloadUnavailable() from exc
        if not addresses or not all(a.is_global for a in addresses):raise ValueError('Нужна общедоступная ссылка на видео.')
        addr=str(addresses[0]);addr=f'[{addr}]' if ':' in addr else addr
        r=subprocess.run(['curl','-q','--noproxy','*','--silent','--connect-timeout','15','--max-time','900','--max-filesize',str(limit),'--resolve',f'{p.hostname}:{port}:{addr}','--output',str(folder/'input'),'--write-out','%{http_code}\n%{redirect_url}\n%{content_type}','--',url],capture_output=True,text=True)
        code,_,rest=r.stdout.partition('\n');target,_,mime=rest.partition('\n')
        if not r.returncode and code.startswith('3') and target:
            url=urljoin(url,target);continue
        if r.returncode in (5,6,7,18,28,35,52,55,56): raise DownloadUnavailable()
        if r.returncode or code!='200' or 'text/html' in mime:raise ValueError('Ссылка должна открывать видео для скачивания. Для закрытой записи выберите файл.')
        return
    raise ValueError('Слишком много переадресаций.')
