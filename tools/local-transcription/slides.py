"""Detect persistent printed headings using local OCR on sampled frames."""
import json, os, re, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path
from progress import record

source, dest=map(Path,sys.argv[1:])
safe=['-protocol_whitelist','file,pipe','-format_whitelist','mov,matroska,webm,avi,mpeg,mpegts,asf,flv,ogg,wav,mp3,aac,flac']
duration=float(subprocess.check_output(['ffprobe','-v','error',*safe,'-show_entries','format=duration','-of','csv=p=0',str(source)]))
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
    image=subprocess.run(['ffmpeg','-nostdin','-v','error',*safe,'-ss',str(t),'-i',str(source),'-frames:v','1','-vf','scale=min(1000\\,iw):-2','-f','image2pipe','-c:v','mjpeg','-'],capture_output=True,timeout=30)
    if not image.stdout: continue
    try:
        out=subprocess.run([os.environ["ISKRA_FRAME_TEXT"]],input=image.stdout,capture_output=True,timeout=4)
        lines=json.loads(out.stdout)
    except (ValueError,subprocess.TimeoutExpired):lines=[]
    heading=next((line for line in lines[:3] if meaningful(line)), '')
    if heading and pending and similar(heading,pending[1]) and not similar(heading,last):
        slides.append(dict(start=pending[0],text=heading))
        last=heading
    pending=(t,heading) if heading else None
dest.write_text(json.dumps(slides,ensure_ascii=False))
