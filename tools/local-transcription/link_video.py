import ipaddress, re, shutil, socket, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

class DownloadUnavailable(Exception):
    pass

LIMIT=2*1024**3
DRIVE_HOSTS=frozenset({'drive.google.com','www.drive.google.com','drive.usercontent.google.com'})
VIDEO_CHECK_SECONDS=30

def downloaded(folder):
    """Bytes on disk and the expected size; total is 0 when the source did not say."""
    current=sum(p.stat().st_size for p in folder.iterdir() if p.is_file() and (p.name=='input' or p.name.startswith('download.')))
    try: total=int((folder/'.download-size').read_text().split()[-1])
    except (OSError, ValueError, IndexError):
        try: total=int(re.findall(r'(?im)^content-length:\s*(\d+)',(folder/'.download-headers').read_text(errors='replace'))[-1])
        except (OSError, IndexError): total=0
    return min(current,total) if total else current, total

def drive_file_id(url):
    """Accept Drive file URLs only; never treat arbitrary query values as a Drive id."""
    p=urlsplit(url)
    if p.scheme not in ('http','https') or p.hostname not in DRIVE_HOSTS or p.username or p.password:
        return None
    match=re.fullmatch(r'/file/d/([A-Za-z0-9_-]{10,200})/(?:view|preview)?/?',p.path)
    if match:return match.group(1)
    if p.path in ('/open','/uc','/download'):
        value=(parse_qs(p.query).get('id') or [''])[0]
        if re.fullmatch(r'[A-Za-z0-9_-]{10,200}',value):return value
    return None

def drive_download_url(file_id):
    if not re.fullmatch(r'[A-Za-z0-9_-]{10,200}',file_id):raise ValueError('Некорректная ссылка Google Drive.')
    return 'https://drive.google.com/uc?'+urlencode({'export':'download','id':file_id})

class _DrivePage(HTMLParser):
    """Read only Drive confirmation form controls and download links."""
    def __init__(self):
        super().__init__(convert_charrefs=True); self.forms=[]; self.links=[]; self.form=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='form':
            self.form={'action':a.get('action',''),'method':a.get('method','get').lower(),'fields':{}}
            self.forms.append(self.form)
        elif tag=='input' and self.form and a.get('name') and a.get('type','').lower()=='hidden':
            self.form['fields'][a['name']]=a.get('value','')
        elif tag=='a' and a.get('href'):
            self.links.append(a['href'])
    def handle_endtag(self,tag):
        if tag=='form':self.form=None

def drive_confirmation_url(html, current_url, file_id, cookie_file=None):
    """Extract a Drive-provided confirmation token without following page scripts."""
    page=_DrivePage(); page.feed(html)
    candidates=[]
    for form in page.forms:
        fields=form['fields']
        if form['method']=='get' and fields.get('id')==file_id and fields.get('export')=='download' and fields.get('confirm'):
            candidates.append((urljoin(current_url,form['action']),fields))
    for href in page.links:
        target=urljoin(current_url,href); query=parse_qs(urlsplit(target).query)
        if (query.get('id') or [''])[0]==file_id and (query.get('export') or [''])[0]=='download' and query.get('confirm'):
            candidates.append((target,{}))
    # Older Drive warning pages put the confirmation value in a short-lived cookie.
    if not candidates and cookie_file and Path(cookie_file).exists():
        for line in Path(cookie_file).read_text(errors='replace').splitlines():
            if line.startswith('#HttpOnly_'):line=line[len('#HttpOnly_'):]
            elif line.startswith('#') or not line.strip():continue
            fields=line.split('\t')
            if len(fields)>=7 and fields[-2].startswith('download_warning_') and fields[-1]:
                p=urlsplit(current_url); q=parse_qs(p.query); q.update({'confirm':[fields[-1]],'id':[file_id],'export':['download']})
                candidates.append((urlunsplit((p.scheme,p.netloc,p.path,urlencode(q,doseq=True),'')),{})); break
    for url,fields in candidates:
        p=urlsplit(url)
        if p.scheme!='https' or p.hostname not in DRIVE_HOSTS or p.username or p.password:continue
        q=parse_qs(p.query)
        if fields:
            q.update({k:[v] for k,v in fields.items()})
            q.setdefault('id',[file_id]); q.setdefault('export',['download'])
        if (q.get('id') or [''])[0]!=file_id or (q.get('export') or [''])[0]!='download':continue
        return urlunsplit((p.scheme,p.netloc,p.path,urlencode(q,doseq=True),''))
    return None

def _public_ip(host,port):
    try: addresses=[ipaddress.ip_address(a[4][0]) for a in socket.getaddrinfo(host,port,type=socket.SOCK_STREAM)]
    except socket.gaierror as exc: raise DownloadUnavailable() from exc
    if not addresses or not all(a.is_global for a in addresses):raise ValueError('Нужна общедоступная ссылка на видео.')
    return str(addresses[0])

def _curl_once(url, folder, limit, cookie_file=None, body_name='.drive-response'):
    """Make one pinned request; redirects are returned to the caller for revalidation."""
    p=urlsplit(url)
    if p.scheme not in ('http','https') or not p.hostname or p.username or p.password:
        raise ValueError('Нужна публичная ссылка HTTP или HTTPS.')
    port=p.port or (443 if p.scheme=='https' else 80)
    addr=_public_ip(p.hostname,port); addr=f'[{addr}]' if ':' in addr else addr
    body=folder/body_name; headers=folder/'.download-headers'
    cmd=['curl','-q','--noproxy','*','--silent','--connect-timeout','15','--max-time','900','--max-filesize',str(limit),
         '--resolve',f'{p.hostname}:{port}:{addr}','--output',str(body),'--dump-header',str(headers)]
    if cookie_file:cmd.extend(['--cookie',str(cookie_file),'--cookie-jar',str(cookie_file)])
    cmd.extend(['--write-out','%{http_code}\n%{redirect_url}\n%{content_type}','--',url])
    result=subprocess.run(cmd,capture_output=True,text=True)
    values=result.stdout.split('\n',2)
    code=values[0] if values else ''; target=values[1] if len(values)>1 else ''; mime=values[2].strip() if len(values)>2 else ''
    if result.returncode in (5,6,7,18,28,35,52,55,56):raise DownloadUnavailable()
    return result.returncode,code,urljoin(url,target) if target else '',mime,body

def _verify_video(path, ffmpeg='ffmpeg'):
    """Decode one frame locally so an HTML/error response cannot pass as a video."""
    try:
        result=subprocess.run([ffmpeg,'-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',str(path),
                               '-map','0:v:0','-frames:v','1','-f','null','-'],capture_output=True,timeout=VIDEO_CHECK_SECONDS)
    except subprocess.TimeoutExpired as exc:raise ValueError('Ссылка не открывает видео. Скачайте запись и выберите файл.') from exc
    if result.returncode:
        raise ValueError('Ссылка должна открывать видео для скачивания. Проверьте доступ Google Drive или выберите файл.')

def fetch_drive(url,folder,limit,ffmpeg='ffmpeg'):
    file_id=drive_file_id(url)
    if not file_id:raise ValueError('Нужна публичная ссылка Google Drive на видеофайл.')
    current=drive_download_url(file_id); cookie_file=folder/'.drive-cookies'; seen=set()
    try:
        for _ in range(8):
            if current in seen:raise ValueError('Слишком много переадресаций Google Drive.')
            seen.add(current)
            rc,code,target,mime,body=_curl_once(current,folder,limit,cookie_file)
            if not rc and code.startswith('3') and target:
                current=target; body.unlink(missing_ok=True); continue
            if rc:raise ValueError('Не удалось скачать файл Google Drive. Проверьте публичный доступ или выберите файл.')
            if code!='200':raise ValueError('Не удалось скачать файл Google Drive. Проверьте публичный доступ или выберите файл.')
            if 'text/html' in mime.lower():
                html=body.read_text(errors='replace')
                confirmed=drive_confirmation_url(html,current,file_id,cookie_file)
                body.unlink(missing_ok=True)
                if not confirmed:raise ValueError('Google Drive не отдал публичное видео. Проверьте доступ «Все, у кого есть ссылка» или выберите файл.')
                current=confirmed; continue
            size=body.stat().st_size if body.exists() else 0
            if not size or size>limit or size>LIMIT:
                body.unlink(missing_ok=True)
                raise ValueError('Размер видео превышает допустимый лимит или файл скачан не полностью.')
            _verify_video(body,ffmpeg)
            body.replace(folder/'input')
            (folder/'.download-size').write_text(f'{size}\n')
            return
        raise ValueError('Слишком много переадресаций Google Drive.')
    finally:
        (folder/'.drive-cookies').unlink(missing_ok=True)
        (folder/'.drive-response').unlink(missing_ok=True)

def fetch(url,folder):
    try: return _fetch(url,folder)
    except subprocess.TimeoutExpired as exc: raise DownloadUnavailable() from exc

def _fetch(url,folder):
    limit=min(LIMIT, (shutil.disk_usage(folder).free-128*1024**2)//3)
    if limit<=0:raise ValueError('Недостаточно свободного места на Mac.')
    if drive_file_id(url):return fetch_drive(url,folder,limit)
    for _ in range(6):
        p=urlsplit(url)
        if p.scheme not in ('http','https') or not p.hostname or p.username or p.password:
            raise ValueError('Нужна публичная ссылка HTTP или HTTPS.')
        if p.hostname in ('youtube.com','www.youtube.com','m.youtube.com','youtu.be'):
            vid=(parse_qs(p.query).get('v') or [''])[0] if p.path=='/watch' else p.path.split('/')[-1]
            if not re.fullmatch(r'[A-Za-z0-9_-]{11}',vid):raise ValueError('Нужна ссылка на одно видео YouTube.')
            r=subprocess.run([sys.executable,'-m','yt_dlp','--ignore-config','--no-playlist','--no-progress','--print-to-file','before_dl:%(filesize,filesize_approx)s',str(folder/'.download-size'),'--max-filesize',str(limit),'--socket-timeout','15','--retries','1','--match-filter','!is_live','-f','bv[height<=720][ext=mp4]+ba[ext=m4a]/b[ext=mp4]','--merge-output-format','mp4','-o',str(folder/'download.%(ext)s'),'--','https://www.youtube.com/watch?v='+vid],capture_output=True,timeout=900)
            video=folder/'download.mp4'
            if r.returncode and any(word in r.stderr.decode(errors='replace').lower() for word in ('timed out','network is unreachable','temporary failure','name resolution','remote end closed connection','connection reset','connection refused')):
                raise DownloadUnavailable()
            if r.returncode or not video.exists() or video.stat().st_size>LIMIT:raise ValueError('Не удалось скачать видео YouTube. Проверьте доступ без входа или выберите файл.')
            video.rename(folder/'input')
            return
        rc,code,target,mime,body=_curl_once(url,folder,limit,body_name='input')
        if not rc and code.startswith('3') and target:
            url=target;continue
        if rc or code!='200' or 'text/html' in mime.lower():raise ValueError('Ссылка должна открывать видео для скачивания. Для закрытой записи выберите файл.')
        if not body.exists() or body.stat().st_size>LIMIT:raise ValueError('Размер видео превышает 2 ГиБ.')
        return
    raise ValueError('Слишком много переадресаций.')
