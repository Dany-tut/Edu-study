#!/usr/bin/env python3
"""Превью ссылок на тесты для мессенджеров.

Telegram/WhatsApp не видят часть адреса после «#», поэтому у всех ссылок
вида /#/diagnostic?subject=… одно и то же превью от index.html. Короткая
ссылка /t/<id> (rewrite в vercel.json) отдаёт маленькую страницу со своими
og-тегами и сразу уводит в тест.

Источник — src/data/testPreviews.json (его же читает diagShareUrl в приложении).
Пишет public/t/<id>.html и public/og/<id>.png (1200×630).

    python3 scripts/buildTestPreviews.py
"""
import html
import re
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'https://edu-study-app.vercel.app'
FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
W, H = 1200, 630
ACCENT = (34, 197, 94)       # #22c55e — акцент тестов Линии 1
INK = (17, 17, 19)
MUTED = (110, 110, 118)
BG = (245, 245, 246)


def font(size, bold=False):
    return ImageFont.truetype(FONT, size, index=1 if bold else 0)


def plural_tasks(n):
    if n % 10 == 1 and n % 100 != 11:
        return f'{n} задание'
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return f'{n} задания'
    return f'{n} заданий'


def wrap(draw, text, fnt, width):
    # «часть 2» — одно слово: номер не должен повиснуть на отдельной строке.
    # Короткий союз/предлог тоже едет со следующим словом («и селекции»).
    glued = re.sub(r'часть (\d+)', 'часть\u00a0\\1', text)
    glued = re.sub(r'(?<=\s)(и|в|во|на|по|с|о|к|у|а) ', '\\1\u00a0', glued)
    words = glued.split(' ')

    def greedy(w):
        lines, cur = [], ''
        for word in words:
            probe = f'{cur} {word}'.strip()
            if not cur or draw.textlength(probe, font=fnt) <= w:
                cur = probe
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
        return lines

    # Выравниваем строки: самая узкая ширина при том же числе строк,
    # чтобы последняя строка не была огрызком.
    lines = greedy(width)
    lo, hi = 0, width
    while hi - lo > 4:
        mid = (lo + hi) / 2
        if len(greedy(mid)) <= len(lines):
            hi = mid
        else:
            lo = mid
    return greedy(hi)


def render(test, out):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    pad = 100

    # Белая карточка с зелёной полосой слева
    d.rounded_rectangle((40, 40, W - 40, H - 40), radius=36, fill=(255, 255, 255))
    d.rounded_rectangle((72, 96, 84, H - 96), radius=6, fill=ACCENT)

    # Чип
    chip = 'ЕГЭ · Биология · Линия 1'
    cf = font(30, bold=True)
    cw = d.textlength(chip, font=cf)
    d.rounded_rectangle((pad + 20, 96, pad + 20 + cw + 44, 150), radius=27, fill=(220, 252, 231))
    d.text((pad + 42, 123), chip, font=cf, fill=(21, 128, 61), anchor='lm')

    # Заголовок: подбираем кегль, чтобы влезть в 3 строки
    title_w = W - 2 * pad - 40
    # Сначала пробуем уложиться в 2 строки, иначе 3 строки мельче —
    # чтобы заголовок не подпирал подпись внизу.
    for size, max_lines in ((78, 2), (70, 2), (64, 2), (60, 3)):
        tf = font(size, bold=True)
        lines = wrap(d, test['title'], tf, title_w)
        if len(lines) <= max_lines:
            break
    y = 200
    for line in lines:
        d.text((pad + 20, y), line, font=tf, fill=INK)
        y += int(size * 1.18)

    # Низ: что внутри + бренд
    d.text((pad + 20, H - 110), f"{plural_tasks(test['count'])} · впиши термин в таблицу",
           font=font(32), fill=MUTED, anchor='lm')
    icon = Image.open(ROOT / 'public/apple-touch-icon.png').convert('RGBA').resize((56, 56))
    mask = Image.new('L', (56, 56), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 56, 56), radius=14, fill=255)
    bf = font(34, bold=True)
    bx = W - pad - 20 - d.textlength('Искра', font=bf)
    img.paste(icon, (int(bx) - 72, H - 138), mask)
    d.text((bx, H - 110), 'Искра', font=bf, fill=INK, anchor='lm')

    img.save(out, optimize=True)


PAGE = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Искра">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{image}">
<link rel="icon" type="image/svg+xml" href="/icon.svg?v=2">
<script>
  // Лишние параметры короткой ссылки (?assignment=…) едут в тест как есть.
  var extra = location.search ? '&' + location.search.slice(1) : '';
  location.replace('/#/diagnostic?subject={id}' + extra);
</script>
</head>
<body style="background:#F5F5F6;font:16px -apple-system,system-ui,sans-serif">
<p style="text-align:center;margin-top:40vh"><a href="/#/diagnostic?subject={id}">Открыть тест</a></p>
</body>
</html>
"""


def main():
    tests = json.loads((ROOT / 'src/data/testPreviews.json').read_text())
    (ROOT / 'public/t').mkdir(parents=True, exist_ok=True)
    (ROOT / 'public/og').mkdir(parents=True, exist_ok=True)
    for t in tests:
        render(t, ROOT / f"public/og/{t['id']}.png")
        page = PAGE.format(
            id=t['id'],
            title=html.escape(re.sub(r'часть (\d+)', 'часть\u00a0\\1', t['title']) + ' — тест по\u00a0биологии'),
            desc=html.escape(f"Линия 1 ЕГЭ · {plural_tasks(t['count'])}: впиши пропущенный термин в таблицу"),
            url=f"{ORIGIN}/t/{t['id']}",
            image=f"{ORIGIN}/og/{t['id']}.png?v=3",
        )
        (ROOT / f"public/t/{t['id']}.html").write_text(page)
    print(f'{len(tests)} превью')


if __name__ == '__main__':
    main()
