#!/usr/bin/env python3
"""Учебная папка выгрузок для урока «Из папки» (EXP07, Power Query).

Создаёт public/courses/accounting/vygruzki-dlya-power-query.zip:
  vygruzka_2026-01.xlsx, vygruzka_2026-02.xlsx, vygruzka_2026-03.xlsx — одинаковая структура
  (лист «Платежи», строка 1 — заголовки), вымышленные платежи Альфа/Бета/Гамма;
  README.txt — инструкция и эталон итогов (считается здесь же независимо от Excel).
Папка «dop-fajly» (для уроков об импорте и ошибках; в основную папку выгрузок её НЕ кладут):
  vygruzka_2026-04.csv — кодировка Windows-1251 (cp1251), разделитель «;», десятичная запятая;
  vygruzka_2026-05_oshibka-struktury.xlsx — лишний столбец «Комментарий» и другое имя «Сумма руб»;
  vygruzka_2026-06_nd-v-summe.xlsx — та же структура, но в одной ячейке «Сумма» текст «н/д».
Старый XLS и PDF здесь не создаются (нет надёжной библиотеки): их ученик делает из своего файла по уроку.
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


EXTRA_CSV = [
    ("P2604-01", "Альфа", "Поставщик", "13000,00", OK),
    ("P2604-02", "Бета", "Аренда", "8000,00", OK),
    ("P2604-03", "Гамма", "Поставщик", "9500,50", NO),
    ("P2604-04", "Альфа", "Аренда", "4000,00", OK),
    ("P2604-05", "Бета", "Услуги", "2500,00", OK),
    ("P2604-06", "Гамма", "Услуги", "3000,00", NO),
]
HEAD_ERR = ["ID платежа", "Организация", "Категория", "Сумма руб", "Статус", "Комментарий"]
EXTRA_ERR = [
    ("P2605-01", "Альфа", "Поставщик", 14000, OK, "по акту 5"),
    ("P2605-02", "Бета", "Аренда", 8000, OK, ""),
    ("P2605-03", "Гамма", "Услуги", 3500, NO, "ждём счёт"),
    ("P2605-04", "Альфа", "Аренда", 4000, OK, ""),
]
EXTRA_ND = [
    ("P2606-01", "Альфа", "Поставщик", 16000, OK),
    ("P2606-02", "Бета", "Аренда", 8000, OK),
    ("P2606-03", "Гамма", "Поставщик", "н/д", NO),
    ("P2606-04", "Альфа", "Услуги", 2000, OK),
]


def csv_bytes():
    lines = [";".join(HEAD)] + [";".join(str(x) for x in r) for r in EXTRA_CSV]
    return ("\r\n".join(lines) + "\r\n").encode("cp1251")


def book_generic(head, rows, widths):
    wb = Workbook()
    ws = wb.active
    ws.title = "Платежи"
    ws.append(head)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(list(r))
    for i, w in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = w
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def etalon_extra():
    csv_sum = sum(float(r[3].replace(",", ".")) for r in EXTRA_CSV)
    err_sum = sum(r[3] for r in EXTRA_ERR)
    nd_sum = sum(r[3] for r in EXTRA_ND if isinstance(r[3], (int, float)))
    L = ["", "ЭТАЛОН ДЛЯ ФАЙЛОВ ИЗ ПАПКИ dop-fajly (не кладите её в основную папку выгрузок)", ""]
    L.append(f"vygruzka_2026-04.csv — {len(EXTRA_CSV)} строк, сумма " + f"{csv_sum:.2f}".replace(".", ","))
    L.append("  Если при открытии вместо русских букв «кракозябры» — выберите кодировку 1251: Windows (кириллица), разделитель — точка с запятой.")
    L.append("  Если в Сумме остался текст «13000,00» — укажите локаль «Русский» при изменении типа на число.")
    L.append(f"vygruzka_2026-05_oshibka-struktury.xlsx — {len(EXTRA_ERR)} строк, сумма {err_sum}")
    L.append("  Ошибка структуры: столбец называется «Сумма руб», а не «Сумма», и есть лишний «Комментарий».")
    L.append("  При объединении с тремя основными файлами: в столбце «Сумма» у этих строк будет null, появятся новые столбцы «Сумма руб» и «Комментарий».")
    L.append("  Общее число строк тогда: 21 (основные) + 4 = 25; сумма столбца «Сумма» остаётся 132500, а «Сумма руб» = 29500.")
    L.append(f"vygruzka_2026-06_nd-v-summe.xlsx — {len(EXTRA_ND)} строк, в ячейке «Сумма» строки P2606-03 текст «н/д»")
    L.append(f"  Сумма числовых значений {nd_sum}. После смены типа столбца на «Десятичное число» в этой ячейке будет Error (3 строки без ошибки).")
    L.append("  Исправление: либо заменить «н/д» на пустое значение (null) ДО смены типа, либо удалить/заменить ошибки командами для ошибок в меню Power Query (названия сверьте в своей версии).")
    return "\n".join(L)


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
    return "\n".join(lines) + "\n" + etalon_extra(), len(allrows), sum(r[3] for r in allrows)


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

Дополнительные файлы (папка dop-fajly, для уроков об импорте CSV и об ошибках структуры):
  vygruzka_2026-04.csv — CSV в кодировке Windows-1251 с разделителем «;».
  vygruzka_2026-05_oshibka-struktury.xlsx — файл с другой структурой (лишний столбец, другое имя столбца).
  vygruzka_2026-06_nd-v-summe.xlsx — файл с текстом «н/д» в столбце «Сумма».
  Старого XLS и PDF здесь нет: сохраните свой файл как «Книга Excel 97–2003 (*.xls)» и как PDF по уроку.

"""


def main():
    text, n, total = etalon()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for m, rows in DATA.items():
            zi = zipfile.ZipInfo(f"vygruzki-dlya-power-query/vygruzka_{m}.xlsx", date_time=(2026, 11, 25, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, book_bytes(rows))
        for name, data in (
            ("vygruzka_2026-04.csv", csv_bytes()),
            ("vygruzka_2026-05_oshibka-struktury.xlsx", book_generic(HEAD_ERR, EXTRA_ERR, (14, 14, 14, 12, 14, 16))),
            ("vygruzka_2026-06_nd-v-summe.xlsx", book_generic(HEAD, EXTRA_ND, (14, 14, 14, 10, 14))),
        ):
            zi = zipfile.ZipInfo(f"vygruzki-dlya-power-query/dop-fajly/{name}", date_time=(2026, 11, 25, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data)
        zi = zipfile.ZipInfo("vygruzki-dlya-power-query/README.txt", date_time=(2026, 11, 25, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, (README_HEAD + text + "\n").encode("utf-8"))
    print(OUT, OUT.stat().st_size)
    print(text)


if __name__ == "__main__":
    main()
