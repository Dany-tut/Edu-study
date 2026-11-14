#!/bin/zsh
set -eu
cd "${0:A:h}"
chmod +x "$PWD/ffmpeg" 2>/dev/null || true
# Вложенный ffmpeg (статический, Apple Silicon) — первым в PATH, чтобы его
# нашли и наши скрипты, и распознавание речи (mlx-whisper зовёт ffmpeg из PATH).
# Homebrew — запасной путь для машин, где ffmpeg уже стоит.
export PATH="$PWD:/opt/homebrew/bin:$PATH"
if [[ -x "${ISKRA_FFMPEG:-}" ]]; then
  export PATH="${ISKRA_FFMPEG:h}:$PATH"
elif [[ -x "$PWD/ffmpeg" ]]; then
  export ISKRA_FFMPEG="$PWD/ffmpeg"
elif ! command -v ffmpeg >/dev/null; then
  echo 'FFmpeg не найден. Скачайте модуль заново из профиля Искры.'
  exit 1
fi
runtime="$HOME/Library/Application Support/Iskra/transcription-runtime"
mkdir -p "$runtime"
if [[ "${ISKRA_PACKAGED_MODULE:-}" == 1 && ! -x "$runtime/bin/python" ]]; then
  # A clean macOS installation has no usable Python without developer tools.
  # Keep the interpreter at a stable path because the venv links back to it.
  python_home="${runtime:h}/transcription-python-3.12.16"
  if [[ ! -x "$python_home/bin/python3" ]]; then
    staging="$(mktemp -d "${runtime:h}/.transcription-python.XXXXXXXX")"
    trap 'rm -rf "$staging"' EXIT
    curl --fail --silent --show-error --location --retry 2 --max-time 120 \
      'https://github.com/astral-sh/python-build-standalone/releases/download/20261110/cpython-3.12.16%2B20261110-aarch64-apple-darwin-install_only.tar.gz' \
      --output "$staging/python.tar.gz"
    echo "e956e60bc9465d577ef8062059aa05cd3a2665b4b8678a2ed24e432368330b8f  $staging/python.tar.gz" | shasum -a 256 -c -
    tar -xzf "$staging/python.tar.gz" -C "$staging"
    mv "$staging/python" "$python_home"
  fi
  "$python_home/bin/python3" -m venv "$runtime"
elif [[ ! -x "$runtime/bin/python" ]]; then
  python3 -m venv "$runtime"
fi
if ! "$runtime/bin/python" -c 'import flask, mlx_whisper, mlx_lm, yt_dlp' >/dev/null 2>&1; then
  "$runtime/bin/python" -m pip install -q flask mlx-whisper mlx-lm yt-dlp
fi
# Голоса: разделение на этом Mac (sherpa-onnx) и две небольшие модели (~33 МБ).
# Не вышло — модуль работает как раньше, все реплики придут одним голосом.
if ! "$runtime/bin/python" -c 'import sherpa_onnx' >/dev/null 2>&1; then
  "$runtime/bin/python" -m pip install -q sherpa-onnx || echo 'Голоса: не удалось поставить sherpa-onnx — разделение голосов выключено'
fi
voices="$HOME/Library/Application Support/Iskra/transcription/voice-models"
mkdir -p "$voices"
if [[ ! -f "$voices/sherpa-onnx-pyannote-segmentation-3-0/model.onnx" ]]; then
  curl -fsSL https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2 | tar xj -C "$voices" || echo 'Голоса: модель не скачалась'
fi
if [[ ! -f "$voices/wespeaker_resnet34.onnx" ]]; then
  curl -fsSL -o "$voices/wespeaker_resnet34.onnx" https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_resnet34.onnx || echo 'Голоса: модель не скачалась'
fi
# Слайды: заголовки читает маленькая программа на Swift, её собирает swiftc из
# Xcode Command Line Tools. Нет компилятора — модуль работает как обычно, только
# заголовки слайдов не распознаются; расшифровка, паузы и голоса не зависят от него.
if [[ -x "${ISKRA_FRAME_TEXT:-}" ]]; then
  export ISKRA_FRAME_TEXT
elif [[ "${ISKRA_PACKAGED_MODULE:-}" != 1 ]] && command -v swiftc >/dev/null 2>&1 && swiftc frame_text.swift -o "$runtime/frame-text" 2>/dev/null; then
  export ISKRA_FRAME_TEXT="$runtime/frame-text"
else
  echo 'Слайды: компилятор Swift недоступен — заголовки слайдов не распознаются.'
fi
# Скрипт запускается фоновым агентом Искры. Большие модели загружаются при
# первой расшифровке, а не при установке или подключении компьютера.
exec "$runtime/bin/python" server.py
