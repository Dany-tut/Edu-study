"""Где взять ffmpeg и как спросить длительность записи.

Архив модуля несёт рядом с этим файлом статический ffmpeg для Apple Silicon,
поэтому расшифровка работает на Mac без Homebrew и без `brew install ffmpeg`.
Порядок поиска: путь из env (ISKRA_FFMPEG) → вложенный бинарник → системный из
PATH. Во время разработки в репозитории вложенного бинарника нет (лежит только
ffmpeg.gz, его разворачивает сборщик архива), поэтому берётся системный.
"""
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _resolve(name, env):
    override = os.environ.get(env)
    if override and Path(override).exists():
        return override
    bundled = ROOT / name
    if bundled.exists():
        return str(bundled)
    found = shutil.which(name)
    if found:
        return found
    return name  # последний шанс: PATH во время запуска; иначе — понятная ошибка вызова


FFMPEG = _resolve('ffmpeg', 'ISKRA_FFMPEG')

# Длительность берём из самого ffmpeg, чтобы не тащить в архив ещё и ffprobe:
# `ffmpeg -i` печатает «Duration: HH:MM:SS.ss» в stderr (на уровне info, поэтому
# без -v error). Выход у такого вызова ненулевой — файла назначения нет, — но
# строка Duration печатается раньше, её и разбираем.
_DURATION = re.compile(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)')


def duration(path, whitelist=()):
    out = subprocess.run([FFMPEG, '-nostdin', '-hide_banner', *whitelist, '-i', str(path)],
                         capture_output=True, text=True)
    match = _DURATION.search(out.stderr)
    if not match:
        raise ValueError('Не удалось определить длительность записи.')
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
