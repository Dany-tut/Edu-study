"""Переключатели ускорения расшифровки (волна 2). Всё — за флагами окружения,
по умолчанию выключено: поведение модуля без этих переменных не меняется.

  ISKRA_ASR_ENGINE      whisper (по умолчанию) | gigaam | auto
      whisper — как раньше: mlx-whisper large-v3-turbo (многоязычный, с пунктуацией).
      gigaam  — GigaAM v2 CTC (sherpa-onnx) для русской речи: быстрее на CPU,
                но текст строчный и без пунктуации (char-CTC, только кириллица).
      auto    — пробуем язык первого куска через whisper; русский монолог → GigaAM,
                смешанная речь (RU+KO/EN/JA) → whisper.
  ISKRA_VAD_SEGMENT     1 — резать аудио на куски по паузам (Silero VAD), границы
                        попадают в тишину, слова на стыках не рвутся. Пусто → как
                        раньше: ffmpeg режет ровно по 90 с.
  ISKRA_WORD_TIMESTAMPS 1 — добавить пословные таймкоды (поле words у реплики,
                        аддитивно). Пусто → поля нет, формат как раньше.

Пути к моделям (переопределяются; по умолчанию — папка asr-models модуля):
  ISKRA_ASR_ASSETS   каталог моделей (по умолчанию HOME/asr-models)
  ISKRA_GIGAAM_MODEL, ISKRA_GIGAAM_TOKENS   модель и токены GigaAM
  ISKRA_VAD_MODEL    silero_vad.onnx
"""
import os
from pathlib import Path

# Официальная сборка k2-fsa, лицензия MIT (GigaChat Team) — можно в коммерческом
# продукте. Версия v1 (2024-10-24) была non-commercial, её не берём.
GIGAAM_DIRNAME = 'sherpa-onnx-nemo-ctc-giga-am-v2-russian-2025-04-19'


def _truthy(value):
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _home():
    return Path(os.environ.get('ISKRA_TRANSCRIPTION_HOME',
                               str(Path.home() / 'Library/Application Support/Iskra/transcription')))


def asr_assets_dir():
    return Path(os.environ.get('ISKRA_ASR_ASSETS', str(_home() / 'asr-models')))


def engine():
    value = os.environ.get('ISKRA_ASR_ENGINE', 'whisper').strip().lower()
    return value if value in ('whisper', 'gigaam', 'auto') else 'whisper'


def vad_segment_enabled():
    return _truthy(os.environ.get('ISKRA_VAD_SEGMENT', ''))


def word_timestamps_enabled():
    return _truthy(os.environ.get('ISKRA_WORD_TIMESTAMPS', ''))


def gigaam_paths():
    base = asr_assets_dir() / GIGAAM_DIRNAME
    model = Path(os.environ.get('ISKRA_GIGAAM_MODEL', str(base / 'model.int8.onnx')))
    tokens = Path(os.environ.get('ISKRA_GIGAAM_TOKENS', str(base / 'tokens.txt')))
    return model, tokens


def silero_path():
    return Path(os.environ.get('ISKRA_VAD_MODEL', str(asr_assets_dir() / 'silero_vad.onnx')))
