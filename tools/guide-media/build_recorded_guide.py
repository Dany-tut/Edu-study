"""Монтаж инструкции «Запуск на Mac» из трёх записей экрана (они лежат вне репо).

python3 build_recorded_guide.py <папка с .mov> <public/guides> <рабочая папка>

Кадр — запись на весь экран, без тёмных полос. Поверх:
  • стеклянная таблетка шага сверху слева (номер, заголовок, точки прогресса);
  • стеклянная таблетка подсказки снизу;
  • фиолетовая рамка со свечением там, куда нажимать, и стрелка к ней от таблетки.
Стекло настоящее: под таблеткой размыт сам кадр (gblur + маска).
"""
from pathlib import Path
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

raw, dest, work = (Path(a) for a in sys.argv[1:4])
work.mkdir(parents=True, exist_ok=True); dest.mkdir(parents=True, exist_ok=True)
W, H, FPS, SS = 1280, 788, 24, 2          # SS — суперсэмплинг подложек
ACCENT = (120, 106, 215)                  # #786AD7, акцент Искры
INK, MUTED = (29, 26, 43), (64, 58, 84)
SF = '/System/Library/Fonts/SFNS.ttf'
TOTAL = 7

def font(size, weight):
    f = ImageFont.truetype(SF, size * SS); f.set_variation_by_name(weight); return f

def src(tag): return next(p for p in raw.glob('*.mov') if tag in p.name)
def run(args): subprocess.run(['ffmpeg', '-y', '-v', 'error', *args], check=True)
def rr(d, box, r, **kw): d.rounded_rectangle([v * SS for v in box], r * SS, **kw)
def text_w(f, s): return f.getlength(s) / SS

def pill(over, mask, box):
    """Стеклянная таблетка: тень, светлая вуаль, тонкая обводка. В mask — где размыть кадр."""
    x, y, w, h = box; r = h / 2
    shadow = Image.new('RGBA', over.size); rr(ImageDraw.Draw(shadow), (x, y + 6, x + w, y + h + 6), r, fill=(20, 16, 40, 60))
    over.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14 * SS)))
    d = ImageDraw.Draw(over)
    rr(d, (x, y, x + w, y + h), r, fill=(255, 255, 255, 168), outline=(255, 255, 255, 235), width=SS)
    rr(d, (x - 0.5, y - 0.5, x + w + 0.5, y + h + 0.5), r + 0.5, outline=(30, 24, 60, 22), width=SS)
    rr(ImageDraw.Draw(mask), (x, y, x + w, y + h), r, fill=255)

def step_pill(over, mask, n, title):
    """n — номер шага; строка вместо числа — промежуточная сцена (значок в кружке)."""
    tf = font(19, 'Semibold')
    h, pad, c = 52, 8, 36
    dots_w = TOTAL * 7 + (TOTAL - 1) * 5 + 11
    w = pad + c + 12 + text_w(tf, title) + 18 + dots_w + 16
    x, y = 22, 22
    pill(over, mask, (x, y, w, h))
    d = ImageDraw.Draw(over)
    cx, cy = x + pad, y + (h - c) / 2
    rr(d, (cx, cy, cx + c, cy + c), c / 2, fill=ACCENT + (255,))
    numbered = isinstance(n, int)
    d.text(((cx + c / 2) * SS, (cy + c / 2) * SS), str(n), font=font(17 if numbered else 14, 'Bold'), fill='white', anchor='mm')
    tx = cx + c + 12
    d.text((tx * SS, (y + h / 2) * SS), title, font=tf, fill=INK, anchor='lm')
    dx = tx + text_w(tf, title) + 18
    for i in range(1, TOTAL + 1):
        on = numbered and n == i; done = numbered and i < n
        dw = 18 if on else 7
        color = ACCENT + (255,) if on else ACCENT + (120,) if done else (90, 84, 120, 70)
        rr(d, (dx, y + h / 2 - 3.5, dx + dw, y + h / 2 + 3.5), 3.5, fill=color)
        dx += dw + 5
    return (x, y, w, h)

def note_pill(over, mask, note):
    nf = font(17, 'Medium'); h = 42; w = text_w(nf, note) + 40
    x, y = 22, H - 22 - h
    pill(over, mask, (x, y, w, h))
    ImageDraw.Draw(over).text(((x + 20) * SS, (y + h / 2) * SS), note, font=nf, fill=MUTED, anchor='lm')
    return (x, y, w, h)

def highlight(rect, anchors):
    """Рамка со свечением + изогнутая стрелка от ближайшей таблетки к рамке."""
    img = Image.new('RGBA', (W * SS, H * SS))
    x, y, w, h = rect; p = 6; box = (x - p, y - p, x + w + p, y + h + p)
    glow = Image.new('RGBA', img.size); rr(ImageDraw.Draw(glow), box, 14, outline=ACCENT + (200,), width=8 * SS)
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(9 * SS)))
    d = ImageDraw.Draw(img)
    rr(d, box, 14, fill=ACCENT + (26,), outline=ACCENT + (255,), width=3 * SS)
    # Стрелка: из середины ближайшего края таблетки в ближайшую точку рамки.
    best = None
    for ax, ay, aw, ah in anchors:
        for sx, sy in ((ax + aw * 0.5, ay + ah + 8), (ax + aw * 0.5, ay - 8), (ax + aw + 8, ay + ah / 2)):
            ex, ey = min(max(sx, box[0]), box[2]), min(max(sy, box[1]), box[3])
            dist = math.hypot(ex - sx, ey - sy)
            if best is None or dist < best[0]: best = (dist, sx, sy, ex, ey)
    length, sx, sy, ex, ey = best
    if length > 70:
        ux, uy = (ex - sx) / length, (ey - sy) / length
        ex, ey = ex - ux * 8, ey - uy * 8                      # не упираться в рамку
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        nx, ny = -uy, ux
        bend = 0.2 * length * (1 if nx * (W / 2 - mx) + ny * (H / 2 - my) > 0 else -1)
        cx, cy = mx + nx * bend, my + ny * bend
        pts = [((1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey)
               for t in [i / 80 for i in range(81)]]
        end, prev = pts[-1], pts[-8]
        ang = math.atan2(end[1] - prev[1], end[0] - prev[0])
        line = [(px * SS, py * SS) for px, py in pts[:-6]]
        d.line(line, fill=(255, 255, 255, 235), width=8 * SS, joint='curve')
        d.line(line, fill=ACCENT + (255,), width=4 * SS, joint='curve')
        head = [end,
                (end[0] - 17 * math.cos(ang) + 9 * math.sin(ang), end[1] - 17 * math.sin(ang) - 9 * math.cos(ang)),
                (end[0] - 17 * math.cos(ang) - 9 * math.sin(ang), end[1] - 17 * math.sin(ang) + 9 * math.cos(ang))]
        d.polygon([(a * SS, b * SS) for a, b in head], fill=ACCENT + (255,), outline=(255, 255, 255, 235), width=2 * SS)
    return img.resize((W, H), Image.LANCZOS)

clips, durations = [], []
def scene(tag, start, length, speed, n, title, note, masks=(), marks=()):
    """masks: (x,y,w,h,цвет[,с,по]) — закраска цветом фона под ней; marks: (rect, с, по) — секунды сцены."""
    i = len(clips)
    over = Image.new('RGBA', (W * SS, H * SS)); mask = Image.new('L', (W * SS, H * SS))
    anchors = [step_pill(over, mask, n, title), note_pill(over, mask, note)]
    over.resize((W, H), Image.LANCZOS).save(work / f'over-{i}.png')
    mask.resize((W, H), Image.LANCZOS).save(work / f'mask-{i}.png')
    dur = length / speed
    inputs = ['-ss', str(start), '-t', str(length), '-i', str(src(tag)),
              '-loop', '1', '-i', str(work / f'over-{i}.png'), '-loop', '1', '-i', str(work / f'mask-{i}.png')]
    chain = f'[0:v]setpts=(PTS-STARTPTS)/{speed},scale={W}:{H},fps={FPS}'
    for x, y, w, h, color, *span in masks:
        when = f":enable='between(t,{span[0]},{span[1]})'" if span else ''
        chain += f',drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill{when}'
    graph = chain + '[v];[v]split[a][b];[b]gblur=sigma=16[bl];[2:v]format=gray[m];[bl][m]alphamerge[glass];[a][glass]overlay[g0]'
    last = 'g0'
    for k, (rect, a, b) in enumerate(marks):
        highlight(rect, anchors).save(work / f'mark-{i}-{k}.png')
        inputs += ['-loop', '1', '-i', str(work / f'mark-{i}-{k}.png')]
        graph += (f';[{3 + k}:v]format=rgba,fade=t=in:st={a}:d=0.3:alpha=1,fade=t=out:st={max(a, b - 0.3)}:d=0.3:alpha=1[h{k}]'
                  f";[{last}][h{k}]overlay=enable='between(t,{a},{b})'[g{k + 1}]")
        last = f'g{k + 1}'
    graph += f';[{last}][1:v]overlay,setsar=1[out]'
    target = work / f'clip-{i}.mp4'
    run([*inputs, '-filter_complex', graph, '-map', '[out]', '-an', '-t', str(dur), '-r', str(FPS),
         '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', str(target)])
    clips.append(target); durations.append(dur)

# Закраска — цветом фона под ней: ник — в цвет страницы, email в карточке
# Тестли — в цвет карточки, личные папки Finder и путь с именем Mac — в цвет окна.
page, card, finder_bg, sidebar, term = '0xf2f2f4', '0xf6f6f9', '0x262426', '0x222222', '0x1e1e1e'
nick = (276, 141, 66, 20, page)
finder = [nick, (290, 684, 170, 20, card), (128, 340, 150, 28, sidebar), (294, 279, 201, 39, finder_bg),
          (294, 462, 201, 52, finder_bg), (300, 515, 600, 28, finder_bg)]
scene('12.29.36', 0, 6, 1, 1, 'Скачайте модуль в профиле Искры', 'Профиль → Интеграции → Расшифровка уроков → Скачать для Mac',
      [nick, (290, 685, 170, 20, card, 0, 1.04), (290, 449, 170, 20, card, 1.04, 5.04), (290, 685, 170, 20, card, 5.04, 6)],
      [((778, 44, 304, 58), 1.2, 5.0)])
scene('12.29.36', 8, 6, 1, 2, 'Откройте архив и start.command', 'Загрузки → папка Iskra → двойной клик по start.command',
      finder, [((505, 410, 185, 22), 0.1, 1.6), ((504, 331, 238, 24), 2.8, 5.6)])
scene('12.29.36', 22, 11, 1, 3, 'Разрешите запуск в настройках Mac', 'Конфиденциальность и безопасность → «Все равно открыть»',
      [], [((622, 343, 128, 26), 0.6, 6.8), ((504, 342, 238, 28), 7.1, 10.0)])
scene('12.29.36', 39, 4, 1, '!', 'Модуль уже запущен', '«Address already in use» — второй запуск не нужен, вернитесь в Искру',
      [(140, 94, 300, 20, '0x2b2b2b'), (75, 124, 510, 38, term)], [((74, 184, 420, 36), 0.3, 4)])
# С 46.9 с: раньше в кадре виден старый GIF этой же инструкции.
scene('12.29.36', 46.9, 2.6, 1, 4, 'Подключите компьютер', 'Появится «Доступ сохранён» — модуль на связи',
      [nick, (290, 516, 170, 20, card)], [((924, 267, 108, 22), 0.2, 2.6)])
scene('12.31.00', 0, 12, 1, 5, 'Запустите расшифровку записи', 'Конструктор → урок → Запись → Расшифровать видео',
      [], [((709, 613, 255, 36), 0, 1.4), ((268, 348, 708, 34), 1.5, 2.6), ((264, 330, 716, 176), 2.9, 12)])
scene('12.31.00', 12, 176, 16, '×16', 'Идёт обработка на Mac', 'Видео → речь → слайды → главы. Ожидание ускорено в 16 раз',
      [], [((264, 330, 716, 176), 0.2, 11)])
scene('12.31.00', 188, 13, 1, 6, 'Проверьте текст и главы', 'Поправьте названия глав и реплики, затем сохраните',
      [], [((680, 284, 292, 380), 0.3, 13)])
scene('12.34.52', 25, 14, 1.4, 7, 'Готово: главы в уроке', '«Добавлено в урок» — расшифровка сохранена',
      [], [((690, 620, 240, 80), 0.3, 10)])

inputs = []
for path in clips: inputs += ['-i', str(path)]
filters = ''; prev = '0:v'; offset = durations[0]
for i in range(1, len(clips)):
    offset -= 0.3
    filters += f'[{prev}][{i}:v]xfade=transition=fade:duration=0.3:offset={offset}[v{i}];'
    prev = f'v{i}'; offset += durations[i]
run([*inputs, '-filter_complex', filters.rstrip(';'), '-map', f'[{prev}]', '-c:v', 'libx264', '-crf', '21',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dest / 'mac-launch-recorded.mp4')])
run(['-ss', '3', '-i', str(dest / 'mac-launch-recorded.mp4'), '-frames:v', '1', '-q:v', '3', str(dest / 'mac-launch-recorded.jpg')])
