"""Telegram Bot API, один polling-процесс и локальная очередь SQLite."""
import subprocess
from invites import Invites
import argparse
import fcntl
import json
import mimetypes
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from flow import CARDS, LABELS, ROOT, initial, payload, transition, view

MEDIA = ROOT / "media"
UPLOADS = {"sendPhoto": "photo", "sendDocument": "document"}
REPLAY = {"photo": "sendPhoto", "video": "sendVideo", "voice": "sendVoice",
          "video_note": "sendVideoNote", "document": "sendDocument", "audio": "sendAudio"}


def database(path):
    db = sqlite3.connect(path)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS phone_tests(chat INTEGER PRIMARY KEY, test_id INTEGER NOT NULL, backup TEXT);
        CREATE TABLE IF NOT EXISTS pilot_members(chat INTEGER PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS sessions(chat INTEGER PRIMARY KEY, state TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS saved_roles(chat INTEGER, role TEXT, state TEXT NOT NULL, PRIMARY KEY(chat,role));
        CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, chat INTEGER, data TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS cursor(next_update INTEGER NOT NULL);
        INSERT INTO cursor SELECT 0 WHERE NOT EXISTS(SELECT 1 FROM cursor);
        CREATE TABLE IF NOT EXISTS reminders(chat INTEGER PRIMARY KEY, step TEXT, revision INTEGER, due INTEGER);
        CREATE TABLE IF NOT EXISTS route_messages(chat INTEGER, message INTEGER, PRIMARY KEY(chat,message));
        CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY, method TEXT, args TEXT);
    """)
    return db


def options(buttons):
    return [item if isinstance(item, tuple) else (item, LABELS[item]) for item in buttons]


def enqueue(db, method, **args):
    db.execute("INSERT INTO outbox(method,args) VALUES(?,?)", (method, json.dumps(args)))


def say(db, chat, text):
    enqueue(db, "sendMessage", chat_id=chat, text=text)


def show(db, chat, s, kit):
    msg, buttons, picture, links = view(s, kit)
    keys = [[{"text": label, "url": url}] for label, url in links]
    actions = [{"text": label, "callback_data": f"{s['revision']}:{action}"}
               for action, label in options(buttons)]
    keys.extend(actions[i:i+2] for i in range(0, len(actions), 2))
    params = {"_card": True, "chat_id": chat, "reply_markup": {"inline_keyboard": keys}}
    if picture:
        meta = {}
        if s["role"] == "t" and s["step"] in CARDS and not s["mode"] and not s.get("muted") and s["step"] not in s.get("nudged", []):
            meta["_arm"] = [s["step"], s["revision"]]
        enqueue(db, "sendPhoto", **params, caption=msg, upload=picture+".jpg", **meta)
    else:
        enqueue(db, "sendMessage", **params, text=msg)


def admin(db, chat, command):
    parts = command.split()
    if parts[0] == "/reports":
        rows = db.execute("SELECT id,data FROM reports ORDER BY id DESC LIMIT 25").fetchall()
        entries = []
        for rid, raw in rows:
            r = json.loads(raw)
            entries.append(f"/report {rid} · {r['name']} · {r['step'] or 'Общее'}")
        say(db, chat, "\n".join(entries) or "Отзывов пока нет.")
        return
    rid = parts[1] if len(parts) == 2 and parts[1].isdigit() else "0"
    row = db.execute("SELECT data FROM reports WHERE id=?", (rid,)).fetchone()
    if not row:
        say(db, chat, "Укажите номер из /reports.")
        return
    r = json.loads(row[0])
    say(db, chat, f"Отзыв №{rid} · {r['name']} · {r['role']} · {r['device']} · {r['step'] or 'Общее'} · {r['kind']}")
    for item in r["parts"]:
        if item["text"]:
            say(db, chat, item["text"])
        kind = item.get("kind")
        if kind:
            enqueue(db, REPLAY[kind], chat_id=chat, **{kind: item["file_id"]})


def process(db, update, kits, admin_id, invites=None):
    with db:
        uid = update["update_id"]
        if uid < db.execute("SELECT next_update FROM cursor").fetchone()[0]:
            return
        db.execute("UPDATE cursor SET next_update=?", (uid+1,))
        cb = update.get("callback_query", {})
        message = cb.get("message") or update.get("message", {})
        origin = message.get("chat", {})
        if origin.get("type") != "private":
            return
        chat = origin["id"]
        sender = cb.get("from") or message.get("from", {})
        if sender.get("id") != chat:
            return
        command = message.get("text", "").strip() if not cb else ""
        if chat == admin_id and command.split(" ", 1)[0] in ("/reports", "/report"):
            admin(db, chat, command)
            return
        test = db.execute("SELECT test_id,backup FROM phone_tests WHERE chat=?", (chat,)).fetchone()
        if test and command == "/endtest" and test[1]:
            backup = json.loads(test[1])
            current = db.execute("SELECT state FROM sessions WHERE chat=?", (chat,)).fetchone()
            restored = json.loads(backup["session"])
            restored["revision"] = json.loads(current[0])["revision"] + 1
            db.execute("UPDATE sessions SET state=? WHERE chat=?", (json.dumps(restored), chat))
            db.execute("DELETE FROM saved_roles WHERE chat=?", (chat,))
            db.executemany("INSERT INTO saved_roles VALUES(?,?,?)", [(chat,r,v) for r,v in backup["roles"]])
            db.execute("DELETE FROM reminders WHERE chat=?", (chat,))
            if not backup["member"]:
                db.execute("DELETE FROM pilot_members WHERE chat=?", (chat,))
            db.execute("DELETE FROM phone_tests WHERE chat=?", (chat,))
            command = "/resume"
            test = None
        if test and not test[1] and invites and command == "/start " + invites.start:
            old = db.execute("SELECT state FROM sessions WHERE chat=?", (chat,)).fetchone()[0]
            backup = dict(session=old, roles=db.execute("SELECT role,state FROM saved_roles WHERE chat=?", (chat,)).fetchall(),
                          member=bool(db.execute("SELECT 1 FROM pilot_members WHERE chat=?", (chat,)).fetchone()))
            db.execute("UPDATE phone_tests SET backup=? WHERE chat=?", (json.dumps(backup), chat))
            db.execute("DELETE FROM saved_roles WHERE chat=?", (chat,))
            clean = initial()
            clean.update(revision=json.loads(old)["revision"], name=" ".join(sender[k] for k in ("first_name","last_name") if sender.get(k))[:100])
            db.execute("UPDATE sessions SET state=? WHERE chat=?", (json.dumps(clean), chat))
            test = (test[0], True)
        testing = bool(test and test[1])
        row = db.execute("SELECT state FROM sessions WHERE chat=?", (chat,)).fetchone()
        s = json.loads(row[0]) if row else initial()
        if not row:
            s["name"] = " ".join(sender[k] for k in ("first_name", "last_name") if sender.get(k))[:100]
        s.setdefault("number", uuid.uuid4().hex[:8])
        kit = {"number": s["number"], **({} if testing else kits.get(str(chat), {}))}
        site = os.environ.get("ISKRA_PILOT_SITE_URL", "").rstrip("/")
        if site:
            kit.setdefault("t05a", site + "/#/teacher")
            kit.setdefault("u05a", site + "/#/login")
        if invites and command == "/start " + invites.start:
            db.execute("INSERT OR IGNORE INTO pilot_members VALUES(?)", (chat,))
        action = None
        part = None
        if cb:
            revision, _, action = cb.get("data", "").partition(":")
            # A phone button on an older device card now opens the pilot instructions.
            if s["step"] == "device" and not s["mode"] and action == "mobile":
                action = "refresh_device"
            permitted = dict(options(view(s, kit)[1]))
            if s["step"] == "device" and not s["mode"]:
                permitted["refresh_device"] = True
            if s["step"] in s.get("nudged", []) and not s["mode"] and not s.get("muted"):
                permitted.update(continue_task=True, mute=True)
            if revision == str(s["revision"]) and action == "hint" and not s["mode"] and s["step"] in CARDS:
                hint = CARDS[s["step"]].get("hint", "Все инструкции уже есть в карточке. Если застряли, нажмите «Есть проблема».")
                enqueue(db, "answerCallbackQuery", callback_query_id=cb["id"], text=hint, show_alert=True)
                return
            valid = revision == str(s["revision"]) and action in permitted
            enqueue(db, "answerCallbackQuery", callback_query_id=cb["id"],
                    text="" if valid else "Эта карточка уже закрыта. Напишите /start.")
            if not valid:
                return
            # An existing conversation may still have cards sent before tracking began.
            if message.get("message_id"):
                db.execute("INSERT OR IGNORE INTO route_messages VALUES(?,?)", (chat, message["message_id"]))
        elif command.split(" ", 1)[0] in ("/start", "/resume"):
            pass
        elif command == "/role":
            if s["role"]:
                db.execute("INSERT OR REPLACE INTO saved_roles VALUES(?,?,?)",
                           (chat, s["role"], json.dumps(s)))
                s = dict(initial(), number=s["number"], name=s["name"], revision=s["revision"])
        elif command == "/feedback":
            action = "feedback"
        elif command == "/id":
            say(db, chat, f"Ваш номер чата для координатора: {chat}")
            return
        elif command.startswith("/"):
            say(db, chat, "Маршрут — /start. Выбор роли — /role. Оставить отзыв — /feedback.")
            return
        else:
            part = payload(message)
            if not part:
                say(db, chat, "Можно отправить текст, фото, видео, файл, голосовое или кружок.")
                return
            action = "message"

        db.execute("DELETE FROM reminders WHERE chat=?", (chat,))
        if command.split(" ", 1)[0] == "/start" and (s["step"] != "role" or s["mode"]):
            enqueue(db, "sendPhoto", chat_id=chat, upload="start.jpg", _temporary=True, caption="С возвращением в Искру! Продолжим с вашего шага.")
        if action == "mute":
            s["muted"] = True
            say(db, chat, "Напоминания для маршрута преподавателя выключены.")
        elif action == "done" and not s.get("parts"):
            say(db, chat, "Сначала пришлите текст или вложение.")
        elif action in ("t", "u") and (saved := db.execute(
                "SELECT state FROM saved_roles WHERE chat=? AND role=?", (chat, action)).fetchone()):
            s = dict(json.loads(saved[0]), revision=s["revision"])
        elif action:
            report = transition(s, action, part)
            if report:
                report["scenario"] = "2026-11-03"
                report["build"] = kit.get("build")
                report["pilot_number"] = kit["number"]
                rid = db.execute("INSERT INTO reports(chat,data) VALUES(?,?)",
                                 (chat, json.dumps(report))).lastrowid
                say(db, chat, f"Спасибо! Отзыв №{rid} сохранён.")
        if s["step"] == "t11b" and action == "material":
            enqueue(db, "sendDocument", chat_id=chat, upload="Практика.pdf")
        s["revision"] += 1
        db.execute("INSERT OR REPLACE INTO sessions VALUES(?,?)", (chat, json.dumps(s)))
        step = s["step"]
        if invites and step in ("t05b", "u05b") and not s["mode"] and step not in kit:
            if db.execute("SELECT 1 FROM pilot_members WHERE chat=?", (chat,)).fetchone():
                try:
                    kit[step] = invites.issue(test[0] if testing else chat, step)
                except (OSError, subprocess.SubprocessError):
                    kit["invite_notice"] = "Не удалось получить ссылку. Нажмите /resume, чтобы попробовать ещё раз."
                    print("Pilot invitation provisioning failed", file=sys.stderr)
            else:
                kit["invite_notice"] = "Откройте ссылку на пилот из сообщения организатора и нажмите «Старт». Ваш прогресс сохранён."
        show(db, chat, s, kit)


class ApiError(Exception):
    def __init__(self, code, retry=0):
        super().__init__(f"Telegram HTTP {code}")
        self.code, self.retry = code, retry


def api(token, method, args):
    args = dict(args)
    upload = args.pop("upload", None)
    if upload:
        boundary = uuid.uuid4().hex
        chunks = []
        for key, val in args.items():
            val = val if isinstance(val, str) else json.dumps(val, ensure_ascii=False)
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{val}\r\n'.encode())
        # Telegram takes the visible file name from multipart. Keep local paths private.
        filename = upload
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{UPLOADS[method]}"; filename="{filename}"\r\nContent-Type: {mimetypes.guess_type(upload)[0]}\r\n\r\n'.encode())
        chunks.extend([(MEDIA/upload).read_bytes(), f"\r\n--{boundary}--\r\n".encode()])
        data, content = b"".join(chunks), "multipart/form-data; boundary="+boundary
    else:
        data, content = json.dumps(args).encode(), "application/json"
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/{method}", data,
                                 {"Content-Type": content})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            result = json.load(response)
    except urllib.error.HTTPError as err:
        try:
            details = json.load(err)
        except ValueError:
            details = {}
        raise ApiError(err.code, details.get("parameters", {}).get("retry_after", 0)) from None
    if not result.get("ok"):
        raise ApiError(result.get("error_code", 500))
    return result["result"]


def remind(db, token):
    now = int(time.time())
    rows = db.execute("SELECT chat,step,revision FROM reminders WHERE due<=? ORDER BY due", (now,)).fetchall()
    for chat, step, revision in rows:
        with db:
            db.execute("DELETE FROM reminders WHERE chat=?", (chat,))
            state = json.loads(db.execute("SELECT state FROM sessions WHERE chat=?", (chat,)).fetchone()[0])
            if state["revision"] != revision or state["step"] != step or state["mode"] or state.get("muted"):
                continue
            # Reserve before sending: a lost Telegram acknowledgement must not wake the tester twice.
            state.setdefault("nudged", []).append(step)
            db.execute("UPDATE sessions SET state=? WHERE chat=?", (json.dumps(state), chat))
        keys = [[{"text": label, "callback_data": f"{revision}:{action}"}]
                for action, label in [("continue_task", "Продолжить"), ("issue", "Есть проблема"),
                                      ("mute", "Без напоминаний")]]
        try:
            delivered = api(token, "sendMessage", {"chat_id": chat, "text": f"Как дела с заданием «{CARDS[step]['title']}»? Если застряли, расскажите, что случилось. Если всё в порядке, продолжим с этого места.",
                                      "reply_markup": {"inline_keyboard": keys}})
            with db:
                db.execute("INSERT OR IGNORE INTO route_messages VALUES(?,?)", (chat, delivered["message_id"]))
        except ApiError as err:
            if err.code == 429:
                with db:
                    state["nudged"].remove(step)
                    db.execute("UPDATE sessions SET state=? WHERE chat=?", (json.dumps(state), chat))
                    db.execute("INSERT INTO reminders VALUES(?,?,?,?)", (chat, step, revision, now+max(3, err.retry)))
                raise
            if err.code != 403:
                raise


def flush(db, token):
    while row := db.execute("SELECT id,method,args FROM outbox ORDER BY id LIMIT 1").fetchone():
        args = json.loads(row[2])
        arm = args.pop("_arm", None)
        card = args.pop("_card", False)
        temporary = args.pop("_temporary", False)
        delivered = None
        try:
            delivered = api(token, row[1], args)
        except ApiError as err:
            if err.code != 403 and not (row[1] in ("answerCallbackQuery", "deleteMessage") and err.code == 400):
                raise
            arm = None
        with db:
            if delivered and (card or temporary):
                chat = args["chat_id"]
                if card:
                    for (previous,) in db.execute("SELECT message FROM route_messages WHERE chat=?", (chat,)):
                        enqueue(db, "deleteMessage", chat_id=chat, message_id=previous)
                    db.execute("DELETE FROM route_messages WHERE chat=?", (chat,))
                db.execute("INSERT INTO route_messages VALUES(?,?)", (chat, delivered["message_id"]))
            if arm:
                db.execute("INSERT OR REPLACE INTO reminders VALUES(?,?,?,?)",
                           (args["chat_id"], *arm, int(time.time()) + 3 * 3600))
            db.execute("DELETE FROM outbox WHERE id=?", (row[0],))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=Path.home()/".iskra-pilot"/"pilot.sqlite3")
    parser.add_argument("--kits", type=Path, help="JSON с персональными ссылками тестировщиков")
    args = parser.parse_args()
    config = args.db.parent / "invites.local.json"
    invites = Invites(json.loads(config.read_text())) if config.exists() else None
    token = os.environ.get("ISKRA_PILOT_BOT_TOKEN", "")
    if not re.fullmatch(r"[0-9]+:[a-zA-Z0-9_-]+", token):
        parser.exit(2, "Задайте ISKRA_PILOT_BOT_TOKEN для отдельного тестового бота.\n")
    admin_id = int(os.environ.get("ISKRA_PILOT_ADMIN_CHAT_ID", "0"))
    kits = json.loads(args.kits.read_text()) if args.kits else {}
    os.umask(0o077)
    args.db.parent.mkdir(parents=True, exist_ok=True)
    lock = args.db.with_suffix(".lock").open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    db = database(args.db)
    while True:
        try:
            flush(db, token)
            offset = db.execute("SELECT next_update FROM cursor").fetchone()[0]
            updates = api(token, "getUpdates", dict(offset=offset, timeout=25,
                                                   allowed_updates=["message", "callback_query"]))
            for update in updates:
                process(db, update, kits, admin_id, invites)
                flush(db, token)
            if len(updates) < 100:
                remind(db, token)
        except ApiError as err:
            if err.code in (400, 401, 404, 409):
                sys.exit(f"{err}. Проверьте токен, сообщения очереди и отсутствие второго polling/webhook.")
            print(str(err), file=sys.stderr)
            time.sleep(max(3, err.retry))
        except (OSError, TimeoutError):
            print("Связь с Telegram прервана. Повтор через три секунды.", file=sys.stderr)
            time.sleep(3)


if __name__ == "__main__":
    main()
