#!/bin/zsh
set -eu
cd "${0:A:h}"
# macOS помечает скачанные файлы карантином и отказывается их открывать
# («Файл не был открыт?»). Снимаем метку со всей распакованной папки — тогда
# и start.command, и вложенный ffmpeg запускаются без вопросов.
xattr -dr com.apple.quarantine "$PWD" 2>/dev/null || true
chmod +x "$PWD/ffmpeg" 2>/dev/null || true
# Вложенный ffmpeg (статический, Apple Silicon) — первым в PATH, чтобы его
# нашли и наши скрипты, и распознавание речи (mlx-whisper зовёт ffmpeg из PATH).
# Homebrew — запасной путь для машин, где ffmpeg уже стоит.
export PATH="$PWD:/opt/homebrew/bin:$PATH"
if [[ -x "$PWD/ffmpeg" ]]; then
  export ISKRA_FFMPEG="$PWD/ffmpeg"
elif ! command -v ffmpeg >/dev/null; then
  echo 'FFmpeg не найден. Скачайте модуль заново из профиля Искры.'
  exit 1
fi
runtime="$HOME/Library/Application Support/Iskra/transcription-runtime"
mkdir -p "$runtime"
if [[ ! -x "$runtime/bin/python" ]]; then python3 -m venv "$runtime"; fi
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
for model in mlx-community/whisper-large-v3-turbo mlx-community/Qwen2.5-3B-Instruct-4bit; do
 cache="$HOME/.cache/huggingface/hub/models--${model//\//--}/snapshots"
 weights=("$cache"/*/*.safetensors(N))
 if (( ${#weights} )); then continue; fi
 "$runtime/bin/hf" download "$model" --include '*.json' '*.safetensors' '*.txt' '*.jinja' >/dev/null
done
# Слайды: заголовки читает маленькая программа на Swift, её собирает swiftc из
# Xcode Command Line Tools. Нет компилятора — модуль работает как обычно, только
# заголовки слайдов не распознаются; расшифровка, паузы и голоса не зависят от него.
if command -v swiftc >/dev/null 2>&1 && swiftc frame_text.swift -o "$runtime/frame-text" 2>/dev/null; then
  export ISKRA_FRAME_TEXT="$runtime/frame-text"
else
  echo 'Слайды: компилятор Swift недоступен — заголовки слайдов не распознаются.'
fi
exec "$runtime/bin/python" server.py
