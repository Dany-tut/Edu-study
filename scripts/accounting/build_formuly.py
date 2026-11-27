# -*- coding: utf-8 -*-
"""Учебный файл «Формулы для вашей работы» (модуль EXT07 курса «Бухгалтерия»).

    python scripts/accounting/build_formuly.py            — собрать public/courses/accounting/formuly-dlya-raboty.xlsx
    python scripts/accounting/build_formuly.py --check-ts — дополнительно проверить, что числа из листа «Проверка»
                                                              встречаются в src/data/accounting/ext07.ts

Как проверяется. Эталоны считаются здесь на Python независимо от формул (обычная арифметика,
datetime, Decimal). Затем собранная книга пересчитывается мини-вычислителем `_xleval.py`
(расширен ниже функциями дат, ПРОСМОТР, ПЛТ, ЧПС и др.), и каждое значение формулы сравнивается
с эталоном. Это «проверено программно», а не «проверено в Excel»: Excel у автора курса нет.

Формулы книги — только функции Excel 2007, кроме ячеек, помеченных «современный вариант»
(ЕФОРМУЛА — Excel 2013+ по алфавитному списку Microsoft, на странице функции — 2016+).
Данные вымышленные: организации «Дорстрой», «Домстрой», «АБЗ», «Трансавто», «Бетон», «ЖБИ», «Знак».
"""
import calendar
import datetime as dt
import math
import os
import re
import sys
from decimal import Decimal, ROUND_HALF_UP

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import _xleval as X  # noqa: E402

OUT = os.path.join(ROOT, 'public', 'courses', 'accounting', 'formuly-dlya-raboty.xlsx')
KAL = os.path.join(ROOT, 'public', 'courses', 'accounting', 'kalendar-srokov-2027.xlsx')
TS = os.path.join(ROOT, 'src', 'data', 'accounting', 'ext07.ts')

BASE = dt.date(1899, 12, 30)
DATE_FMT = 'DD.MM.YYYY'
MONEY = '#,##0.00'
HEAD = Font(bold=True)
FORM = PatternFill('solid', fgColor='FFF2CC')   # ячейки с формулой
INPUT = PatternFill('solid', fgColor='DDEBF7')  # исходные данные, которые можно менять
MODERN = PatternFill('solid', fgColor='E2EFDA')  # современный вариант


def ser(d):
    return (d - BASE).days


def from_ser(n):
    return BASE + dt.timedelta(days=int(n))


def r(x, n=2):
    """ОКРУГЛ как в Excel: половина — от нуля."""
    q = Decimal(1).scaleb(-n)
    return float(Decimal(repr(x)).quantize(q, rounding=ROUND_HALF_UP))


D = dt.date
CHECKS = []  # (лист, ячейка, эталон, что проверяем)


def check(ws, cell, expected, what):
    CHECKS.append((ws.title, cell, expected, what))


def put(ws, cell, v, fmt=None, fill=None, bold=False):
    c = ws[cell]
    c.value = v
    if fmt:
        c.number_format = fmt
    if fill is None and isinstance(v, str) and v.startswith('='):
        fill = FORM
    if fill:
        c.fill = fill
    if bold:
        c.font = HEAD
    return c


def table(ws, top_left, rows, fmts=None, header=True, fill=INPUT):
    col0 = openpyxl.utils.column_index_from_string(re.match(r'[A-Z]+', top_left).group(0))
    row0 = int(re.search(r'\d+', top_left).group(0))
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            cell = f'{get_column_letter(col0 + j)}{row0 + i}'
            f = (fmts or {}).get(j) if not (header and i == 0) else None
            put(ws, cell, v, fmt=f, bold=header and i == 0,
                fill=None if (header and i == 0) or (isinstance(v, str) and v.startswith('=')) else fill)


def note(ws, cell, text):
    c = ws[cell]
    c.value = text
    c.font = Font(italic=True, color='555555')
    c.alignment = Alignment(wrap_text=False)


def widths(ws, w):
    for k, v in w.items():
        ws.column_dimensions[k].width = v


# ───────────────────────── 1. Факты квартала ─────────────────────────
FACTS = [
    ('Q2', 'Дорстрой', 'Выручка', 5200000), ('Q3', 'Дорстрой', 'Выручка', 6800000),
    ('Q3', 'Дорстрой', 'Выручка', 1150000), ('Q3', 'Дорстрой', 'Себестоимость', 5900000),
    ('Q3', 'АБЗ', 'Выручка', 4300000), ('Q3', 'АБЗ', 'Себестоимость', 3100000),
    ('Q3', 'Трансавто', 'Выручка', 2400000), ('Q3', 'Трансавто', 'Себестоимость', 1950000),
    ('Q3', 'Бетон', 'Выручка', 3750000), ('Q3', 'Бетон', 'Себестоимость', 2980000),
    ('Q2', 'АБЗ', 'Выручка', 3900000), ('Q3', 'Знак', 'Выручка', 860000),
]
ORGS1 = ['Дорстрой', 'АБЗ', 'Трансавто', 'Бетон', 'Знак']


def s_facts(wb):
    ws = wb.create_sheet('1_Факты')
    table(ws, 'A1', [('Период', 'Организация', 'Статья', 'Сумма, руб', 'Ключ')] + [f + (None,) for f in FACTS], {3: MONEY})
    for i in range(2, 2 + len(FACTS)):
        put(ws, f'E{i}', f'=B{i}&"|"&C{i}&"|"&A{i}')
    n = 1 + len(FACTS)
    exp = lambda p, o, s: sum(v for (pp, oo, ss, v) in FACTS if pp == p and oo == o and ss == s)
    put(ws, 'G1', 'Период', bold=True); put(ws, 'H1', 'Q3', fill=INPUT)
    for j, h in enumerate(['Организация', 'Выручка', 'Себестоимость', 'Результат']):
        put(ws, f'{"GHIJ"[j]}3', h, bold=True)
    for k, o in enumerate(ORGS1):
        rr = 4 + k
        put(ws, f'G{rr}', o, fill=INPUT)
        for col in 'HI':
            put(ws, f'{col}{rr}', f'=SUMIFS($D$2:$D${n},$A$2:$A${n},$H$1,$B$2:$B${n},$G{rr},$C$2:$C${n},{col}$3)', MONEY)
        put(ws, f'J{rr}', f'=H{rr}-I{rr}', MONEY)
        check(ws, f'H{rr}', exp('Q3', o, 'Выручка'), f'Ступень 2: выручка {o} за Q3')
        check(ws, f'J{rr}', exp('Q3', o, 'Выручка') - exp('Q3', o, 'Себестоимость'), f'Результат {o} за Q3')
    put(ws, 'G9', 'Итого', bold=True)
    for col in 'HIJ':
        put(ws, f'{col}9', f'=SUM({col}4:{col}8)', MONEY)
    q3 = sum(v for (p, _, s, v) in FACTS if p == 'Q3' and s == 'Выручка')
    q3c = sum(v for (p, _, s, v) in FACTS if p == 'Q3' and s == 'Себестоимость')
    check(ws, 'H9', q3, 'Выручка группы до исключения ВГО, Q3')
    check(ws, 'J9', q3 - q3c, 'Результат всех организаций, Q3')
    put(ws, 'L1', 'Ступени формул', bold=True)
    put(ws, 'L2', f'=SUMIFS(D2:D{n},A2:A{n},"Q3",B2:B{n},"Дорстрой",C2:C{n},"Выручка")', MONEY)
    check(ws, 'L2', exp('Q3', 'Дорстрой', 'Выручка'), 'Ступень 1: СУММЕСЛИМН с условиями в кавычках')
    put(ws, 'L4', f'=SUMIF($E$2:$E${n},"Дорстрой|Выручка|Q3",$D$2:$D${n})', MONEY)
    check(ws, 'L4', exp('Q3', 'Дорстрой', 'Выручка'), 'Ступень 3: СУММЕСЛИ по ключу')
    put(ws, 'L5', f'=INDEX($D$2:$D${n},MATCH("Дорстрой|Выручка|Q3",$E$2:$E${n},0))', MONEY)
    check(ws, 'L5', 6800000, 'Ловушка: ИНДЕКС/ПОИСКПОЗ по ключу берёт только первую строку')
    put(ws, 'L7', f'=SUMIF(A2:A{n},"Q3",D2:D{n})', MONEY)
    put(ws, 'L8', '=IF(ABS(L7-(H9+I9))>0.01,"ОШИБКА","ОК")')
    check(ws, 'L7', q3 + q3c, 'Контроль: все строки Q3 из таблицы фактов')
    check(ws, 'L8', 'ОК', 'Контроль: матрица собрала все строки Q3')
    note(ws, 'L10', 'Ступень 4 (сводная): Вставка → Сводная таблица по A1:D13; строки — Организация, столбцы — Статья, фильтр — Период.')
    note(ws, 'L11', 'Затем в пустой ячейке наберите «=» и щёлкните по ячейке сводной: Excel сам вставит ПОЛУЧИТЬ.ДАННЫЕ.СВОДНОЙ.ТАБЛИЦЫ.')
    widths(ws, {'A': 8, 'B': 12, 'C': 15, 'D': 14, 'E': 26, 'G': 13, 'H': 14, 'I': 15, 'J': 14, 'L': 16})
    return {'dor_q3': exp('Q3', 'Дорстрой', 'Выручка'), 'q3': q3, 'q3c': q3c}


# ───────────────────────── 2. ВГО ─────────────────────────
SALES = [('АБЗ', 'Дорстрой', 2360000), ('АБЗ', 'Дорстрой', 590000), ('Бетон', 'Домстрой', 1180000),
         ('Трансавто', 'Дорстрой', 472000), ('Трансавто', 'АБЗ', 236000), ('ЖБИ', 'Домстрой', 708000),
         ('Знак', 'Дорстрой', 354000)]
BUYS = [('Дорстрой', 'АБЗ', 2950000), ('Домстрой', 'Бетон', 1180000), ('Дорстрой', 'Трансавто', 471999.5),
        ('АБЗ', 'Трансавто', 200000), ('Домстрой', 'ЖБИ', 708000)]
PAIRS = [('АБЗ', 'Дорстрой'), ('Бетон', 'Домстрой'), ('Трансавто', 'Дорстрой'), ('Трансавто', 'АБЗ'),
         ('ЖБИ', 'Домстрой'), ('Знак', 'Дорстрой')]
THRESH = 1


def s_vgo(wb):
    ws = wb.create_sheet('2_ВГО')
    table(ws, 'A1', [('Продавец', 'Покупатель', 'Сумма у продавца')] + SALES, {2: MONEY})
    table(ws, 'E1', [('Покупатель', 'Продавец', 'Сумма у покупателя')] + BUYS, {2: MONEY})
    put(ws, 'I1', 'Порог, руб', bold=True); put(ws, 'J1', THRESH, fill=INPUT)
    sellers = ['АБЗ', 'Бетон', 'Трансавто', 'ЖБИ', 'Знак']
    buyers = ['Дорстрой', 'Домстрой', 'АБЗ']
    put(ws, 'I3', 'Продавец \\ Покупатель', bold=True)
    for j, b in enumerate(buyers):
        put(ws, f'{"JKL"[j]}3', b, bold=True)
    put(ws, 'M3', 'Итого', bold=True)
    for k, s in enumerate(sellers):
        rr = 4 + k
        put(ws, f'I{rr}', s, fill=INPUT)
        for j, b in enumerate(buyers):
            col = 'JKL'[j]
            put(ws, f'{col}{rr}', f'=SUMIFS($C$2:$C$8,$A$2:$A$8,$I{rr},$B$2:$B$8,{col}$3)', MONEY)
            check(ws, f'{col}{rr}', sum(v for a, bb, v in SALES if a == s and bb == b), f'Матрица: {s} → {b}')
        put(ws, f'M{rr}', f'=SUM(J{rr}:L{rr})', MONEY)
    put(ws, 'I9', 'Итого', bold=True)
    for col in 'JKLM':
        put(ws, f'{col}9', f'=SUM({col}4:{col}8)', MONEY)
    tot = sum(v for *_, v in SALES)
    check(ws, 'M9', tot, 'Матрица: всего ВГО по данным продавцов')
    put(ws, 'I10', 'Контроль матрицы', bold=True)
    put(ws, 'J10', '=IF(ABS(M9-SUM(C2:C8))>0.01,"ОШИБКА","ОК")')
    check(ws, 'J10', 'ОК', 'Контроль: матрица = исходник')
    for j, h in enumerate(['Продавец', 'Покупатель', 'По продавцу', 'По покупателю', 'Разница', 'Статус']):
        put(ws, f'{"IJKLMN"[j]}11', h, bold=True)
    status = {}
    for k, (s, b) in enumerate(PAIRS):
        rr = 12 + k
        put(ws, f'I{rr}', s, fill=INPUT); put(ws, f'J{rr}', b, fill=INPUT)
        put(ws, f'K{rr}', f'=SUMIFS($C$2:$C$8,$A$2:$A$8,I{rr},$B$2:$B$8,J{rr})', MONEY)
        put(ws, f'L{rr}', f'=SUMIFS($G$2:$G$6,$E$2:$E$6,J{rr},$F$2:$F$6,I{rr})', MONEY)
        put(ws, f'M{rr}', f'=K{rr}-L{rr}', MONEY)
        put(ws, f'N{rr}', f'=IF(COUNTIFS($E$2:$E$6,J{rr},$F$2:$F$6,I{rr})=0,"нет пары",IF(ABS(M{rr})<=$J$1,"сходится","расхождение"))')
        a = sum(v for x, y, v in SALES if (x, y) == (s, b))
        c = sum(v for x, y, v in BUYS if (y, x) == (s, b))
        has = any((y, x) == (s, b) for x, y, _ in BUYS)
        st = 'нет пары' if not has else ('сходится' if abs(a - c) <= THRESH else 'расхождение')
        status[(s, b)] = (a, c, st)
        check(ws, f'M{rr}', a - c, f'Разница {s} → {b}')
        check(ws, f'N{rr}', st, f'Статус {s} → {b}')
    put(ws, 'I19', 'К исключению', bold=True)
    put(ws, 'K19', '=SUMIF(N12:N17,"сходится",K12:K17)', MONEY)
    put(ws, 'I20', 'Расхождения', bold=True)
    put(ws, 'K20', '=SUMIF(N12:N17,"расхождение",M12:M17)', MONEY)
    put(ws, 'I21', 'Без пары', bold=True)
    put(ws, 'K21', '=SUMIF(N12:N17,"нет пары",K12:K17)', MONEY)
    put(ws, 'I22', 'Сходится всё?', bold=True)
    put(ws, 'K22', '=IF(ABS(K19+SUMIF(N12:N17,"расхождение",K12:K17)+K21-M9)>0.01,"ОШИБКА","ОК")')
    elim = sum(a for a, c, st in status.values() if st == 'сходится')
    disc = sum(a - c for a, c, st in status.values() if st == 'расхождение')
    nop = sum(a for a, c, st in status.values() if st == 'нет пары')
    check(ws, 'K19', elim, 'Сумма к исключению (сошедшиеся пары)')
    check(ws, 'K20', disc, 'Сумма расхождений')
    check(ws, 'K21', nop, 'Сумма без пары')
    check(ws, 'K22', 'ОК', 'Контроль: три группы статусов = всё ВГО')
    widths(ws, {'A': 11, 'B': 12, 'C': 16, 'E': 12, 'F': 11, 'G': 18, 'I': 22, 'J': 12, 'K': 14, 'L': 14, 'M': 12, 'N': 13})
    return {'vgo_tot': tot, 'elim': elim, 'disc': disc, 'nop': nop}


# ───────────────────────── 3. Доли и мостик ─────────────────────────
REV = [('Дорстрой', 7950000), ('Домстрой', 3320000), ('АБЗ', 4300000), ('Трансавто', 2400000),
       ('Бетон', 3750000), ('ЖБИ', 1680000), ('Знак', 860000)]
POOL = 500000


def s_shares(wb, elim):
    ws = wb.create_sheet('3_Доли')
    table(ws, 'A1', [('Организация', 'Выручка, руб', 'Доля', 'Доля, % (1 знак)', 'Расходы УК, руб', 'С поправкой, руб')] + [(o, v) for o, v in REV], {1: MONEY})
    tot = sum(v for _, v in REV)
    put(ws, 'A9', 'Итого', bold=True)
    put(ws, 'B9', '=SUM(B2:B8)', MONEY)
    put(ws, 'H1', 'Общие расходы УК', bold=True); put(ws, 'I1', POOL, MONEY, INPUT)
    put(ws, 'H2', 'Разница округления', bold=True); put(ws, 'I2', '=I1-SUM(E2:E8)', '0.00')
    put(ws, 'H3', 'Строка крупнейшей', bold=True); put(ws, 'I3', '=MATCH(MAX(B2:B8),B2:B8,0)')
    alloc = [r(POOL * v / tot) for _, v in REV]
    diff = r(POOL - sum(alloc))
    big = max(range(len(REV)), key=lambda i: REV[i][1])
    for i, (o, v) in enumerate(REV):
        rr = 2 + i
        put(ws, f'C{rr}', f'=B{rr}/$B$9', '0.00%')
        put(ws, f'D{rr}', f'=ROUND(B{rr}/$B$9*100,1)', '0.0')
        put(ws, f'E{rr}', f'=ROUND($I$1*B{rr}/$B$9,2)', MONEY)
        put(ws, f'F{rr}', f'=E{rr}+IF(ROW(B{rr})-ROW($B$2)+1=$I$3,$I$2,0)', MONEY)
        check(ws, f'D{rr}', r(v / tot * 100, 1), f'Доля {o}, %')
        check(ws, f'E{rr}', alloc[i], f'Расходы УК {o} до поправки')
        check(ws, f'F{rr}', r(alloc[i] + (diff if i == big else 0)), f'Расходы УК {o} с поправкой')
    for col in 'DEF':
        put(ws, f'{col}9', f'=SUM({col}2:{col}8)', MONEY if col != 'D' else '0.0')
    check(ws, 'B9', tot, 'Сумма выручки компаний')
    check(ws, 'I2', diff, 'Разница округления')
    check(ws, 'I3', big + 1, 'Номер строки крупнейшей выручки')
    check(ws, 'E9', r(sum(alloc)), 'Сумма до поправки')
    check(ws, 'F9', POOL, 'Сумма с поправкой = общие расходы')
    put(ws, 'H5', 'Мостик', bold=True)
    put(ws, 'H6', 'Сумма компаний'); put(ws, 'I6', '=B9', MONEY)
    put(ws, 'H7', 'Исключено ВГО'); put(ws, 'I7', "='2_ВГО'!K19", MONEY)
    put(ws, 'H8', 'Выручка группы'); put(ws, 'I8', '=I6-I7', MONEY)
    check(ws, 'I8', tot - elim, 'Мостик: выручка группы')
    widths(ws, {'A': 12, 'B': 14, 'C': 9, 'D': 15, 'E': 16, 'F': 16, 'H': 20, 'I': 14})
    return {'rev_tot': tot, 'alloc': alloc, 'diff': diff, 'group': tot - elim}


# ───────────────────────── 4. Калькуляция ─────────────────────────
RECIPE = [('Щебень', 'т', 0.52, 1850), ('Песок', 'т', 0.38, 720), ('Минеральный порошок', 'т', 0.04, 3400),
          ('Битум', 'т', 0.055, None), ('Электроэнергия', 'кВт·ч', 18, 7.85), ('Газ', 'м³', 9, 9.40)]
BITUM = [(D(2027, 1, 1), 42000), (D(2027, 4, 1), 44500), (D(2027, 7, 1), 46800)]
CALC_DATE = D(2027, 5, 15)
VAT = 0.22
BATCH = 850


def price_on(d):
    p = None
    for dd, v in BITUM:
        if dd <= d:
            p = v
    return p


def s_calc(wb):
    ws = wb.create_sheet('4_Калькуляция')
    table(ws, 'A1', [('Ресурс на 1 т асфальтобетона', 'Ед.', 'Норма', 'Цена без НДС', 'Затраты')] + [(a, b, c, d) for a, b, c, d in RECIPE], {3: MONEY})
    table(ws, 'H1', [('Битум: цена с', 'Цена без НДС')] + [(ser(d), v) for d, v in BITUM], {0: DATE_FMT, 1: MONEY})
    put(ws, 'K1', 'Дата калькуляции', bold=True); put(ws, 'L1', ser(CALC_DATE), DATE_FMT, INPUT)
    put(ws, 'D5', '=LOOKUP($L$1,$H$2:$H$4,$I$2:$I$4)', MONEY)
    put(ws, 'K2', 'То же ИНДЕКС/ПОИСКПОЗ', bold=True); put(ws, 'L2', '=INDEX($I$2:$I$4,MATCH($L$1,$H$2:$H$4,1))', MONEY)
    bp = price_on(CALC_DATE)
    check(ws, 'D5', bp, 'Цена битума на дату (ПРОСМОТР)')
    check(ws, 'L2', bp, 'Цена битума на дату (ИНДЕКС/ПОИСКПОЗ, тип 1)')
    costs = []
    for i, (a, u, nrm, pr) in enumerate(RECIPE):
        rr = 2 + i
        put(ws, f'E{rr}', f'=C{rr}*D{rr}', MONEY)
        cst = nrm * (pr if pr is not None else bp)
        costs.append(cst)
        check(ws, f'E{rr}', cst, f'Затраты: {a}')
    put(ws, 'A8', 'Итого на 1 т', bold=True)
    put(ws, 'E8', '=SUM(E2:E7)', MONEY)
    put(ws, 'E9', '=SUMPRODUCT(C2:C7,D2:D7)', MONEY)
    put(ws, 'A9', 'То же одной формулой (СУММПРОИЗВ)')
    unit = sum(costs)
    check(ws, 'E8', unit, 'Себестоимость 1 т по строкам')
    check(ws, 'E9', unit, 'Себестоимость 1 т — СУММПРОИЗВ')
    put(ws, 'K4', 'Ставка НДС', bold=True); put(ws, 'L4', VAT, '0%', INPUT)
    put(ws, 'K5', 'Цена битума у поставщика с НДС'); put(ws, 'L5', 54290, MONEY, INPUT)
    put(ws, 'K6', 'Без НДС'); put(ws, 'L6', '=ROUND(L5/(1+$L$4),2)', MONEY)
    put(ws, 'K7', 'НДС в цене'); put(ws, 'L7', '=ROUND(L5*$L$4/(1+$L$4),2)', MONEY)
    put(ws, 'K8', 'Цена продажи 1 т без НДС'); put(ws, 'L8', 4200, MONEY, INPUT)
    put(ws, 'K9', 'Цена продажи с НДС'); put(ws, 'L9', '=ROUND(L8*(1+$L$4),2)', MONEY)
    put(ws, 'K10', 'Объём партии, т'); put(ws, 'L10', BATCH, None, INPUT)
    put(ws, 'K11', 'Себестоимость партии'); put(ws, 'L11', '=ROUND(E9*L10,2)', MONEY)
    check(ws, 'L6', r(54290 / 1.22), 'Цена без НДС из цены с НДС')
    check(ws, 'L7', r(54290 * 22 / 122), 'НДС 22/122 из цены с НДС')
    check(ws, 'L9', r(4200 * 1.22), 'Цена продажи с НДС')
    check(ws, 'L11', r(unit * BATCH), 'Себестоимость партии 850 т')
    widths(ws, {'A': 30, 'B': 7, 'C': 8, 'D': 14, 'E': 12, 'H': 14, 'I': 14, 'K': 32, 'L': 14})
    return {'unit': unit, 'bp': bp, 'costs': costs, 'batch': r(unit * BATCH)}


# ───────────────────────── 5. Цена: наценка и маржа ─────────────────────────
TOTAL5, OUT5, MARKUP, MARGIN = 1236000, 380, 0.25, 0.25


def s_price(wb):
    ws = wb.create_sheet('5_Цена')
    rows = [
        ('Затраты на выпуск плит, руб', TOTAL5, MONEY, INPUT),
        ('Выпуск, шт', OUT5, None, INPUT),
        ('Себестоимость 1 шт', '=IF(B2=0,0,B1/B2)', MONEY, None),
        ('Наценка', MARKUP, '0%', INPUT),
        ('Цена по наценке', '=B3*(1+B4)', MONEY, None),
        ('Целевая маржа', MARGIN, '0%', INPUT),
        ('Цена по целевой марже', '=IF(B6>=1,0,B3/(1-B6))', MONEY, None),
        ('Цена, округлённая вверх до 10 руб', '=CEILING(B7,10)', MONEY, None),
        ('Фактическая маржа после округления', '=IF(B8=0,0,(B8-B3)/B8)', '0.00%', None),
        ('Маржа при наценке 25 %', '=B4/(1+B4)', '0.00%', None),
        ('Цена с НДС', "=ROUND(B8*(1+'4_Калькуляция'!$L$4),2)", MONEY, None),
        ('Контроль выпуска', '=IF(B2=0,"нет выпуска — цену не считать","ок")', None, None),
    ]
    for i, (a, v, f, fill) in enumerate(rows):
        put(ws, f'A{i + 1}', a, bold=True)
        put(ws, f'B{i + 1}', v, f, fill)
    unit = TOTAL5 / OUT5
    pm = unit * (1 + MARKUP)
    pg = unit / (1 - MARGIN)
    pc = math.ceil(pg / 10 - 1e-9) * 10
    check(ws, 'B3', unit, 'Себестоимость 1 плиты')
    check(ws, 'B5', pm, 'Цена по наценке 25 %')
    check(ws, 'B7', pg, 'Цена по марже 25 %')
    check(ws, 'B8', pc, 'Цена, вверх до 10 руб')
    check(ws, 'B9', (pc - unit) / pc, 'Фактическая маржа')
    check(ws, 'B10', MARKUP / (1 + MARKUP), 'Маржа при наценке 25 %')
    check(ws, 'B11', r(pc * 1.22), 'Цена с НДС 22 %')
    check(ws, 'B12', 'ок', 'Защита от нулевого выпуска')
    widths(ws, {'A': 38, 'B': 18})
    return {'unit5': unit, 'pm': pm, 'pg': pg, 'pc': pc, 'm_fact': (pc - unit) / pc, 'pc_vat': r(pc * 1.22)}


# ───────────────────────── 6. Транспорт ─────────────────────────
T = dict(vol=185, cap=20, arm=34, norm=38, fuel=68.50, trip_h=1.65, km_rate=95, h_rate=2400)


def s_trips(wb):
    ws = wb.create_sheet('6_Рейсы')
    rows = [
        ('Объём перевозки, т', T['vol'], None, INPUT),
        ('Грузоподъёмность самосвала, т', T['cap'], None, INPUT),
        ('Рейсов', '=CEILING(B1/B2,1)', None, None),
        ('В последнем рейсе, т', '=B1-(B3-1)*B2', None, None),
        ('Плечо (в одну сторону), км', T['arm'], None, INPUT),
        ('Пробег, км (туда и обратно)', '=B3*2*B5', None, None),
        ('Норма топлива, л/100 км', T['norm'], None, INPUT),
        ('Топливо, л', '=B6*B7/100', '0.0', None),
        ('Цена топлива без НДС, руб/л', T['fuel'], MONEY, INPUT),
        ('Топливо, руб', '=ROUND(B8*B9,2)', MONEY, None),
        ('Время одного рейса, ч', T['trip_h'], '0.00', INPUT),
        ('Часов к оплате (вверх до часа)', '=CEILING(B3*B11,1)', None, None),
        ('Ставка за км, руб', T['km_rate'], MONEY, INPUT),
        ('Ставка за час, руб', T['h_rate'], MONEY, INPUT),
        ('Тариф по км', '=B6*B13', MONEY, None),
        ('Тариф по часам', '=B12*B14', MONEY, None),
        ('Выгоднее', '=IF(B15<=B16,"за км","за час")', None, None),
        ('Разница тарифов', '=ABS(B15-B16)', MONEY, None),
        ('Перевозка 1 т по выгодному тарифу', '=ROUND(MIN(B15,B16)/B1,2)', MONEY, None),
    ]
    for i, (a, v, f, fill) in enumerate(rows):
        put(ws, f'A{i + 1}', a, bold=True)
        put(ws, f'B{i + 1}', v, f, fill)
    trips = math.ceil(T['vol'] / T['cap'])
    km = trips * 2 * T['arm']
    lit = km * T['norm'] / 100
    hours = math.ceil(trips * T['trip_h'] - 1e-9)
    a, b = km * T['km_rate'], hours * T['h_rate']
    res = dict(trips=trips, last=T['vol'] - (trips - 1) * T['cap'], km=km, lit=lit, fuel_rub=r(lit * T['fuel']),
               hours=hours, tk=a, th=b, best='за км' if a <= b else 'за час', gap=abs(a - b), per_t=r(min(a, b) / T['vol']))
    for cell, k in [('B3', 'trips'), ('B4', 'last'), ('B6', 'km'), ('B8', 'lit'), ('B10', 'fuel_rub'), ('B12', 'hours'),
                    ('B15', 'tk'), ('B16', 'th'), ('B17', 'best'), ('B18', 'gap'), ('B19', 'per_t')]:
        check(ws, cell, res[k], f'Транспорт: {k}')
    widths(ws, {'A': 36, 'B': 14})
    return res


# ───────────────────────── 7. Даты ─────────────────────────
DOCS7 = [D(2027, 2, 14), D(2027, 3, 31), D(2027, 5, 17), D(2027, 9, 30), D(2027, 11, 3)]
DUE7 = [(D(2027, 5, 1), 1), (D(2027, 2, 23), 1), (D(2027, 12, 25), 1)]


def holidays():
    wb = openpyxl.load_workbook(KAL)
    ws = wb['Праздники']
    out = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if isinstance(row[0], dt.datetime):
            out.append(row[0].date())
    assert len(out) == 20, len(out)
    return out


def workday(start, n, hol):
    d = start
    step = 1 if n > 0 else -1
    left = abs(n)
    while left:
        d += dt.timedelta(days=step)
        if d.weekday() < 5 and d not in hol:
            left -= 1
    return d


def eomonth(d, m):
    y, mm = divmod(d.month - 1 + m, 12)
    y += d.year
    mm += 1
    return D(y, mm, calendar.monthrange(y, mm)[1])


def edate(d, m):
    y, mm = divmod(d.month - 1 + m, 12)
    y += d.year
    mm += 1
    return D(y, mm, min(d.day, calendar.monthrange(y, mm)[1]))


def s_dates(wb):
    ws = wb.create_sheet('7_Даты')
    hol = holidays()
    put(ws, 'K1', 'Праздники 2027 (из kalendar-srokov-2027.xlsx)', bold=True)
    for i, h in enumerate(hol):
        put(ws, f'K{2 + i}', ser(h), DATE_FMT, INPUT)
    heads = ['Дата документа', 'Конец месяца', 'Квартал', 'Метка квартала', 'Метка месяца', 'Через 3 месяца']
    for j, h in enumerate(heads):
        put(ws, f'{"ABCDEF"[j]}1', h, bold=True)
    for i, d in enumerate(DOCS7):
        rr = 2 + i
        put(ws, f'A{rr}', ser(d), DATE_FMT, INPUT)
        put(ws, f'B{rr}', f'=EOMONTH(A{rr},0)', DATE_FMT)
        put(ws, f'C{rr}', f'=CEILING(MONTH(A{rr})/3,1)')
        put(ws, f'D{rr}', f'=YEAR(A{rr})&"-Q"&C{rr}')
        put(ws, f'E{rr}', f'=YEAR(A{rr})&"-"&RIGHT("0"&MONTH(A{rr}),2)')
        put(ws, f'F{rr}', f'=EDATE(A{rr},3)', DATE_FMT)
        q = (d.month + 2) // 3
        check(ws, f'B{rr}', ser(eomonth(d, 0)), f'Конец месяца {d:%d.%m.%Y}')
        check(ws, f'C{rr}', q, f'Квартал {d:%d.%m.%Y}')
        check(ws, f'D{rr}', f'{d.year}-Q{q}', f'Метка квартала {d:%d.%m.%Y}')
        check(ws, f'E{rr}', f'{d.year}-{d.month:02d}', f'Метка месяца {d:%d.%m.%Y}')
        check(ws, f'F{rr}', ser(edate(d, 3)), f'Через 3 месяца {d:%d.%m.%Y}')
    for j, h in enumerate(['Срок по закону', 'Срок с переносом']):
        put(ws, f'{"AB"[j]}9', h, bold=True)
    for i, (d, _) in enumerate(DUE7):
        rr = 10 + i
        put(ws, f'A{rr}', ser(d), DATE_FMT, INPUT)
        put(ws, f'B{rr}', f'=WORKDAY(A{rr}-1,1,$K$2:$K$21)', DATE_FMT)
        check(ws, f'B{rr}', ser(workday(d - dt.timedelta(days=1), 1, hol)), f'Перенос срока {d:%d.%m.%Y}')
    put(ws, 'A14', 'Отгрузка', bold=True); put(ws, 'B14', 'Оплата через 5 рабочих дней', bold=True)
    put(ws, 'A15', ser(D(2027, 4, 28)), DATE_FMT, INPUT)
    put(ws, 'B15', '=WORKDAY(A15,5,$K$2:$K$21)', DATE_FMT)
    check(ws, 'B15', ser(workday(D(2027, 4, 28), 5, hol)), '5 рабочих дней после 28.04.2027')
    put(ws, 'A17', 'Квартал без ОКРВВЕРХ', bold=True); put(ws, 'B17', '=INT((MONTH(A4)+2)/3)')
    check(ws, 'B17', 2, 'Квартал через ЦЕЛОЕ для 17.05.2027')
    widths(ws, {'A': 16, 'B': 16, 'C': 9, 'D': 15, 'E': 13, 'F': 15, 'K': 14})
    res = {'due': [workday(d - dt.timedelta(days=1), 1, hol) for d, _ in DUE7], 'pay5': workday(D(2027, 4, 28), 5, hol)}
    return res


# ───────────────────────── 8. Ответы ведомствам ─────────────────────────
PAY = [(D(2027, 6, 30), 'Дорстрой', 9840000, 118), (D(2027, 7, 31), 'Дорстрой', 10120000, 121),
       (D(2027, 8, 31), 'Дорстрой', 10455000, 124), (D(2027, 9, 30), 'Дорстрой', 10310000, 123),
       (D(2027, 6, 30), 'АБЗ', 3960000, 52), (D(2027, 7, 31), 'АБЗ', 4105000, 54),
       (D(2027, 8, 31), 'АБЗ', 4230000, 55), (D(2027, 9, 30), 'АБЗ', 4180000, 55)]
P_FROM, P_TO = D(2027, 7, 1), D(2027, 9, 30)
OSV70 = 30885000


def s_reports(wb):
    ws = wb.create_sheet('8_Ведомства')
    table(ws, 'A1', [('Месяц (последний день)', 'Организация', 'Начислено, руб', 'Численность за месяц')] + [(ser(a), b, c, d) for a, b, c, d in PAY], {0: DATE_FMT, 2: MONEY})
    put(ws, 'F1', 'Начало периода', bold=True); put(ws, 'G1', ser(P_FROM), DATE_FMT, INPUT)
    put(ws, 'F2', 'Конец периода', bold=True); put(ws, 'G2', ser(P_TO), DATE_FMT, INPUT)
    put(ws, 'F3', 'Организация', bold=True); put(ws, 'G3', 'Дорстрой', None, INPUT)
    put(ws, 'F5', 'ФОТ за период', bold=True); put(ws, 'G5', '=SUMIFS(C2:C9,A2:A9,">="&G1,A2:A9,"<="&G2,B2:B9,G3)', MONEY)
    put(ws, 'F6', 'Месяцев в периоде', bold=True); put(ws, 'G6', '=COUNTIFS(A2:A9,">="&G1,A2:A9,"<="&G2,B2:B9,G3)')
    put(ws, 'F7', 'Средняя численность (простое среднее)', bold=True); put(ws, 'G7', '=AVERAGEIFS(D2:D9,A2:A9,">="&G1,A2:A9,"<="&G2,B2:B9,G3)', '0.00')
    put(ws, 'F8', 'Средняя зарплата в месяц', bold=True); put(ws, 'G8', '=IF(G6*G7=0,0,ROUND(G5/G7/G6,2))', MONEY)
    put(ws, 'F9', 'Кредит 70 по ОСВ за период (из 1С)', bold=True); put(ws, 'G9', OSV70, MONEY, INPUT)
    put(ws, 'F10', 'Сверка с исходником', bold=True); put(ws, 'G10', '=IF(ABS(G5-G9)>0.01,"ОШИБКА","ОК")')
    sel = [x for x in PAY if x[1] == 'Дорстрой' and P_FROM <= x[0] <= P_TO]
    fot = sum(x[2] for x in sel)
    avg = sum(x[3] for x in sel) / len(sel)
    sal = r(fot / avg / len(sel))
    check(ws, 'G5', fot, 'ФОТ Дорстрой за Q3')
    check(ws, 'G6', len(sel), 'Месяцев в периоде')
    check(ws, 'G7', avg, 'Средняя численность за квартал (простое среднее)')
    check(ws, 'G8', sal, 'Средняя зарплата в месяц')
    check(ws, 'G10', 'ОК' if abs(fot - OSV70) <= 0.01 else 'ОШИБКА', 'Сверка ФОТ с ОСВ')
    widths(ws, {'A': 22, 'B': 12, 'C': 15, 'D': 20, 'F': 38, 'G': 15})
    return {'fot': fot, 'avg': avg, 'sal': sal}


# ───────────────────────── 9. Займы и рассрочка ─────────────────────────
LOAN = dict(sum=5000000, rate=0.14, start=D(2027, 3, 15), end=D(2027, 6, 30))
INST = dict(sum=3600000, rate=0.12, n=12)
NPV_RATE, FLOWS = 0.12, [2000000, 2000000, 2000000]


def s_loans(wb):
    ws = wb.create_sheet('9_Займы')
    rows = [
        ('Сумма займа (Дорстрой → АБЗ)', LOAN['sum'], MONEY, INPUT),
        ('Ставка годовых', LOAN['rate'], '0.00%', INPUT),
        ('Дата выдачи', ser(LOAN['start']), DATE_FMT, INPUT),
        ('Дата возврата', ser(LOAN['end']), DATE_FMT, INPUT),
        ('Дней пользования', '=B4-B3', None, None),
        ('Дней в году', '=DATE(YEAR(B3),12,31)-DATE(YEAR(B3),1,1)+1', None, None),
        ('Проценты по дням', '=ROUND(B1*B2*B5/B6,2)', MONEY, None),
        ('То же через ДОЛЯГОДА (базис 1)', '=ROUND(B1*B2*YEARFRAC(B3,B4,1),2)', MONEY, None),
        ('', None, None, None),
        ('Рассрочка: сумма', INST['sum'], MONEY, INPUT),
        ('Ставка годовых', INST['rate'], '0.00%', INPUT),
        ('Месяцев', INST['n'], None, INPUT),
        ('Платёж в месяц (ПЛТ)', '=ROUND(PMT(B11/12,B12,-B10),2)', MONEY, None),
        ('Проценты за весь срок', '=B13*B12-B10', MONEY, None),
        ('', None, None, None),
        ('Ставка дисконтирования', NPV_RATE, '0.00%', INPUT),
        ('Приведённая стоимость (ЧПС)', '=ROUND(NPV(B16,D2:D4),2)', MONEY, None),
        ('Дисконт', '=SUM(D2:D4)-B17', MONEY, None),
    ]
    for i, (a, v, f, fill) in enumerate(rows):
        if a:
            put(ws, f'A{i + 1}', a, bold=True)
        if v is not None:
            put(ws, f'B{i + 1}', v, f, fill)
    table(ws, 'D1', [('Платёж в конце года',)] + [(x,) for x in FLOWS], {0: MONEY})
    days = (LOAN['end'] - LOAN['start']).days
    ydays = 366 if calendar.isleap(LOAN['start'].year) else 365
    interest = r(LOAN['sum'] * LOAN['rate'] * days / ydays)
    i_m = INST['rate'] / 12
    pmt = r(INST['sum'] * i_m / (1 - (1 + i_m) ** -INST['n']))
    npv = r(sum(f / (1 + NPV_RATE) ** (k + 1) for k, f in enumerate(FLOWS)))
    check(ws, 'B5', days, 'Дней пользования займом')
    check(ws, 'B6', ydays, 'Дней в 2027 году')
    check(ws, 'B7', interest, 'Проценты по дням')
    check(ws, 'B8', interest, 'Проценты через ДОЛЯГОДА базис 1')
    check(ws, 'B13', pmt, 'Аннуитетный платёж')
    check(ws, 'B14', r(pmt * INST['n'] - INST['sum']), 'Проценты по рассрочке')
    check(ws, 'B17', npv, 'ЧПС трёх платежей')
    check(ws, 'B18', r(sum(FLOWS) - npv), 'Дисконт')
    widths(ws, {'A': 34, 'B': 16, 'D': 20})
    return {'days': days, 'interest': interest, 'pmt': pmt, 'npv': npv,
            'leap': r(LOAN['sum'] * LOAN['rate'] * 29 / 366)}


# ───────────────────────── 10. Сверка и долги ─────────────────────────
OURS = [('УПД-101', D(2027, 6, 15), 153400), ('УПД-118', D(2027, 7, 2), 98600), ('УПД-118', D(2027, 7, 2), 98600),
        ('УПД-125', D(2027, 7, 20), 212000), ('УПД-131', D(2027, 8, 14), 75250), ('УПД-140', D(2027, 9, 5), 310000),
        ('УПД-144', D(2027, 9, 22), 46800)]
THEIRS = [('УПД-101 ', 153400), ('УПД-118', 98600), ('УПД-125', 212000), ('УПД-131', 75200), ('УПД-140', 310000)]
REP = D(2027, 9, 30)


def bucket(a):
    return '0–30' if a <= 30 else ('31–90' if a <= 90 else '90+')


def s_recon(wb):
    ws = wb.create_sheet('10_Сверка')
    table(ws, 'A1', [('Документ (наш учёт)', 'Дата', 'Сумма', 'Ключ', 'Дубль?', 'У контрагента', 'Дней долга', 'Корзина')] + [(a, ser(b), c) for a, b, c in OURS], {1: DATE_FMT, 2: MONEY})
    table(ws, 'J1', [('Документ (акт контрагента)', 'Сумма', 'Ключ')] + THEIRS, {1: MONEY})
    put(ws, 'N1', 'Дата отчёта', bold=True); put(ws, 'O1', ser(REP), DATE_FMT, INPUT)
    n = 1 + len(OURS)
    keys = []
    for i, (a, b, c) in enumerate(OURS):
        rr = 2 + i
        put(ws, f'D{rr}', f'=TRIM(A{rr})&"|"&ROUND(C{rr}*100,0)')
        put(ws, f'E{rr}', f'=IF(COUNTIFS($A$2:A{rr},A{rr},$C$2:C{rr},C{rr})>1,"дубль","")')
        put(ws, f'F{rr}', f'=IF(COUNTIF($L$2:$L$6,D{rr})>0,"есть","нет")')
        put(ws, f'G{rr}', f'=$O$1-B{rr}')
        put(ws, f'H{rr}', f'=IF(G{rr}<=30,"0–30",IF(G{rr}<=90,"31–90","90+"))')
        k = f'{a.strip()}|{round(c * 100)}'
        keys.append(k)
    for i, (a, c) in enumerate(THEIRS):
        put(ws, f'L{2 + i}', f'=TRIM(J{2 + i})&"|"&ROUND(K{2 + i}*100,0)')
    tk = {f'{a.strip()}|{round(c * 100)}' for a, c in THEIRS}
    agg = {'0–30': 0, '31–90': 0, '90+': 0}
    seen = {}
    for i, (a, b, c) in enumerate(OURS):
        rr = 2 + i
        dup = sum(1 for x in OURS[:i + 1] if x[0] == a and x[2] == c) > 1  # второй и следующие повторы
        age = (REP - b).days
        check(ws, f'D{rr}', keys[i], f'Ключ {a}')
        check(ws, f'E{rr}', 'дубль' if dup else '', f'Дубль {a}')
        check(ws, f'F{rr}', 'есть' if keys[i] in tk else 'нет', f'Есть у контрагента {a}')
        check(ws, f'G{rr}', age, f'Дней долга {a}')
        check(ws, f'H{rr}', bucket(age), f'Корзина {a}')
        if not dup:
            agg[bucket(age)] += c
    put(ws, 'N3', 'Корзина', bold=True); put(ws, 'O3', 'Долг без дублей', bold=True)
    for i, bk in enumerate(['0–30', '31–90', '90+']):
        rr = 4 + i
        put(ws, f'N{rr}', bk, fill=INPUT)
        put(ws, f'O{rr}', f'=SUMIFS($C$2:$C${n},$H$2:$H${n},N{rr},$E$2:$E${n},"<>дубль")', MONEY)
        check(ws, f'O{rr}', agg[bk], f'Долг в корзине {bk}')
    put(ws, 'N7', 'Итого', bold=True); put(ws, 'O7', '=SUM(O4:O6)', MONEY)
    check(ws, 'O7', sum(agg.values()), 'Долг всего без дублей')
    put(ws, 'N9', 'Дубли (строк)', bold=True); put(ws, 'O9', f'=COUNTIF(E2:E{n},"дубль")')
    check(ws, 'O9', 1, 'Строк-повторов (первая строка остаётся)')
    put(ws, 'N10', 'РАЗНДАТ для УПД-101', bold=True); put(ws, 'O10', '=DATEDIF(B2,$O$1,"d")')
    check(ws, 'O10', (REP - OURS[0][1]).days, 'РАЗНДАТ "d" = разность дат')
    widths(ws, {'A': 20, 'B': 12, 'C': 12, 'D': 20, 'E': 8, 'F': 14, 'G': 11, 'H': 9, 'J': 26, 'K': 12, 'L': 20, 'N': 20, 'O': 16})
    return {'agg': agg, 'ages': [(REP - b).days for _, b, _ in OURS]}


# ───────────────────────── 11. Контрольные формулы ─────────────────────────
VALS11 = [('Дорстрой', 1840000), ('Домстрой', 615300), ('АБЗ', '215000'), ('Трансавто', 932450),
          ('Бетон', 1107800), ('ЖБИ', '98500'), ('Знак', 456000), ('УК', 72950)]


def s_control(wb):
    ws = wb.create_sheet('11_Контроль')
    table(ws, 'A1', [('Организация', 'Сумма (как вставилась)', 'Число?', 'Сумма-число', 'Формула? (современный)')] + [(a, b) for a, b in VALS11], {1: MONEY})
    for i in range(len(VALS11)):
        rr = 2 + i
        check(ws, f'E{rr}', True, f'ЕФОРМУЛА D{rr} (современный вариант)')
        put(ws, f'C{rr}', f'=ISNUMBER(B{rr})')
        put(ws, f'D{rr}', f'=IF(ISNUMBER(B{rr}),B{rr},VALUE(TRIM(B{rr})))', MONEY)
        put(ws, f'E{rr}', f'=_xlfn.ISFORMULA(D{rr})', fill=MODERN)  # функция после 2007 — в файле с префиксом _xlfn.
        check(ws, f'C{rr}', not isinstance(VALS11[i][1], str), f'ЕЧИСЛО {VALS11[i][0]}')
    full = sum(float(v) for _, v in VALS11)
    nums = sum(v for _, v in VALS11 if not isinstance(v, str))
    put(ws, 'G1', 'Итог по ОСВ из 1С', bold=True); put(ws, 'H1', full, MONEY, INPUT)
    put(ws, 'G2', 'СЧЁТЗ (непустых)', bold=True); put(ws, 'H2', '=COUNTA(B2:B9)')
    put(ws, 'G3', 'СЧЁТ (чисел)', bold=True); put(ws, 'H3', '=COUNT(B2:B9)')
    put(ws, 'G4', 'Чисел-текстов', bold=True); put(ws, 'H4', '=H2-H3')
    put(ws, 'G5', 'СУММ исходного столбца', bold=True); put(ws, 'H5', '=SUM(B2:B9)', MONEY)
    put(ws, 'G6', 'Контроль до лечения', bold=True); put(ws, 'H6', '=IF(ABS(H1-H5)>0.01,"ОШИБКА","ОК")')
    put(ws, 'G7', 'СУММ после лечения', bold=True); put(ws, 'H7', '=SUM(D2:D9)', MONEY)
    put(ws, 'G8', 'Контроль после лечения', bold=True); put(ws, 'H8', '=IF(ABS(H1-H7)>0.01,"ОШИБКА","ОК")')
    put(ws, 'G9', 'Строк: исходник = итог?', bold=True); put(ws, 'H9', '=IF(COUNTA(A2:A9)=H2,"ОК","ОШИБКА")')
    note(ws, 'G11', 'Столбец E — ЕФОРМУЛА: Excel 2013 и новее. В Excel 2007: Ctrl+` или «Найти и выделить → Выделить группу ячеек → Формулы».')
    check(ws, 'H2', 8, 'СЧЁТЗ')
    check(ws, 'H3', 6, 'СЧЁТ')
    check(ws, 'H4', 2, 'Чисел-текстов')
    check(ws, 'H5', nums, 'СУММ пропускает текст')
    check(ws, 'H6', 'ОШИБКА', 'Контроль до лечения')
    check(ws, 'H7', full, 'СУММ после лечения')
    check(ws, 'H8', 'ОК', 'Контроль после лечения')
    check(ws, 'H9', 'ОК', 'Число строк')
    widths(ws, {'A': 12, 'B': 22, 'C': 9, 'D': 14, 'E': 22, 'G': 36, 'H': 16})
    return {'full': full, 'nums': nums, 'lost': full - nums}


# ───────────────────────── 12. Нормализация ключей ─────────────────────────
NB = ' '
NAMES = [('Семёнова Анна Петровна', 'Т-0041'), ('СЕМЕНОВА  АННА ПЕТРОВНА', 'Т-0041'), ('Семенова Анна Петровна' + NB, 'Т-0041'),
         ('Королёв Игорь Олегович', 'Т-0112'), ('Королев Игорь Олегович', 'Т-0112'), ('Королев Игорь Олегович', 'Т-0187')]


def norm(s):
    s = s.upper().replace('Ё', 'Е').replace(NB, ' ')
    return re.sub(' +', ' ', s).strip(' ')


def s_keys(wb):
    ws = wb.create_sheet('12_Ключи')
    table(ws, 'A1', [('ФИО из выгрузки', 'Табельный №', 'Ключ (верно)', 'Ключ (ошибка: Ё до ПРОПИСН)', 'Знаков убрано', 'Тех же ФИО', 'Проверка личности')] + NAMES)
    nn = [norm(a) for a, _ in NAMES]
    for i, (a, t) in enumerate(NAMES):
        rr = 2 + i
        put(ws, f'C{rr}', f'=TRIM(SUBSTITUTE(SUBSTITUTE(UPPER(A{rr}),"Ё","Е"),CHAR(160)," "))')
        put(ws, f'D{rr}', f'=TRIM(UPPER(SUBSTITUTE(A{rr},"Ё","Е")))')
        put(ws, f'E{rr}', f'=LEN(A{rr})-LEN(C{rr})')
        put(ws, f'F{rr}', f'=COUNTIF($C$2:$C$7,C{rr})')
        put(ws, f'G{rr}', f'=IF(COUNTIFS($C$2:$C$7,C{rr},$B$2:$B$7,"<>"&B{rr})>0,"тёзки? сверить по табельному","")')
        wrong = re.sub(' +', ' ', a.replace('Ё', 'Е').upper()).strip(' ')
        check(ws, f'C{rr}', nn[i], f'Ключ ФИО строка {rr}')
        check(ws, f'D{rr}', wrong, f'Ошибочный ключ строка {rr}')
        check(ws, f'E{rr}', len(a) - len(nn[i]), f'Знаков убрано строка {rr}')
        check(ws, f'F{rr}', nn.count(nn[i]), f'Тех же ФИО строка {rr}')
        other = any(nn[j] == nn[i] and NAMES[j][1] != t for j in range(len(NAMES)))
        check(ws, f'G{rr}', 'тёзки? сверить по табельному' if other else '', f'Тёзки строка {rr}')
    put(ws, 'A10', 'Сумма из 1С с неразрывными пробелами', bold=True)
    put(ws, 'B10', '1' + NB + '250' + NB + '000,00', None, INPUT)
    put(ws, 'C10', '=VALUE(SUBSTITUTE(B10,CHAR(160),""))', MONEY)
    note(ws, 'A11', 'ЗНАЧЕН понимает запятую как десятичный знак только при русских региональных настройках Windows.')
    check(ws, 'C10', 1250000, 'Число из текста 1С с СИМВОЛ(160)')
    widths(ws, {'A': 36, 'B': 13, 'C': 30, 'D': 30, 'E': 14, 'F': 11, 'G': 30})
    return {'norm': nn}


# ───────────────────────── Вычислитель: функции сверх _xleval ─────────────────────────
class Book2(X.Book):
    def __init__(self, wb):
        super().__init__(wb)
        for k, v in list(self.cells.items()):
            if isinstance(v, dt.datetime):  # openpyxl читает число с форматом даты как datetime
                self.cells[k] = float(ser(v.date()))
            elif isinstance(v, str) and v.startswith('=') and '_xlfn.' in v:
                self.cells[k] = v.replace('_xlfn.', '')

    def call(self, f, args, sheet, row):
        if f == 'ROW' and args:
            assert args[0][0] == 'ref'
            return float(args[0][2])
        E = lambda i: self.ev(args[i], sheet, row)
        N = lambda i: X.to_num(E(i))
        if f == 'CEILING':
            x, s = N(0), N(1)
            return math.ceil(x / s - 1e-9) * s
        if f == 'INT':
            return float(math.floor(N(0)))
        if f in ('YEAR', 'MONTH', 'DAY'):
            d = from_ser(N(0))
            return float({'YEAR': d.year, 'MONTH': d.month, 'DAY': d.day}[f])
        if f == 'DATE':
            return float(ser(D(int(N(0)), int(N(1)), int(N(2)))))
        if f == 'EOMONTH':
            return float(ser(eomonth(from_ser(N(0)), int(N(1)))))
        if f == 'EDATE':
            return float(ser(edate(from_ser(N(0)), int(N(1)))))
        if f == 'WORKDAY':
            hol = {from_ser(x) for x in X.flat(E(2)) if isinstance(x, float)} if len(args) > 2 else set()
            return float(ser(workday(from_ser(N(0)), int(N(1)), hol)))
        if f == 'DATEDIF':
            assert X.to_text(E(2)).lower() == 'd'
            a, b = N(0), N(1)
            if a > b:
                raise X.XLError('#NUM!')
            return b - a
        if f == 'YEARFRAC':
            a, b = from_ser(N(0)), from_ser(N(1))
            assert int(N(2)) == 1 and a.year == b.year
            return (b - a).days / (366 if calendar.isleap(a.year) else 365)
        if f in ('LOOKUP',) or (f == 'MATCH' and len(args) == 3 and N(2) == 1):
            x = N(0)
            vec = X.flat(E(1))
            k = None
            for i, v in enumerate(vec):
                if isinstance(v, float) and v <= x:
                    k = i
            if k is None:
                raise X.NA
            if f == 'MATCH':
                return float(k + 1)
            return X.flat(E(2))[k]
        if f == 'PMT':
            rt, n, pv = N(0), N(1), N(2)
            return -pv * rt / (1 - (1 + rt) ** -n)
        if f == 'NPV':
            rt = N(0)
            vals = [v for i in range(1, len(args)) for v in X.flat(E(i)) if isinstance(v, float)]
            return sum(v / (1 + rt) ** (k + 1) for k, v in enumerate(vals))
        if f == 'AVERAGEIFS':
            sm = X.flat(E(0))
            rgs = [X.flat(E(i)) for i in range(1, len(args), 2)]
            crs = [X.crit_fn(E(i)) for i in range(2, len(args), 2)]
            xs = [sm[k] for k in range(len(sm)) if all(c(g[k]) for g, c in zip(rgs, crs)) and isinstance(sm[k], float)]
            if not xs:
                raise X.DIV0
            return sum(xs) / len(xs)
        if f == 'VALUE':
            s = X.to_text(E(0)).replace(' ', '').replace(',', '.')  # русские региональные настройки
            try:
                return float(s)
            except ValueError:
                raise X.VALUE
        if f == 'ISFORMULA':
            node = args[0]
            assert node[0] == 'ref'
            _, sh, r1, c1, r2, c2, is_rng = node
            cells = [(sh, rr, cc) for rr in range(r1, r2 + 1) for cc in range(c1, c2 + 1)]
            res = [isinstance(self.cells.get(k), str) and self.cells[k].startswith('=') for k in cells]
            return [[x] for x in res] if is_rng else res[0]
        if f == 'SUMPRODUCT' and len(args) == 1:
            v = E(0)
            return float(sum(X.to_num(x) for x in X.flat(v)))
        return super().call(f, args, sheet, row)


def fmt_ru(v, nd=2):
    s = f'{v:,.{nd}f}'.replace(',', ' ').replace('.', ',')
    return s


def main():
    wb = openpyxl.Workbook()
    ins = wb.active
    ins.title = 'Инструкция'
    lines = [
        'Учебный файл модуля «Формулы для вашей работы» (курс «Бухгалтерия», Искра). Все данные вымышленные.',
        'Один лист — один урок модуля: 1_Факты … 12_Ключи. Голубые ячейки — исходные данные, их можно менять («Поменяйте и проверьте» в уроке).',
        'Жёлтые ячейки — готовые формулы. Зелёные — современный вариант (ЕФОРМУЛА: Excel 2013 и новее); остальные формулы работают с Excel 2007.',
        'Формулы в файле хранятся так, что русский Excel показывает их русскими именами и с «;» (например, СУММЕСЛИМН).',
        'Лист «Проверка» сравнивает формулы с эталонами, посчитанными отдельно на Python. Должно быть «ок» во всех строках, расхождений — 0.',
        'Важно: значения проверены программно (Python), а не в самом Excel. Если в вашем Excel что-то не совпало — это повод разобраться, напишите преподавателю.',
        'Праздники 2027 на листе 7_Даты взяты из файла курса kalendar-srokov-2027.xlsx.',
        'Ставка НДС 22 % — п. 3 ст. 164 НК РФ в ред. 425-ФЗ; в формулах она берётся из ячейки 4_Калькуляция!L4, а не вписывается числом.',
    ]
    for i, t in enumerate(lines):
        ins[f'A{i + 1}'] = t
    ins.column_dimensions['A'].width = 140
    res = {}
    res.update(s_facts(wb))
    res.update(s_vgo(wb))
    res.update(s_shares(wb, res['elim']))
    res.update(s_calc(wb))
    res.update(s_price(wb))
    res.update(s_trips(wb))
    res.update(s_dates(wb))
    res.update(s_reports(wb))
    res.update(s_loans(wb))
    res.update(s_recon(wb))
    res.update(s_control(wb))
    res.update(s_keys(wb))

    chk = wb.create_sheet('Проверка')
    for j, h in enumerate(['Лист', 'Ячейка', 'Что проверяем', 'Эталон (Python)', 'Формула даёт', 'Совпадает?']):
        chk.cell(1, j + 1, h).font = HEAD
    for i, (sh, cell, exp, what) in enumerate(CHECKS):
        rr = 2 + i
        chk.cell(rr, 1, sh); chk.cell(rr, 2, cell); chk.cell(rr, 3, what)
        if isinstance(exp, bool):
            chk.cell(rr, 4, exp)
        else:
            chk.cell(rr, 4, exp)
        chk.cell(rr, 5, f"='{sh}'!{cell}")
        if isinstance(exp, (int, float)) and not isinstance(exp, bool):
            chk.cell(rr, 6, f'=IF(ABS(E{rr}-D{rr})<=0.005,"ок","расхождение")')
        else:
            chk.cell(rr, 6, f'=IF(E{rr}=D{rr},"ок","расхождение")')
    last = 1 + len(CHECKS)
    chk['H1'] = 'Расхождений всего (должно быть 0)'
    chk['H1'].font = HEAD
    chk['I1'] = f'=COUNTIF(F2:F{last},"расхождение")'
    chk['H2'] = 'Проверок'
    chk['I2'] = len(CHECKS)
    for k, v in {'A': 14, 'B': 8, 'C': 52, 'D': 30, 'E': 30, 'F': 13, 'H': 34}.items():
        chk.column_dimensions[k].width = v
    wb.save(OUT)

    # пересчёт формул и сверка
    book = Book2(openpyxl.load_workbook(OUT))
    bad = 0
    for i, (sh, cell, exp, what) in enumerate(CHECKS):
        m = re.match(r'([A-Z]+)(\d+)', cell)
        got = book.value(sh, int(m.group(2)), openpyxl.utils.column_index_from_string(m.group(1)))
        flag = book.value('Проверка', 2 + i, 6)
        ok = (abs(got - exp) <= 0.005) if isinstance(exp, (int, float)) and not isinstance(exp, bool) and isinstance(got, float) else (got == exp)
        if not ok or flag != 'ок':
            bad += 1
            print(f'РАСХОЖДЕНИЕ {sh}!{cell} {what}: формула {got!r}, эталон {exp!r}, лист «Проверка»: {flag!r}')
    total = book.value('Проверка', 1, 9)
    print(f'Проверок: {len(CHECKS)}, расхождений: {bad}; «Проверка»!I1 = {total}')
    assert bad == 0 and total == 0

    for k in ['dor_q3', 'q3', 'q3c', 'vgo_tot', 'elim', 'disc', 'nop', 'rev_tot', 'diff', 'group', 'unit', 'bp', 'batch',
              'unit5', 'pm', 'pg', 'pc', 'm_fact', 'pc_vat', 'trips', 'last', 'km', 'lit', 'fuel_rub', 'hours', 'tk', 'th',
              'gap', 'per_t', 'fot', 'avg', 'sal', 'days', 'interest', 'pmt', 'npv', 'leap', 'full', 'nums', 'lost']:
        print(f'  {k} = {res[k]}')
    print('  alloc =', res['alloc'])
    print('  costs =', res['costs'])
    print('  due =', [d.strftime('%d.%m.%Y') for d in res['due']], 'pay5 =', res['pay5'].strftime('%d.%m.%Y'))
    print('  agg =', res['agg'], 'ages =', res['ages'])
    print('  norm =', res['norm'])
    print('Сохранено:', OUT)

    if '--check-ts' in sys.argv:
        src = open(TS, encoding='utf-8').read()
        want = {
            'выручка Дорстрой Q3': fmt_ru(res['dor_q3'], 0), 'к исключению': fmt_ru(res['elim'], 0),
            'расхождение': fmt_ru(res['disc'], 0), 'без пары': fmt_ru(res['nop'], 0), 'ВГО всего': fmt_ru(res['vgo_tot'], 0),
            'выручка компаний': fmt_ru(res['rev_tot'], 0), 'группа': fmt_ru(res['group'], 0),
            'Дорстрой с поправкой': fmt_ru(r(res['alloc'][0] + res['diff'])), 'Дорстрой до поправки': fmt_ru(res['alloc'][0]),
            'себестоимость 1 т': fmt_ru(res['unit']), 'партия': fmt_ru(res['batch']),
            'себестоимость плиты': fmt_ru(res['unit5']), 'цена по наценке': fmt_ru(res['pm']), 'цена по марже': fmt_ru(res['pg']),
            'цена вверх': fmt_ru(res['pc'], 0), 'цена с НДС': fmt_ru(res['pc_vat']),
            'топливо руб': fmt_ru(res['fuel_rub']), 'тариф км': fmt_ru(res['tk'], 0), 'тариф час': fmt_ru(res['th'], 0),
            'на 1 т': fmt_ru(res['per_t']), 'ФОТ': fmt_ru(res['fot'], 0), 'средняя з/п': fmt_ru(res['sal']),
            'проценты': fmt_ru(res['interest']), 'ПЛТ': fmt_ru(res['pmt']), 'ЧПС': fmt_ru(res['npv']),
            'високосный': fmt_ru(res['leap']), 'полный итог': fmt_ru(res['full'], 0), 'потеряно': fmt_ru(res['lost'], 0),
            '0–30': fmt_ru(res['agg']['0–30'], 0), '31–90': fmt_ru(res['agg']['31–90'], 0), '90+': fmt_ru(res['agg']['90+'], 0),
        }
        miss = [f'{k}: {v}' for k, v in want.items() if v not in src and v.replace(' ', ' ') not in src]
        print('Проверка ext07.ts:', 'все числа найдены' if not miss else 'не найдены — ' + '; '.join(miss))
        assert not miss


if __name__ == '__main__':
    main()
