#!/usr/bin/env python3
"""Сторож предоценки ДЗ Искры на Маке: работы по химии и биологии оценивает
Claude Code по подписке Дани.

Раз в полминуты спрашивает Edge Function hw-grade, есть ли сданные работы
(action queue). Есть — берёт по одной (claim), запускает `claude -p` с чтением
базы ChemBio_KB и сдаёт ответ по критериям ФИПИ (result). Балл считает функция.
Системный промпт и схему ответа присылает функция (supabase/functions/hw-grade/
grader.ts) — те же пойдут в Claude API, когда появится ключ.

Адрес и секрет — ~/.config/iskra/hw-grade.json: {"url": "…/functions/v1/hw-grade", "secret": "…"}.
Запуск: launchd, com.dany.iskra-hw-grade (scripts/hw-grade/com.dany.iskra-hw-grade.plist).
Разово: python3 scripts/hw-grade/hw-grade-watch.py --once
"""
import base64
import datetime as dt
import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

CONF = json.loads((Path.home() / ".config/iskra/hw-grade.json").read_text())
CLAUDE = "/usr/local/bin/claude"
MODEL = "opus"
KB = Path.home() / "Cursor/ChemBio_KB"
LOG = Path.home() / "Library/Logs/iskra-hw-grade.log"
# у каждой работы своя пустая папка: там только фото и доска решения, Claude Code
# не подхватывает чужие CLAUDE.md и настройки; база — через --add-dir, на чтение
WORK = Path.home() / "Library/Caches/iskra-hw-grade"
PERIOD = 30
# функция вернёт работу в очередь через 40 минут — дольше ждать нет смысла
TIMEOUT = 30 * 60


def log(msg: str):
    with LOG.open("a") as f:
        f.write(f"{dt.datetime.now():%Y-%m-%d %H:%M:%S} {msg}\n")


def call(body: dict):
    req = urllib.request.Request(CONF["url"], data=json.dumps(body).encode(), method="POST",
                                 headers={"x-hw-grade-secret": CONF["secret"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def ask_claude(system: str, prompt: str, schema: dict, cwd: Path) -> dict:
    """Claude Code без окна: ответ — JSON по схеме. Ошибка — исключение с понятным текстом."""
    args = [CLAUDE, "-p", prompt, "--output-format", "json", "--json-schema", json.dumps(schema),
            "--model", MODEL, "--system-prompt", system, "--add-dir", str(KB),
            "--allowedTools", "Read", "Grep", "Glob"]
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT)
    try:
        out = json.loads(p.stdout)
    except ValueError:
        raise RuntimeError(f"claude ответил не JSON (код {p.returncode}): {p.stderr[-300:] or p.stdout[-300:]}")
    if out.get("is_error"):
        raise RuntimeError(f"claude: {str(out.get('result'))[:300]}")
    got = out.get("structured_output")
    if got is None:
        got = json.loads(out.get("result") or "null")
    if not isinstance(got, dict):
        raise RuntimeError("claude не вернул оценку")
    return got


def grade(task: dict, system: str, schema: dict):
    try:
        claimed = call({"action": "claim", "id": task["id"]})
    except urllib.error.HTTPError as e:
        if e.code == 409:
            return  # уже взяли
        raise
    # фото и доска решения — файлами в папку работы: Claude читает их через Read
    cwd = WORK / task["id"]
    shutil.rmtree(cwd, ignore_errors=True)
    cwd.mkdir(parents=True)
    for img in claimed.get("images", []):
        name = Path(img["name"]).name  # имя с сервера — только имя файла, без пути
        (cwd / name).write_bytes(base64.b64decode(img["data"]))
    log(f"оценка {task['id']} (картинок: {len(claimed.get('images', []))})")
    t0 = time.time()
    try:
        result = ask_claude(system, task["prompt"], schema, cwd)
        got = call({"action": "result", "id": task["id"], "result": result, "model": f"claude-code:{MODEL}"})
        log(f"готово {task['id']}: {got.get('primary')}/{got.get('max')} → {got.get('score')} за {int(time.time() - t0)} с")
    except subprocess.TimeoutExpired:
        log(f"не уложился {task['id']}")
        call({"action": "result", "id": task["id"], "error": "Оценка шла слишком долго."})
    except urllib.error.HTTPError as e:
        log(f"функция не приняла {task['id']}: {e.code} {e.read()[:300]!r}")
    except (RuntimeError, ValueError) as e:
        log(f"ошибка {task['id']}: {e}")
        call({"action": "result", "id": task["id"], "error": "Claude не справился с оценкой."})
    finally:
        shutil.rmtree(cwd, ignore_errors=True)  # фото учеников на Маке не копим


def tick():
    q = call({"action": "queue"})
    for task in q.get("tasks", []):
        grade(task, q["system"], q["schema"])


if __name__ == "__main__":
    if "--once" in sys.argv:
        tick()
        sys.exit()
    log("сторож запущен")
    while True:
        try:
            tick()
        except (urllib.error.URLError, OSError, ValueError) as e:  # сеть пропала — подождём
            log(f"функция недоступна: {e}")
        time.sleep(PERIOD)
