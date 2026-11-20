#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---release}"
BUILD="$ROOT/.build/transcription-macos"
VERSION="$(sed -n "s/.*= '\([^']*\)'.*/\1/p" "$ROOT/src/lib/transcriptionModuleVersion.ts" | head -1)"
INSTALLER_VERSION="$(sed -n "s/.*= '\([^']*\)'.*/\1/p" "$ROOT/src/lib/transcriptionInstallerVersion.ts" | head -1)"
PRODUCT_VERSION="$(sed -n "s/.*= '\([^']*\)'.*/\1/p" "$ROOT/src/lib/transcriptionProductVersion.ts" | head -1)"
# Finder and Gatekeeper show the downloaded bundle name before first launch.
APP="$BUILD/Искра — расшифровка v$PRODUCT_VERSION.app"
APP_CONTENTS="$APP/Contents"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Сборка установщика для Mac запускается на macOS." >&2
  exit 2
fi
if [[ -z "$VERSION" || -z "$INSTALLER_VERSION" || -z "$PRODUCT_VERSION" ]]; then
  echo "Не найдена версия модуля или установщика." >&2
  exit 2
fi

node "$ROOT/scripts/buildTranscriptionModule.mjs" --check
node "$ROOT/scripts/buildTranscriptionModule.mjs"

rm -rf "$BUILD"
mkdir -p "$APP_CONTENTS/MacOS" "$APP_CONTENTS/Resources" "$APP_CONTENTS/Library/LaunchAgents"
# Системная иконка собирается из брендового PNG без сторонних зависимостей.
# На крупных размерах — плашка с версией (scripts/transcriptionIconBadge.swift):
# иконка внутри приложения и после автообновления показывает его версию.
# 16 и 32 px — без плашки, там её не прочитать.
ICONSET="$BUILD/iskra.iconset"
mkdir -p "$ICONSET"
BADGED="$BUILD/icon-badged.png"
swift "$ROOT/scripts/transcriptionIconBadge.swift" "$ROOT/public/icon-512.png" "$PRODUCT_VERSION" "$BADGED"
for SIZE in 16 32 128 256 512; do
  for SCALE in 1 2; do
    SUFFIX=""; [[ "$SCALE" == 2 ]] && SUFFIX="@2x"
    PIXELS=$((SIZE * SCALE))
    SRC="$BADGED"; (( PIXELS <= 64 )) && SRC="$ROOT/public/icon-512.png"
    sips -z "$PIXELS" "$PIXELS" "$SRC" --out "$ICONSET/icon_${SIZE}x${SIZE}${SUFFIX}.png" >/dev/null
  done
done
iconutil -c icns "$ICONSET" -o "$APP_CONTENTS/Resources/iskra.icns"
rm -rf "$ICONSET" "$BADGED"
export MACOSX_DEPLOYMENT_TARGET=13.0
swiftc -O -framework AppKit -framework CoreServices -framework ServiceManagement \
  -o "$APP_CONTENTS/MacOS/IskraTranscription" "$ROOT/tools/transcription-macos/IskraTranscription.swift"

# OCR слайдов (Apple Vision, русский + английский) собирается здесь, в CI, и
# вшивается в .app: у учителя swiftc не нужен. Модуль берёт путь из
# ISKRA_FRAME_TEXT и проверяет протокол через --version.
swiftc -O -o "$APP_CONTENTS/MacOS/IskraFrameText" "$ROOT/tools/local-transcription/frame_text.swift"
if [[ "$("$APP_CONTENTS/MacOS/IskraFrameText" --version </dev/null)" != "iskra-frame-text 2" ]]; then
  echo "IskraFrameText собран, но не отвечает протоколом 2." >&2
  exit 1
fi

cat > "$APP_CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>IskraTranscription</string>
  <key>CFBundleIdentifier</key><string>ru.iskra.transcription</string>
  <key>CFBundleName</key><string>Искра — расшифровка</string>
  <key>CFBundleDisplayName</key><string>Искра — расшифровка</string>
  <key>LSHasLocalizedDisplayName</key><true/>
  <key>CFBundleDevelopmentRegion</key><string>ru</string>
  <key>CFBundleIconFile</key><string>iskra.icns</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$PRODUCT_VERSION</string>
  <key>CFBundleVersion</key><string>$PRODUCT_VERSION</string>
  <key>IskraInstallerVersion</key><string>$INSTALLER_VERSION</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
  <key>CFBundleURLTypes</key><array><dict>
    <key>CFBundleURLName</key><string>Искра: фоновый модуль расшифровки</string>
    <key>CFBundleURLSchemes</key><array><string>iskra-transcription</string></array>
  </dict></array>
</dict></plist>
PLIST

# Имя в Finder, лаунчере и меню — «Искра · Расшифровка». Файл остаётся
# «Искра — расшифровка.app»: по этому пути приложение ставит себя, его находят
# автообновление и фоновый агент; переименование дало бы вторую копию у учителей.
# macOS показывает локализованное имя, когда имя файла совпадает с CFBundleDisplayName.
for LPROJ in ru en Base; do
  mkdir -p "$APP_CONTENTS/Resources/$LPROJ.lproj"
  printf '"CFBundleDisplayName" = "Искра · Расшифровка";\n"CFBundleName" = "Искра · Расшифровка";\n' > "$APP_CONTENTS/Resources/$LPROJ.lproj/InfoPlist.strings"
done

ditto -x -k "$ROOT/public/downloads/iskra-transcription-mac.zip" "$APP_CONTENTS/Resources"
mv "$APP_CONTENTS/Resources/Iskra" "$APP_CONTENTS/Resources/TranscriptionModule"
cp "$ROOT/tools/transcription-macos/com.iskra.transcription.agent.plist" "$APP_CONTENTS/Library/LaunchAgents/"

if [[ "$MODE" == "--verify" ]]; then
  codesign --force --deep --sign - "$APP"
  codesign --verify --deep --strict --verbose=2 "$APP"
  plutil -lint "$APP_CONTENTS/Info.plist" "$APP_CONTENTS/Library/LaunchAgents/com.iskra.transcription.agent.plist"
  echo "Сборка установщика проверена: $APP"
  exit 0
fi

: "${APPLE_DEVELOPER_ID:?Задайте Apple Developer ID Application identity}"
: "${APPLE_NOTARY_KEY_ID:?Задайте App Store Connect API key ID}"
: "${APPLE_NOTARY_ISSUER_ID:?Задайте App Store Connect issuer ID}"
: "${APPLE_NOTARY_PRIVATE_KEY:?Задайте путь к App Store Connect .p8 key}"
codesign --force --deep --options runtime --timestamp --sign "$APPLE_DEVELOPER_ID" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
ditto -c -k --keepParent "$APP" "$BUILD/notary-payload.zip"
xcrun notarytool submit "$BUILD/notary-payload.zip" \
  --key "$APPLE_NOTARY_PRIVATE_KEY" --key-id "$APPLE_NOTARY_KEY_ID" --issuer "$APPLE_NOTARY_ISSUER_ID" --wait
xcrun stapler staple "$APP"
spctl --assess --type execute --verbose=4 "$APP"
ditto -c -k --keepParent "$APP" "$BUILD/Iskra-Transcription-Mac-v$PRODUCT_VERSION.zip"
echo "$BUILD/Iskra-Transcription-Mac-v$PRODUCT_VERSION.zip"
