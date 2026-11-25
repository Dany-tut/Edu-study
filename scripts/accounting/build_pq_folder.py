#!/usr/bin/env python3
"""Учебная папка выгрузок для урока «Из папки» (EXP07, Power Query).

Создаёт public/courses/accounting/vygruzki-dlya-power-query.zip:
  vygruzka_2026-01.xlsx, vygruzka_2026-02.xlsx, vygruzka_2026-03.xlsx — одинаковая структура
  (лист «Платежи», строка 1 — заголовки), вымышленные платежи Альфа/Бета/Гамма;
  README.txt — инструкция и эталон итогов (считается здесь же независимо от Excel).
Запуск: python scripts/accounting/build_pq_folder.py
"""
import io
import zipfile
from collections import defaultdict
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font

OUT = Path(__file__).resolve().parents[2] / "public" / "courses" / "accounting" / "vygruzki-dlya-power-query.zip"
HEAD = ["ID платежа", "Организация", "Категория", "Сумма", "Статус"]
OK, NO = "Оплачено", "Не оплачено"

DATA = {
    "2026-01": [
        ("P2601-01", "Альфа", "Поставщик", 12000, OK),
        ("P2601-02", "Бета", "Аренда", 8000, OK),
        ("P2601-03", "Гамма", "Поставщик", 9000, OK),
        ("P2601-04", "Альфа", "Аренда", 4000, NO),
        ("P2601-05", "Бета", "Поставщик", 6000, NO),
        ("P2601-06", "Гамма", "Услуги", 3500, OK),
        ("P2601-07", "Альфа", "Поставщик", 2000, OK),
    ],
    "2026-02": [
        ("P2602-01", "Альфа", "Поставщик", 15000, OK),
        ("P2602-02", "Бета", "Аренда", 8000, OK),
        ("P2602-03", "Гамма", "Услуги", 5000, NO),
        ("P2602-04", "Альфа", "Аренда", 4000, OK),
        ("P2602-05", "Гамма", "Поставщик", 7500, OK),
        ("P2602-06", "Бета", "Услуги", 2500, NO),
    ],
    "2026-03": [
        ("P2603-01", "Альфа", "Поставщик", 11000, OK),
        ("P2603-02", "Бета", "Аренда", 8000, OK),
        ("P2603-03", "Гамма", "Поставщик", 10000, OK),
        ("P2603-04", "Альфа", "Аренда", 4000, NO),
        ("P2603-05", "Бета", "Поставщик", 6500, OK),
        ("P2603-06", "Гамма", "Услуги", 3000, NO),
        ("P2603-07", "Альфа", "Услуги", 1500, OK),
        ("P2603-08", "Бета", "Услуги", 2000, OK),
    ],
}


def book_bytes(rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Платежи"
    ws.append(HEAD)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(list(r))
    for col, w in zip("ABCDE", (14, 14, 14, 10, 14)):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def etalon():
    lines = []
    per_file = {m: len(rows) for m, rows in DATA.items()}
    allrows = [r for rows in DATA.values() for r in rows]
    by_org, by_status = defaultdict(int), defaultdict(int)
    for r in allrows:
        by_org[r[1]] += r[3]
        by_status[r[4]] += r[3]
    two = per_file["2026-01"] + per_file["2026-02"]
    sum_two = sum(r[3] for m in ("2026-01", "2026-02") for r in DATA[m])
    lines.append("ЭТАЛОН ИТОГОВ (все данные вымышлены)")
    lines.append("")
    lines.append("Строк данных в файлах (без строки заголовков):")
    for m, n in per_file.items():
        lines.append(f"  vygruzka_{m}.xlsx — {n}")
    lines.append(f"Первые два файла (январь, февраль): {two} строк, сумма {sum_two}")
    lines.append(f"Все три файла: {len(allrows)} строк, сумма {sum(r[3] for r in allrows)}")
    lines.append("")
    lines.append("Сумма по организациям (три файла):")
    for k in ("Альфа", "Бета", "Гамма"):
        lines.append(f"  {k} — {by_org[k]}")
    lines.append("Сумма по статусам (три файла):")
    for k in (OK, NO):
        lines.append(f"  {k} — {by_status[k]}")
    return "\n".join(lines), len(allrows), sum(r[3] for r in allrows)


README_HEAD = """УЧЕБНАЯ ПАПКА ВЫГРУЗОК ДЛЯ POWER QUERY (курс «Бухгалтерия», Искра)

Все данные вымышлены: организации «Альфа», «Бета», «Гамма», суммы и ID придуманы.
Настоящих платежей и персональных данных здесь нет.

Что внутри:
  vygruzka_2026-01.xlsx, vygruzka_2026-02.xlsx, vygruzka_2026-03.xlsx
  В каждом листе «Платежи» одинаковые столбцы: ID платежа, Организация, Категория, Сумма, Статус.

Как использовать:
  1. Распакуйте архив. Создайте на диске пустую папку «Учебные выгрузки».
  2. Скопируйте в неё ТОЛЬКО два файла: январь и февраль. README.txt в эту папку не кладите.
  3. Выполните урок: Данные → Получить данные → Из файла → Из папки.
  4. Сверьте число строк с эталоном ниже.
  5. Добавьте в папку файл за март, нажмите Данные → Обновить всё и сверьте снова.
  6. Итоговую книгу храните ВНЕ папки «Учебные выгрузки».

"""


def main():
    text, n, total = etalon()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for m, rows in DATA.items():
            zi = zipfile.ZipInfo(f"vygruzki-dlya-power-query/vygruzka_{m}.xlsx", date_time=(2026, 11, 25, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, book_bytes(rows))
        zi = zipfile.ZipInfo("vygruzki-dlya-power-query/README.txt", date_time=(2026, 11, 25, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, (README_HEAD + text + "\n").encode("utf-8"))
    print(OUT, OUT.stat().st_size)
    print(text)


if __name__ == "__main__":
    main()
