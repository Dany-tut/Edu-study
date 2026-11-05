#!/bin/zsh
set -eu
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:$PATH"
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
command -v ffmpeg >/dev/null || { echo 'Установите FFmpeg (brew install ffmpeg)'; exit 1; }
swiftc frame_text.swift -o "$runtime/frame-text"
export ISKRA_FRAME_TEXT="$runtime/frame-text"
exec "$runtime/bin/python" server.py
