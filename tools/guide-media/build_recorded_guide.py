"""Edit the three user-supplied recordings. Sources stay outside the repository."""
from pathlib import Path
import subprocess,sys
from PIL import Image,ImageDraw,ImageFont
raw=Path(sys.argv[1]); dest=Path(sys.argv[2]); work=Path(sys.argv[3]);work.mkdir(parents=True,exist_ok=True);dest.mkdir(parents=True,exist_ok=True)
font='/System/Library/Fonts/Supplemental/Arial.ttf'
def src(tag):return next(p for p in raw.glob('*.mov') if tag in p.name)
def run(args):subprocess.run(['ffmpeg','-y','-v','error',*args],check=True)
clips=[]; durations=[]
def scene(tag,start,length,speed,title,note,masks=(),focus=None):
 n=len(clips);cap=work/f'caption-{n}.png';panel=Image.new('RGBA',(1280,900));d=ImageDraw.Draw(panel)
 d.rectangle((0,0,1280,56),fill='#191625');d.rectangle((0,844,1280,900),fill='#191625')
 d.text((28,15),title,font=ImageFont.truetype(font,25),fill='#ffffff');d.text((28,862),note,font=ImageFont.truetype(font,21),fill='#dfd5fa');panel.save(cap)
 base=f'[0:v]setpts=(PTS-STARTPTS)/{speed},scale=1280:788'
 # Маска закрашивается цветом фона под ней: x,y,w,h,цвет[,с,по] — секунды
 # сцены, если строка в кадре сдвигается. Иначе пятно видно.
 for x,y,w,h,color,*span in masks:
  when=f":enable='between(t,{span[0]},{span[1]})'" if span else ''
  base+=f',drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill{when}'
 # Keep full display context, with a restrained focus move after the first second.
 if focus:
  x,y=focus;base+=f",fps=12,zoompan=z='1+0.09*min(max((on-12)/24,0),1)':x='{x}*(1-1/zoom)':y='{y}*(1-1/zoom)':d=1:s=1280x788:fps=12"
 base+='[picture];[picture]pad=1280:900:0:56:color=0x191625[canvas];[canvas][1:v]overlay=0:0,setsar=1[out]'
 target=work/f'clip-{n}.mp4'
 if '--cached' in sys.argv and target.exists():
  updated=work/f'updated-{n}.mp4'
  run(['-i',str(target),'-loop','1','-i',str(cap),'-filter_complex','[0:v][1:v]overlay=0:0','-an','-t',str(length/speed),'-c:v','libx264','-crf','20','-pix_fmt','yuv420p',str(updated)])
  updated.replace(target)
 else: run(['-ss',str(start),'-t',str(length),'-i',str(src(tag)),'-loop','1','-i',str(cap),'-filter_complex',base,'-map','[out]','-an','-t',str(length/speed),'-r','12','-c:v','libx264','-crf','20','-pix_fmt','yuv420p',str(target)])
 clips.append(target);durations.append(length/speed)
# Ник в профиле не прячем. Маскируем email в карточке Тестли, личные папки
# в Finder и путь с именем Mac в Терминале — до зума.
card='0xf6f6f9'; finder_bg='0x262426'; sidebar='0x222222'; term='0x1e1e1e'
finder=[(290,684,170,20,card),(128,340,150,28,sidebar),(294,279,201,39,finder_bg),(294,462,201,52,finder_bg),(300,515,600,28,finder_bg)]
scene('12.29.36',0,6,1,'1 / 7   Скачайте модуль в профиле Искры','Интеграции → Расшифровка уроков → Скачать для Mac.',[(290,685,170,20,card,0,1.04),(290,449,170,20,card,1.04,5.04),(290,685,170,20,card,5.04,6)])
scene('12.29.36',8,6,1,'2 / 7   Откройте архив и start.command','В Finder: Загрузки → папка Iskra → двойной клик по start.command.',finder,(600,390))
scene('12.29.36',22,11,1,'3 / 7   Разрешите запуск в настройках macOS','Только для скачанного из Искры файла: «Все равно открыть» и подтверждение.',[],(450,350))
scene('12.29.36',39,4,1,'Модуль уже запущен? Второй запуск не нужен','«Address already in use» — порт занят. Вернитесь к работающему модулю.',[(140,94,300,20,'0x2b2b2b'),(75,124,510,38,term)],(350,270))
# С 46.9 с: раньше в кадре виден старый GIF этой же инструкции.
scene('12.29.36',46.9,2.6,1,'4 / 7   Вернитесь в Искру и подключите компьютер','Нажмите «Подключить компьютер». Затем откройте запись урока.',[(290,516,170,20,card)])
scene('12.31.00',0,12,1,'5 / 7   Запустите расшифровку записи','Конструктор → курс → урок → Запись → Расшифровать видео.',[],(670,400))
scene('12.31.00',12,176,16,'Идёт обработка на Mac','Ожидание ускорено ×16: видео → речь → слайды → главы.',[],(670,350))
scene('12.31.00',188,13,1,'6 / 7   Проверьте готовый текст и главы','Исправьте названия и реплики перед сохранением.',[],(680,480))
scene('12.34.52',25,14,1.4,'7 / 7   Проверьте таймкоды — готово','«Добавлено в урок» означает, что расшифровка сохранена.',[],(700,490))
(work/'concat.txt').write_text(''.join(f"file '{p}'\n" for p in clips))
inputs=[]
for path in clips:inputs+=['-i',str(path)]
filters='';prev='0:v';offset=durations[0]
for i in range(1,len(clips)):
 offset-=0.25
 filters+=f'[{prev}][{i}:v]xfade=transition=fade:duration=0.25:offset={offset}[v{i}];'
 prev=f'v{i}';offset+=durations[i]
run([*inputs,'-filter_complex',filters.rstrip(';'),'-map',f'[{prev}]','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(dest/'mac-launch-recorded.mp4')])
run(['-i',str(dest/'mac-launch-recorded.mp4'),'-frames:v','1',str(dest/'mac-launch-recorded.jpg')])
