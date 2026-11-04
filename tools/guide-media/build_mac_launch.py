"""Montage of full-display captures and supplied full-screen stills.
Raw inputs stay local; every frame is redacted before zoom or export.
"""
from pathlib import Path
import subprocess,sys
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[2]
raw=Path(sys.argv[1]); out=root/'public/guides'; temp=raw/'render';temp.mkdir(exist_ok=True)
font='/System/Library/Fonts/Supplemental/Arial.ttf'
def run(args):subprocess.run(['ffmpeg','-y','-v','error',*args],check=True)
def boxes(rects,color='0x252525'):
 return ','.join(f'drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill' for x,y,w,h in rects)
def isolate(rects):
 # Coarse pixelation + blur makes all unrelated windows unreadable.
 n=len(rects);f=f'[0:v]scale=1280:832,split={n+1}[bg]'+''.join(f'[r{i}]' for i in range(n))+';[bg]scale=32:21,scale=1280:832:flags=neighbor,boxblur=18[blur];'
 prev='blur'
 for i,(x,y,w,h) in enumerate(rects):
  f+=f'[r{i}]crop={w}:{h}:{x}:{y}[c{i}];[{prev}][c{i}]overlay={x}:{y}[o{i}];';prev=f'o{i}'
 return f,prev
clips=[]
def clip(name,file,seconds,title,note='',start=0,still=False,regions=None,redact=[],zoom=1.15):
 caption=temp/(name+'-caption.png')
 panel=Image.new('RGBA',(1280,832));draw=ImageDraw.Draw(panel)
 draw.rectangle((0,0,1280,100),fill='#171522');draw.rectangle((0,752,1280,832),fill='#171522')
 draw.text((32,25),title,font=ImageFont.truetype(font,30),fill='white')
 draw.text((32,775),note,font=ImageFont.truetype(font,23),fill='white')
 panel.save(caption)
 args=['-loop','1','-i',str(file)] if still else ['-ss',str(start),'-i',str(file)]
 if regions:f,prev=isolate(regions)
 else:f='[0:v]scale=1280:832[v];';prev='v'
 mask=boxes(redact)
 if mask:f+=f'[{prev}]{mask}[masked];';prev='masked'
 # Start on the whole display, gently zoom towards the task; keep large context.
 z=f'1+{zoom-1}*min(max((on-16)/24,0),1)'
 f+=f"[{prev}]fps=8,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x832:fps=8[zoom];[zoom][1:v]overlay=0:0,setsar=1[out]"
 args+=['-loop','1','-i',str(caption)]
 dest=temp/(name+'.mp4');run([*args,'-filter_complex',f,'-map','[out]','-an','-t',str(seconds),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',str(dest)]);clips.append(dest)
clip('01-unzip',raw/'native.mov',10,'1. Откройте ZIP в «Загрузках», затем папку Iskra','Архив уже скачан из профиля Искры.',regions=[(124,214,780,374)],redact=[(150,367,85,24),(300,536,570,25)])
clip('02-start',raw/'native.mov',8,'2. Дважды нажмите start.command','Если macOS заблокировала файл — нажмите «Готово».',start=12,regions=[(124,214,780,374)],redact=[(150,367,85,24),(300,536,570,25)])
clip('03-security',raw/'security-clean.mov',4,'3. Настройки → Конфиденциальность и безопасность','Для start.command из Искры: «Все равно открыть», затем подтверждение.',regions=[(56,210,734,524),(512,150,260,320)],zoom=1.05)
clip('04-terminal',raw/'terminal-source.png',7,'4. Дождитесь строки Running on','Оставьте Терминал открытым до конца обработки.',still=True,redact=[(0,0,1280,64),(0,60,36,772),(190,154,350,22),(110,182,490,39),(955,80,285,55)],zoom=1.12)
clip('05-connect',raw/'connected-source.png',6,'5. Вернитесь в Искру → «Подключить компьютер»','«Доступ сохранён» подтверждает привязку. Терминал должен работать.',still=True,redact=[(0,0,1280,64),(0,60,36,772),(300,184,170,38),(280,595,700,237)],zoom=1.08)
clip('06-process',raw/'transcription.mov',10,'6. Конструктор → курс → урок → «Запись»','Нажмите «Начать расшифровку» и дождитесь текста и глав.',redact=[(0,0,1280,64),(0,60,36,772)],zoom=1.12)
clip('07-result',raw/'result-window.png',9,'7. Готово: проверьте реплики и названия глав','Текст можно исправить. Таймкоды и названия глав тоже редактируются.',still=True,redact=[(0,0,1280,60),(0,60,36,772),(320,270,470,32)],zoom=1.04)
clip('08-save',raw/'result-window.png',7,'8. После проверки — «Сохранить расшифровку»','В опубликованном курсе сохранение обновит материал для учеников.',still=True,redact=[(0,0,1280,60),(0,60,36,772),(320,270,470,32)],zoom=1.04)
(temp/'concat.txt').write_text(''.join(f"file '{p}'\n" for p in clips))
run(['-reinit_filter','0','-f','concat','-safe','0','-i',str(temp/'concat.txt'),'-vf','setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709','-c:v','libx264','-pix_fmt','yuv420p','-preset','fast',str(temp/'montage.mp4')])
run(['-i',str(temp/'montage.mp4'),'-filter_complex','[0:v]fps=6,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none','-loop','0',str(out/'mac-launch-full.gif')])
run(['-i',str(temp/'montage.mp4'),'-frames:v','1',str(out/'mac-launch-full.jpg')])
print(out/'mac-launch-full.gif',flush=True)
