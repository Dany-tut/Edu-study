import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from bot import CARDS, MEDIA, database, flush, remind, options, process, view


class PilotTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)/"pilot.sqlite3"
        self.db = database(self.path)
        self.addCleanup(lambda: self.db.close())
        self.seq = 0
        self.chat = 42
        self.kits = {"42": {"number": "19", "build": "pilot-test"}}
        self.message("/start")

    def dispatch(self, data):
        self.seq += 1
        update = dict(update_id=self.seq, **data)
        process(self.db, update, self.kits, 777)
        return update

    def message(self, text="", **other):
        return self.dispatch({"message": {"chat": {"id": self.chat, "type": "private"},
                                         "from": {"id": self.chat, "first_name": "Тест"},
                                         "text": text, **other}})

    def state(self):
        return json.loads(self.db.execute("SELECT state FROM sessions WHERE chat=?", (self.chat,)).fetchone()[0])

    def choose(self, action):
        s = self.state()
        self.assertIn(action, dict(options(view(s, self.kits.get(str(self.chat), {}))[1])))
        return self.dispatch({"callback_query": {"id": str(self.seq), "from": {"id": self.chat},
                              "message": {"chat": {"id": self.chat, "type": "private"}},
                              "data": f"{s['revision']}:{action}"}})

    def setup_role(self, role, device="desktop", entry="login"):
        for action in (role, device, entry, "ok"):
            self.choose(action)

    def test_automatic_invite_requires_pilot_link_and_matches_role(self):
        from unittest.mock import Mock
        invites = Mock(start="private-pilot")
        invites.issue.side_effect = lambda chat, step: f"https://example.org/{chat}/{step}"
        def send(data):
            self.seq += 1
            process(self.db, dict(update_id=self.seq, **data), {}, 0, invites)
        user = {"id": self.chat, "type": "private"}
        def start(text):
            send({"message": {"from": user, "chat": user, "text": text}})
        for action in ("t", "desktop", "register"):
            self.choose(action)
        start("/resume")
        invites.issue.assert_not_called()
        start("/start private-pilot")
        invites.issue.assert_called_once_with(self.chat, "t05b")
        card = json.loads(self.db.execute("SELECT args FROM outbox ORDER BY id DESC LIMIT 1").fetchone()[0])
        self.assertEqual(card["reply_markup"]["inline_keyboard"][0][0]["url"], "https://example.org/42/t05b")
        self.message("/role")
        for action in ("u", "desktop", "register"):
            self.choose(action)
        start("/resume")
        invites.issue.assert_called_with(self.chat, "u05b")

    def test_teacher_branches_and_mobile(self):
        self.choose("t")
        self.assertNotIn("mobile", dict(options(view(self.state(), {})[1])))
        for action in ("pause", "resume", "desktop", "register", "ok"):
            self.choose(action)
        for action in ["ok","ok","material"]:
            self.choose(action)
        self.assertEqual(self.state()["step"], "t11b")
        self.assertTrue(self.db.execute("SELECT 1 FROM outbox WHERE method='sendDocument'").fetchone())
        for step in ["t11b","t12","t13","t14","t15","t16","t17"]:
            self.assertEqual(self.state()["step"], step)
            self.choose("ok")
        self.assertEqual(self.state()["step"], "finish")

    def test_switch_roles_preserves_each_route(self):
        self.setup_role("u")
        self.choose("ok")
        self.message("/role")
        self.setup_role("t")
        self.choose("skip")
        self.message("/role")
        self.choose("u")
        self.assertEqual(self.state()["step"], "u09")
        self.assertNotIn("t08", self.state()["results"])
        self.message("/role")
        self.choose("t")
        self.assertEqual(self.state()["results"]["t08"], "skip")

    def test_reminder_after_delivery_once_and_opt_out(self):
        self.setup_role("t")
        ids = iter(range(1, 1000))
        with patch("bot.api", side_effect=lambda *a: {"message_id": next(ids)}) as send, patch("bot.time.time", return_value=100):
            flush(self.db, "test")
            self.assertEqual(self.db.execute("SELECT due FROM reminders").fetchone()[0], 10900)
            send.reset_mock()
            with patch("bot.time.time", return_value=10899):
                remind(self.db, "test")
            send.assert_not_called()
            with patch("bot.time.time", return_value=10900):
                remind(self.db, "test")
                remind(self.db, "test")
            send.assert_called_once()
            self.assertIn("Группа", send.call_args.args[2]["text"])
            s = self.state()
            self.dispatch({"callback_query":{"id":"mute","message":{"chat":{"id":self.chat,"type":"private"}},
                           "from":{"id":self.chat},"data":f"{s['revision']}:mute"}})
            self.choose("ok")
            flush(self.db, "test")
            self.assertFalse(self.db.execute("SELECT 1 FROM reminders").fetchone())

    def test_role_change_cancels_pending_teacher_reminder(self):
        self.setup_role("t")
        ids = iter(range(1, 1000))
        with patch("bot.api", side_effect=lambda *a: {"message_id": next(ids)}):
            flush(self.db, "test")
            self.message("/role")
            self.setup_role("u")
            flush(self.db, "test")
            self.assertFalse(self.db.execute("SELECT 1 FROM reminders").fetchone())

    def test_teacher_from_scratch(self):
        self.setup_role("t")
        for action in ["skip","ok","new","ok","ok"]:
            self.choose(action)
        self.assertEqual(self.state()["step"], "t12")
        self.assertEqual(self.state()["results"]["t11v"], "ok")

    def test_student_resume_and_review(self):
        self.setup_role("u")
        self.choose("skip")
        self.db.close()
        self.db = database(self.path)
        self.message("/start")
        for step in ["u09","u10","u11","u12","u13","u14"]:
            self.assertEqual(self.state()["step"], step)
            self.choose("ok")
        self.choose("skipped")
        self.choose("back_u08")
        self.choose("ok")
        self.assertEqual(self.state()["step"], "finish")
        self.assertEqual(self.state()["results"]["u08"], "ok")

    def test_issue_media_and_stale_callbacks(self):
        self.setup_role("u")
        update = self.choose("issue")
        self.message(video_note={"file_id":"round"})
        self.message(photo=[{"file_id":"small"},{"file_id":"large"}], caption="Экран")
        self.choose("done")
        count = self.db.execute("SELECT count(*) FROM reports").fetchone()[0]
        self.assertEqual(count, 1)
        process(self.db, update, self.kits, 777)
        self.dispatch({"callback_query": update["callback_query"]})
        self.assertEqual(self.state()["mode"], "after")
        self.choose("skip")
        self.assertEqual(self.state()["step"], "u09")
        report = json.loads(self.db.execute("SELECT data FROM reports").fetchone()[0])
        self.assertEqual([x["file_id"] for x in report["parts"]], ["round","large"])
        self.assertEqual(report["build"], "pilot-test")
        self.assertEqual(report["step"], "u08")
        self.message("/report 1")
        self.assertIsNone(self.db.execute("SELECT 1 FROM outbox WHERE method='sendVideoNote'").fetchone())
        self.chat = 777
        self.message("/report 1")
        self.assertTrue(self.db.execute("SELECT 1 FROM outbox WHERE method='sendVideoNote'").fetchone())

    def test_unsolicited_media_and_failed_login(self):
        self.message(video={"file_id":"video"})
        self.choose("general")
        self.choose("done")
        data = json.loads(self.db.execute("SELECT data FROM reports").fetchone()[0])
        self.assertIsNone(data["step"])
        for action in ("t", "desktop", "login", "skip", "pause", "resume", "retry"):
            self.choose(action)
        self.assertEqual(self.state()["step"], "t05a")

    def test_transport_and_outbox_replay(self):
        self.setup_role("t")
        calls = []
        def receive(request, timeout):
            calls.append(request)
            return io.BytesIO(json.dumps({"ok": True, "result": {"message_id": len(calls)}}).encode())
        with patch("bot.urllib.request.urlopen", side_effect=TimeoutError):
            with self.assertRaises(TimeoutError):
                flush(self.db, "123:test")
        self.assertGreater(self.db.execute("SELECT count(*) FROM outbox").fetchone()[0], 0)
        with patch("bot.urllib.request.urlopen", side_effect=receive):
            flush(self.db, "123:test")
        self.assertEqual(self.db.execute("SELECT count(*) FROM outbox").fetchone()[0], 0)
        delivered = [i for i,r in enumerate(calls, 1) if r.full_url.endswith(("/sendPhoto", "/sendMessage"))]
        deleted = [json.loads(r.data)["message_id"] for r in calls if r.full_url.endswith("/deleteMessage")]
        self.assertCountEqual(deleted, delivered[:-1])
        photos = [r for r in calls if r.full_url.endswith("/sendPhoto")]
        self.assertTrue(any((MEDIA/"t08.jpg").read_bytes() in r.data for r in photos))
        self.assertTrue(all(b'callback_data' in r.data for r in photos))

    def test_card_images_and_caption_lengths(self):
        for key in CARDS:
            self.assertTrue((MEDIA/(key+".jpg")).is_file(), key)
            state = self.state()
            state.update(step=key, role=key[0], device="desktop")
            self.assertLess(len(view(state, {"number":"1234"})[0]), 1024)
        self.assertTrue((MEDIA/"Практика.pdf").read_bytes().startswith(b"%PDF"))
