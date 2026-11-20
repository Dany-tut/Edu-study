#!/bin/bash
# Окно установщика (DMG) «Искра · Расшифровка»: фон Искры, слева приложение,
# стрелка, справа ярлык «Программы», фиксированный размер, иконки 128, без
# панели инструментов и боковой панели.
#
#   scripts/buildTranscriptionDmg.sh <app> <out.dmg>            — сборка (CI и локально)
# Окно 660×420 под фон + 32 pt заголовка (bounds Finder считают с ним).
#   scripts/buildTranscriptionDmg.sh <app> <out.dmg> --layout   — пересоздать раскладку
#        через Finder (нужна GUI-сессия) и сохранить её в tools/transcription-macos/dmg/DS_Store
#
# В CI (macos-15) GUI-сессии нет, поэтому раскладка берётся из готового .DS_Store
# в репозитории. Он ссылается на фон по пути на томе, поэтому имя тома, имя
# приложения внутри и путь к фону постоянны (без версии): версия видна на иконке.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$1"; OUT="$2"; MODE="${3:-}"
VOLUME="Искра · Расшифровка"
APP_NAME="Искра — расшифровка.app"   # то же имя, что ставит само приложение
APPS_LINK="Программы"
DS_STORE="$ROOT/tools/transcription-macos/dmg/DS_Store"

WORK="$(mktemp -d)"
MOUNT=""
cleanup() {
  if [[ -n "$MOUNT" ]]; then hdiutil detach "$MOUNT" -force >/dev/null 2>&1 || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

STAGE="$WORK/stage"
mkdir -p "$STAGE/.background"
ditto "$APP" "$STAGE/$APP_NAME"
ln -s /Applications "$STAGE/$APPS_LINK"
swift "$ROOT/scripts/transcriptionDmgBackground.swift" "$WORK" 
tiffutil -cathidpicheck "$WORK/background.png" "$WORK/background@2x.png" -out "$STAGE/.background/background.tiff" >/dev/null 2>&1
if [[ "$MODE" != "--layout" ]]; then
  [[ -f "$DS_STORE" ]] || { echo "Нет $DS_STORE: запустите сборку с --layout на Mac с Finder." >&2; exit 1; }
  cp "$DS_STORE" "$STAGE/.DS_Store"
fi

if hdiutil info | grep -q "/Volumes/$VOLUME"; then
  echo "Отключите смонтированный том «$VOLUME» и повторите." >&2
  exit 1
fi
hdiutil create -quiet -volname "$VOLUME" -srcfolder "$STAGE" -fs HFS+ -format UDRW -ov "$WORK/rw.dmg"

if [[ "$MODE" == "--layout" ]]; then
  MOUNT="/Volumes/$VOLUME"
  hdiutil attach -quiet -noautoopen -mountpoint "$MOUNT" "$WORK/rw.dmg"
  osascript <<APPLESCRIPT
tell application "Finder"
  tell disk "$VOLUME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    try
      set pathbar visible of container window to false
    end try
    try
      set sidebar width of container window to 0
    end try
    set the bounds of container window to {200, 120, 860, 572}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 128
    set text size of viewOptions to 13
    set background picture of viewOptions to file ".background:background.tiff"
    set position of item "$APP_NAME" of container window to {170, 205}
    set position of item "$APPS_LINK" of container window to {490, 205}
    set the bounds of container window to {200, 120, 860, 572}
    close
    open
    update without registering applications
    delay 2
    close
  end tell
end tell
APPLESCRIPT
  sync
  for _ in 1 2 3 4 5 6 7 8 9 10; do [[ -f "$MOUNT/.DS_Store" ]] && break; sleep 1; done
  mkdir -p "$(dirname "$DS_STORE")"
  cp "$MOUNT/.DS_Store" "$DS_STORE"
  echo "Раскладка сохранена: $DS_STORE"
  hdiutil detach -quiet "$MOUNT"; MOUNT=""
fi

rm -f "$OUT"
hdiutil convert -quiet "$WORK/rw.dmg" -format UDZO -imagekey zlib-level=9 -o "$OUT"
echo "$OUT"
