#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---release}"
BUILD="$ROOT/.build/transcription-macos"
APP="$BUILD/Iskra — расшифровка.app"
APP_CONTENTS="$APP/Contents"
VERSION="$(sed -n "s/.*= '\([^']*\)'.*/\1/p" "$ROOT/src/lib/transcriptionModuleVersion.ts" | head -1)"
INSTALLER_VERSION="$(sed -n "s/.*= '\([^']*\)'.*/\1/p" "$ROOT/src/lib/transcriptionInstallerVersion.ts" | head -1)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Сборка установщика для Mac запускается на macOS." >&2
  exit 2
fi
if [[ -z "$VERSION" || -z "$INSTALLER_VERSION" ]]; then
  echo "Не найдена версия модуля или установщика." >&2
  exit 2
fi

if [[ ! -f "$ROOT/public/downloads/iskra-transcription-mac.zip" ]]; then
  node "$ROOT/scripts/buildTranscriptionModule.mjs"
fi

rm -rf "$BUILD"
mkdir -p "$APP_CONTENTS/MacOS" "$APP_CONTENTS/Resources" "$APP_CONTENTS/Library/LaunchAgents"
# Системная иконка собирается из брендового PNG без сторонних зависимостей.
ICONSET="$BUILD/iskra.iconset"
mkdir -p "$ICONSET"
for SIZE in 16 32 128 256 512; do
  sips -z "$SIZE" "$SIZE" "$ROOT/public/icon-512.png" --out "$ICONSET/icon_${SIZE}x${SIZE}.png" >/dev/null
  if [[ "$SIZE" != 512 ]]; then
    DOUBLE=$((SIZE * 2))
    sips -z "$DOUBLE" "$DOUBLE" "$ROOT/public/icon-512.png" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
  fi
done
iconutil -c icns "$ICONSET" -o "$APP_CONTENTS/Resources/iskra.icns"
rm -rf "$ICONSET"
swiftc -O -framework AppKit -framework CoreServices -framework ServiceManagement \
  -o "$APP_CONTENTS/MacOS/IskraTranscription" "$ROOT/tools/transcription-macos/IskraTranscription.swift"

cat > "$APP_CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>IskraTranscription</string>
  <key>CFBundleIdentifier</key><string>ru.iskra.transcription</string>
  <key>CFBundleName</key><string>IskraTranscription</string>
  <key>CFBundleDisplayName</key><string>Искра — расшифровка</string>
  <key>CFBundleIconFile</key><string>iskra.icns</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1.0</string>
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
ditto -c -k --keepParent "$APP" "$BUILD/iskra-transcription-mac-$INSTALLER_VERSION.zip"
echo "$BUILD/iskra-transcription-mac-$INSTALLER_VERSION.zip"
