"""Переключатели ускорения расшифровки (волна 2). Всё — за флагами окружения,
по умолчанию выключено: поведение модуля без этих переменных не меняется.

  ISKRA_ASR_ENGINE      whisper (по умолчанию) | gigaam | auto
      whisper — как раньше: mlx-whisper large-v3-turbo (многоязычный, с пунктуацией).
      gigaam  — GigaAM v3 e2e-CTC (sherpa-onnx) для русской речи: быстрее, и — в
                отличие от v2 — С ПУНКТУАЦИЕЙ и заглавными (BPE-модель).
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

# GigaAM v3 e2e-CTC: лицензия MIT (salute-developers/GigaChat Team) — можно в
# коммерческом продукте. e2e-вариант даёт пунктуацию и заглавные (BPE, 256 токенов),
# что снимает главный минус GigaAM против whisper. Качается с зеркала sherpa-onnx
# на HF (официальных v3 в релизах k2-fsa пока нет). Загрузчик — from_nemo_ctc, тот
# же, что для v2, поэтому на свой путь (ISKRA_GIGAAM_MODEL) можно поставить и v2
# (sherpa-onnx-nemo-ctc-giga-am-v2-russian-2025-04-19/model.int8.onnx + tokens.txt),
# и любой другой CTC-экспорт. RNN-T-экспорты этим загрузчиком не грузятся.
GIGAAM_DIRNAME = 'gigaam-v3-e2e-ctc'
GIGAAM_MODEL_FILE = 'gigaam_v3_e2e_ctc_int8.onnx'
GIGAAM_TOKENS_FILE = 'gigaam_v3_e2e_ctc_tokens.txt'
GIGAAM_HF_REPO = 'Smirnov75/GigaAM-v3-sherpa-onnx'


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
    model = Path(os.environ.get('ISKRA_GIGAAM_MODEL', str(base / GIGAAM_MODEL_FILE)))
    tokens = Path(os.environ.get('ISKRA_GIGAAM_TOKENS', str(base / GIGAAM_TOKENS_FILE)))
    return model, tokens


def silero_path():
    return Path(os.environ.get('ISKRA_VAD_MODEL', str(asr_assets_dir() / 'silero_vad.onnx')))
