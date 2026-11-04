"""Issue pilot invitations through the local coordinator's Supabase CLI."""
import hashlib
import hmac
import json
import subprocess
import tempfile
import uuid
from pathlib import Path

PROJECT = "igsdwvwiqnozgwczzycx"


class Invites:
    def __init__(self, config):
        self.key = bytes.fromhex(config["key"])
        self.start = config["start"]
        self.cli = config["cli"]
        self.workdir = config["workdir"]

    def token(self, chat, kind):
        digest = hmac.digest(self.key, f"{int(chat)}:{kind}".encode(), hashlib.sha256)
        return uuid.UUID(bytes=digest[:16], version=4)

    def issue(self, chat, step):
        token = self.token(chat, step)
        if step == "t05b":
            sql = f"""insert into public.teacher_invites(token) values ('{token}')
                on conflict(token) do update set expires_at=now()+interval '14 days'
                where teacher_invites.consumed_at is null and teacher_invites.expires_at<=now();"""
            path = "join-teacher"
        elif step == "u05b":
            group = self.token(chat, "group")
            # Separate statements let the student ownership trigger see the new group.
            sql = f"""insert into public.groups(id,name,created_by)
                values ('{group}', 'Пилот Искры · {str(group)[:8]}',
                    (select id from auth.users where raw_app_meta_data->>'role'='admin' order by created_at limit 1))
                on conflict(id) do nothing;
                insert into public.students(id,name,group_id,invite_token)
                values ('{self.token(chat, 'student')}', 'Участник пилота', '{group}', '{token}')
                on conflict(id) do nothing;"""
            path = "join"
        else:
            raise ValueError("Unknown registration step")
        with tempfile.NamedTemporaryFile(mode="w", suffix=".sql") as query:
            query.write("begin;\n" + sql + "\ncommit;")
            query.flush()
            subprocess.run([self.cli, "db", "query", "--linked", "--project-ref", PROJECT,
                            "--workdir", self.workdir, "--file", query.name], check=True,
                           timeout=25, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return f"https://edu-study-app.vercel.app/#/{path}?token={token}"
