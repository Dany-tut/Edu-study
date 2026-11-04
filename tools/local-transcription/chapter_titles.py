"""Validate the final model response, including the translation retry."""
import re

def valid_title(title):
    return (len(re.findall('[А-Яа-яЁё]', title)) >= 3
            and not re.search(r'[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]|[А-Яа-яЁё][a-zA-Z]|[a-zA-Z][А-Яа-яЁё]', title))

def checked_title(title, retry, number):
    if valid_title(title):
        return title
    translated = retry(title)
    return translated if valid_title(translated) else f'Фрагмент {number}'
