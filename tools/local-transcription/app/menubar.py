"""Иконка строки меню для модуля расшифровки Искры.

Запускается из бандла «Искра · Расшифровка.app» (его лаунчер уже поставил rumps
и указал путь к модулю в ISKRA_MODULE). Держит иконку в строке меню, запускает и
супервизит сервер (start.command → server.py на 127.0.0.1:18764), даёт выйти и
включить автозапуск при входе. Терминал не нужен.

Контракт сервера (порт 18764, origin-гейт) здесь НЕ трогается: этот процесс
только запускает start.command дочерним и проверяет, что порт слушается.
"""
import fcntl
import os
import signal
import socket
import subprocess
import sys
import plistlib
from pathlib import Path

import rumps

PORT = 18764
LABEL = 'ru.iskra.transcription'
HOME = Path.home()
SUPPORT = HOME / 'Library/Application Support/Iskra'
LOG = HOME / 'Library/Logs/Iskra/transcription.log'
LAUNCH_AGENTS = HOME / 'Library/LaunchAgents'
PLIST = LAUNCH_AGENTS / f'{LABEL}.plist'

# Папка модуля (server.py, start.command, ffmpeg). Лаунчер передаёт её в env;
# запасной расчёт — от расположения этого файла внутри бандла
# (…/.app/Contents/Resources/menubar.py → папка, содержащая .app).
MODULE = Path(os.environ.get('ISKRA_MODULE') or Path(__file__).resolve().parents[3])
APP_BUNDLE = os.environ.get('ISKRA_APP_BUNDLE', '')


def server_up():
    """Слушается ли порт модуля. Без обращения к API — не зависим от origin-гейта."""
    try:
        with socket.create_connection(('127.0.0.1', PORT), timeout=0.5):
            return True
    except OSError:
        return False


class Transcription(rumps.App):
    def __init__(self):
        super().__init__('Искра', title='◌', quit_button=None)
        self.proc = None
        self.logf = None
        self.quitting = False
        self.status = rumps.MenuItem('Запускаюсь…')
        self.login = rumps.MenuItem('Запускать при входе', callback=self.toggle_login)
        self.login.state = PLIST.exists()
        self.menu = [
            self.status,
            None,
            rumps.MenuItem('Показать журнал', callback=self.show_log),
            self.login,
            None,
            rumps.MenuItem('Выход', callback=self.quit_app),
        ]
        self.start_server()

    # ── сервер ───────────────────────────────────────────────────────────────
    def start_server(self):
        """start.command дочерним процессом в своей группе — чтобы «Выход» мог
        погасить и сервер, и его подпроцессы распознавания одним сигналом."""
        if self.proc and self.proc.poll() is None:
            return
        try:
            self.logf = open(LOG, 'a')
            self.proc = subprocess.Popen(
                ['/bin/zsh', str(MODULE / 'start.command')],
                cwd=str(MODULE), stdout=self.logf, stderr=subprocess.STDOUT,
                start_new_session=True)
        except OSError as exc:
            self.status.title = 'Не удалось запустить'
            print(f'start.command не запустился: {exc}', file=sys.stderr, flush=True)

    @rumps.timer(3)
    def poll(self, _):
        # Самообновление сервера делает os.execv (тот же PID) — poll() остаётся
        # None, супервизия переживает обновление. Если наш процесс умер не по
        # нашей команде И порт свободен — поднимаем заново. Когда порт уже кем-то
        # занят (например, параллельно запущен start.command в Терминале), не
        # перезапускаем — иначе цикл: server.py увидит замок и сразу выйдет.
        up = server_up()
        if not self.quitting and not up and self.proc and self.proc.poll() is not None:
            self.start_server()
        if up:
            self.status.title = 'Модуль работает'
            self.title = '✦'
        else:
            self.status.title = 'Запускаюсь…'
            self.title = '◌'

    # ── меню ─────────────────────────────────────────────────────────────────
    def show_log(self, _):
        LOG.parent.mkdir(parents=True, exist_ok=True)
        LOG.touch(exist_ok=True)
        subprocess.run(['/usr/bin/open', str(LOG)], check=False)

    def toggle_login(self, item):
        uid = os.getuid()
        if item.state:
            subprocess.run(['launchctl', 'bootout', f'gui/{uid}/{LABEL}'], capture_output=True)
            PLIST.unlink(missing_ok=True)
            item.state = False
            return
        if not APP_BUNDLE:
            rumps.alert('Не удалось включить автозапуск', 'Не нашёл путь к приложению. Запустите «Искра · Расшифровка.app» из Finder.')
            return
        LAUNCH_AGENTS.mkdir(parents=True, exist_ok=True)
        # `open -gj <app>`: запустить приложение в фоне при входе, не вытаскивая
        # окно на передний план. Путь абсолютный — не переносите папку после
        # включения, иначе включите заново.
        with open(PLIST, 'wb') as f:
            plistlib.dump({
                'Label': LABEL,
                'ProgramArguments': ['/usr/bin/open', '-gj', APP_BUNDLE],
                'RunAtLoad': True,
            }, f)
        subprocess.run(['launchctl', 'bootstrap', f'gui/{uid}', str(PLIST)], capture_output=True)
        item.state = True

    def quit_app(self, _):
        self.quitting = True
        if self.proc and self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass
            except (ProcessLookupError, OSError):
                pass
        rumps.quit_application()


def main():
    # Один инстанс: автозапуск при входе и ручной клик не должны повесить две
    # иконки. Второй процесс тихо выходит.
    SUPPORT.mkdir(parents=True, exist_ok=True)
    lock = open(SUPPORT / '.menubar.lock', 'a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit(0)
    Transcription().run()


if __name__ == '__main__':
    main()
