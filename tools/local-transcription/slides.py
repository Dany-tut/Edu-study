"""Detect persistent printed headings using local OCR on sampled frames."""
import json, os, re, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path
from media_tools import FFMPEG, duration as media_duration
from progress import record
import frame_ocr
from slide_chapters import heading as pick_heading, meaningful as title_like

source, dest=map(Path,sys.argv[1:])
safe=['-protocol_whitelist','file,pipe','-format_whitelist','mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac']
# Чтение слайдов — необязательный этап: нет хелпера Vision (ISKRA_FRAME_TEXT)
# или не удалось узнать длительность — просто нет заголовков, расшифровка цела.
# Хелпер из .app ≤ 1.0.8 читает только латиницу и отдаёт строки без геометрии:
# его вывод проходит тот же фильтр мусора, но без выбора по размеру.
frame_text=os.environ.get('ISKRA_FRAME_TEXT')
vision=frame_ocr.helper()
try:
    duration=media_duration(source, safe)
except ValueError:
    duration=0.0
if not frame_text or duration<=0:
    dest.write_text('[]')
    sys.exit(0)
step=max(4,int(duration/240))
pending=None
last=''
slides=[]
def similar(a,b):
    return SequenceMatcher(None,a.casefold(),b.casefold()).ratio()>=.76
def meaningful(line):
    letters=[c for c in line.casefold() if c.isalpha()]
    return (4<=len(line)<=90 and len(set(letters))>=3 and
            sum(c not in 'ilı' for c in letters)>=3 and all(c.isprintable() for c in line))

times=range(0,int(duration),step)
for index,t in enumerate(times):
    record(dest.parent,'Читаем слайды',index,len(times),'frames')
    image=subprocess.run([FFMPEG,'-nostdin','-v','error',*safe,'-ss',str(t),'-i',str(source),'-frames:v','1','-vf','scale=min(1000\\,iw):-2','-f','image2pipe','-c:v','mjpeg','-'],capture_output=True,timeout=30)
    if not image.stdout: continue
    if vision:
        # Заголовок — крупный текст в верхней части кадра; хром записи экрана отсекается.
        rows=[row for row in frame_ocr.read_image(vision,image.stdout) if row['y']<.45]
        heading=pick_heading(rows)
    else:
        try:
            out=subprocess.run([frame_text],input=image.stdout,capture_output=True,timeout=15)
            lines=[line for line in json.loads(out.stdout) if isinstance(line,str)]
        except (ValueError,TypeError,OSError,subprocess.SubprocessError):lines=[]
        heading=next((line for line in lines[:3] if meaningful(line) and title_like(line)), '')
    if heading and pending and similar(heading,pending[1]) and not similar(heading,last):
        slides.append(dict(start=pending[0],text=heading))
        last=heading
    pending=(t,heading) if heading else None
dest.write_text(json.dumps(slides,ensure_ascii=False))
