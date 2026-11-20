"""GigaAM v2 CTC через sherpa-onnx — быстрый ASR для русского монолога.

За флагом ISKRA_ASR_ENGINE (см. asr_config). Модель — char-level CTC по кириллице:
текст строчный, без пунктуации. Поэтому это эксперимент, а не замена whisper.

Сегменты строим по паузам между символами (таймкоды токенов): разрыв дольше
SEG_GAP или кусок длиннее SEG_MAX начинает новую реплику — так editor получает
реплики похожей зернистости, как от whisper, а не одну простыню на кусок.
"""
import re

SEG_GAP = 0.6   # пауза между символами дольше этого — новая реплика
SEG_MAX = 16.0  # и реплику не тянем длиннее стольких секунд


def available(model, tokens):
    from pathlib import Path
    return Path(model).is_file() and Path(tokens).is_file()


# Латиница/иероглифы в русской расшифровке — повод оставить кусок на whisper.
_HANGUL = re.compile(r'[가-힣]')
_KANA = re.compile(r'[぀-ヿ]')
_HAN = re.compile(r'[一-鿿]')
_LATIN = re.compile(r'[a-z]', re.IGNORECASE)
_LETTER = re.compile(r'[^\W\d_]', re.UNICODE)


def looks_mixed(language, text, latin_ratio=0.12):
    """True — в куске есть неслучайная не-русская речь (её GigaAM не распознает)."""
    if language and language != 'ru':
        return True
    if _HANGUL.search(text) or _KANA.search(text) or _HAN.search(text):
        return True
    letters = _LETTER.findall(text)
    latin = _LATIN.findall(text)
    return bool(letters) and len(latin) / len(letters) >= latin_ratio


class GigaAM:
    """Ленивая обёртка: модель грузится один раз, живёт на весь процесс."""

    def __init__(self, model, tokens, num_threads=4):
        import sherpa_onnx
        self.recognizer = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(
            model=str(model), tokens=str(tokens), num_threads=num_threads)

    def recognize(self, samples, rate):
        """samples — float32 [-1,1], моно. → (text, timestamps[], tokens[])."""
        stream = self.recognizer.create_stream()
        stream.accept_waveform(rate, samples)
        self.recognizer.decode_stream(stream)
        result = stream.result
        return result.text, list(result.timestamps or []), list(result.tokens or [])


def segments_from_ctc(tokens, timestamps, shift=0.0, want_words=False):
    """Токены-символы GigaAM → реплики с таймкодами. shift — начало куска в записи.

    tokens: ['п','р','и',' ','в',...]; timestamps — старт каждого токена, с.
    Пробел разделяет слова; длинная пауза или перебор длины — новую реплику.
    """
    if not tokens or len(tokens) != len(timestamps):
        return []
    segments = []
    cur_chars, cur_words, word_chars = [], [], []
    seg_start = word_start = None
    last_end = None

    def flush_word(end):
        nonlocal word_chars, word_start
        if word_chars and word_start is not None:
            cur_words.append({'text': ''.join(word_chars), 'start': word_start, 'end': end})
        word_chars, word_start = [], None

    def flush_segment(end):
        nonlocal cur_chars, cur_words, seg_start
        text = ''.join(cur_chars).strip()
        if text and seg_start is not None and end is not None:
            seg = {'start': round(shift + seg_start, 3), 'end': round(shift + end, 3), 'text': text}
            if want_words and cur_words:
                seg['words'] = [{'word': w['text'], 'start': round(shift + w['start'], 3),
                                 'end': round(shift + w['end'], 3)} for w in cur_words if w['text'].strip()]
            segments.append(seg)
        cur_chars, cur_words, seg_start = [], [], None

    char_dur = 0.06  # у char-CTC нет конца токена: берём маленький хвост
    for token, start in zip(tokens, timestamps):
        if seg_start is None:
            seg_start = start
        # Разрыв во времени или слишком длинная реплика — закрываем предыдущую.
        if last_end is not None and (start - last_end >= SEG_GAP or start - seg_start >= SEG_MAX):
            flush_word(last_end)
            flush_segment(last_end)
            seg_start = start
        if token == ' ' or token == '':
            flush_word(last_end if last_end is not None else start)
            cur_chars.append(' ')
        else:
            if word_start is None:
                word_start = start
            word_chars.append(token)
            cur_chars.append(token)
        last_end = start + char_dur
    flush_word(last_end)
    flush_segment(last_end)
    return segments
