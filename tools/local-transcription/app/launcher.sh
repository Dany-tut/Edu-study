#!/bin/zsh
# Исполняемый файл бандла «Искра · Расшифровка.app» (Contents/MacOS/launcher).
# Задача: поднять модуль расшифровки БЕЗ открытого окна Терминала. Готовит
# окружение (снимает карантин, создаёт venv, ставит rumps для иконки строки
# меню) и передаёт управление контроллеру строки меню menubar.py, который уже
# сам запускает и супервизит сервер (start.command → server.py на 18764).
set -eu

self="${0:A}"                 # …/Искра · Расшифровка.app/Contents/MacOS/launcher
app="${self:h:h:h}"           # …/Искра · Расшифровка.app
module="${app:h}"             # папка Iskra рядом с .app: server.py, start.command, ffmpeg
resources="${self:h:h}/Resources"

log_dir="$HOME/Library/Logs/Iskra"
mkdir -p "$log_dir"
log="$log_dir/transcription.log"
{ print -r -- "── $(date '+%Y-%m-%d %H:%M:%S') запуск Искра · Расшифровка.app"; } >>"$log" 2>&1

fail() {
  # Нет Терминала — показываем ошибку обычным окном macOS.
  /usr/bin/osascript -e "display dialog \"$1\" buttons {\"OK\"} with icon stop with title \"Искра · Расшифровка\"" >/dev/null 2>&1 || true
  print -r -- "ОШИБКА: $1" >>"$log" 2>&1
  exit 1
}

[[ -f "$module/server.py" && -f "$module/start.command" ]] || \
  fail "Не нашёл файлы модуля рядом с приложением. Держите «Искра · Расшифровка.app» внутри папки Iskra и не переносите по отдельности."

# macOS держит скачанные файлы в карантине. Снимаем метку со всей папки модуля
# (и с самого .app) — тогда и вложенный ffmpeg, и скрипты запускаются без «Файл
# не был открыт?». Это то же, что делал start.command.
/usr/bin/xattr -dr com.apple.quarantine "$module" 2>/dev/null || true
chmod +x "$module/ffmpeg" "$module/start.command" 2>/dev/null || true

# Контроллеру строки меню нужен pyobjc/rumps. Ставим его в тот же runtime-venv,
# что и остальной модуль; полный набор зависимостей (mlx-whisper и т.д.) доставит
# сам start.command при первом запуске сервера.
runtime="$HOME/Library/Application Support/Iskra/transcription-runtime"
mkdir -p "$runtime"
if [[ ! -x "$runtime/bin/python" ]]; then
  /usr/bin/osascript -e 'display notification "Первый запуск: ставлю компоненты, это займёт несколько минут." with title "Искра · Расшифровка"' >/dev/null 2>&1 || true
  python3 -m venv "$runtime" >>"$log" 2>&1 || fail "Не удалось создать окружение Python. Установите Xcode Command Line Tools: xcode-select --install"
fi
if ! "$runtime/bin/python" -c 'import rumps' >/dev/null 2>&1; then
  "$runtime/bin/python" -m pip install -q rumps >>"$log" 2>&1 || fail "Не удалось установить компонент строки меню (rumps). Проверьте интернет и запустите приложение снова."
fi

export ISKRA_MODULE="$module"
export ISKRA_APP_BUNDLE="$app"
exec "$runtime/bin/python" "$resources/menubar.py" >>"$log" 2>&1
