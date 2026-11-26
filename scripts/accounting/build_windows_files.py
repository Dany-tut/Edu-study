#!/usr/bin/env python3
"""Учебные файлы для уроков m01-08 (поиск) и m01-09 (пакетное переименование), курс «Бухгалтерия».

Создаёт public/courses/accounting/uchebnye-fajly-windows.zip:
  Vypiski/ — пять учебных PDF «Выписка 01.11.2026.pdf» … «Выписка 05.11.2026.pdf» (для PowerRename);
  Buhgalteriya_uchebnaya/ — дерево с именованными по правилу файлами (для поиска в Проводнике);
  README.txt — инструкция и эталон (число найденных файлов считается здесь же независимо от Проводника).
Все данные вымышлены; PDF — минимальные, с одной строкой текста.
Запуск: python scripts/accounting/build_windows_files.py
"""
import fnmatch
import io
import zipfile
from pathlib import Path

from openpyxl import Workbook

OUT = Path(__file__).resolve().parents[2] / "public" / "courses" / "accounting" / "uchebnye-fajly-windows.zip"
DT = (2026, 11, 25, 0, 0, 0)

PDF_TMPL = (
    b"%%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length %d>>stream\n%s\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"trailer<</Root 1 0 R/Size 6>>\n%%%%EOF\n"
)


def pdf(text):
    stream = ("BT /F1 12 Tf 20 50 Td (%s) Tj ET" % text).encode("ascii")
    return PDF_TMPL % (len(stream), stream)


def xlsx(title):
    wb = Workbook()
    ws = wb.active
    ws.title = "Лист1"
    ws.append(["Учебный файл", title])
    ws.append(["Все данные вымышлены", ""])
    b = io.BytesIO()
    wb.save(b)
    return b.getvalue()


ROOT = "Buhgalteriya_uchebnaya"
TREE = [
    ("Альфа/2026/2026-10 октябрь/05 Сверки/2026-10_Альфа_Акт-сверки_v1.xlsx", "x"),
    ("Альфа/2026/2026-11 ноябрь/01 Банк/2026-11_Альфа_Выписка-банк_v1.pdf", "p"),
    ("Бета/2026/2026-10 октябрь/01 Банк/2026-10_Бета_Выписка-банк_v1.pdf", "p"),
    ("Бета/2026/2026-10 октябрь/05 Сверки/2026-10_Бета_Акт-сверки_v1.xlsx", "x"),
    ("Бета/2026/2026-10 октябрь/05 Сверки/2026-10_Бета_Сверка-с-банком_v2.xlsx", "x"),
    ("Гамма/2026/2026-10 октябрь/03 Зарплата/2026-10_Гамма_Ведомость_v3.xlsx", "x"),
]


def main():
    names = [p.rsplit("/", 1)[1] for p, _ in TREE]
    xl = [n for n in names if fnmatch.fnmatch(n.lower(), "*.xlsx")]
    beta = [n for n in names if fnmatch.fnmatch(n.lower(), "2026-10_бета*сверк*")]
    readme = "\n".join([
        "УЧЕБНЫЕ ФАЙЛЫ WINDOWS (курс «Бухгалтерия», Искра). Все данные вымышлены.",
        "",
        "1) Урок «Пакетное переименование файлов» (m01-09): папка Vypiski — пять PDF «Выписка ДД.11.2026.pdf».",
        "   Работайте с КОПИЕЙ папки. После PowerRename (Search for: Выписка (\\d{2})\\.(\\d{2})\\.(\\d{4});",
        "   Replace with: $3-$2-$1_Альфа_Выписка) имена: 2026-11-01_Альфа_Выписка.pdf … 2026-11-05_Альфа_Выписка.pdf.",
        "",
        "2) Урок «Поиск файлов в Windows» (m01-08): папка Buhgalteriya_uchebnaya — готовое дерево.",
        "   Откройте корень этой папки и введите запрос в поле поиска Проводника.",
        f"   Запрос  *.xlsx  — эталон: {len(xl)} файла(ов).",
        f"   Запрос  2026-10_Бета*Сверк*  — эталон: {len(beta)} файла(ов): " + "; ".join(beta) + ".",
        "   Запрос  Бета  — найдёт и папку «Бета», и файлы с «Бета» в имени.",
        "   Если поиск ничего не находит: папка не в индексируемом расположении — см. урок.",
        "",
        "Распакуйте архив в папку «Документы», не открывайте файлы из архива напрямую.",
    ])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        def put(name, data):
            zi = zipfile.ZipInfo(name, date_time=DT)
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data)
        for d in range(1, 6):
            put(f"uchebnye-fajly-windows/Vypiski/Выписка {d:02d}.11.2026.pdf", pdf(f"Uchebnaya vypiska {d:02d}.11.2026 (vymyshlennye dannye)"))
        for path, kind in TREE:
            title = path.rsplit("/", 1)[1]
            data = xlsx(title) if kind == "x" else pdf("Uchebnyj fajl")
            put(f"uchebnye-fajly-windows/{ROOT}/{path}", data)
        put("uchebnye-fajly-windows/README.txt", readme.encode("utf-8"))
    print(OUT, OUT.stat().st_size)
    print(readme)


if __name__ == "__main__":
    main()
