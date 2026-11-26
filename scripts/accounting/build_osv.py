# Сборка учебного шаблона ОСВ по проводкам урока m09-01/m09-04:
# public/courses/accounting/osv-shablon.xlsx
# Запуск: python scripts/accounting/build_osv.py  (нужен openpyxl)
# Данные вымышленные: ООО «Альфа», октябрь 2026, восемь проводок из урока m09-01.
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font
from _xlhelp import head, widths, instruction, BORDER, GRY

OUT = Path(__file__).resolve().parents[2] / 'public/courses/accounting/osv-shablon.xlsx'

POST = [  # №, Дт, Кт, сумма, содержание
    (1, '41', '60', 120000, 'Товар от «Беты» (не оплачен)'),
    (2, '60', '51', 120000, 'Оплата «Бете»'),
    (3, '62', '90-1', 180000, 'Продажа «Гамме»'),
    (4, '90-2', '41', 120000, 'Себестоимость проданного'),
    (5, '51', '62', 150000, 'Оплата от «Гаммы»'),
    (6, '44', '60', 10000, 'Аренда склада у «Дельты» (не оплачена)'),
    (7, '90-2', '44', 10000, 'Списание расходов на продажу'),
    (8, '90-9', '99', 50000, 'Прибыль от продаж за октябрь'),
]
# счёт, название, вид (A — активный, P — пассивный), начальное сальдо
ACC = [
    ('41', 'Товары', 'A', 0),
    ('44', 'Расходы на продажу', 'A', 0),
    ('51', 'Расчётные счета', 'A', 200000),
    ('60', 'Расчёты с поставщиками', 'P', 0),
    ('62', 'Расчёты с покупателями', 'A', 0),
    ('80', 'Уставный капитал', 'P', 200000),
    ('90-1', 'Выручка', 'P', 0),
    ('90-2', 'Себестоимость продаж', 'A', 0),
    ('90-9', 'Прибыль/убыток от продаж', 'A', 0),
    ('99', 'Прибыли и убытки', 'P', 0),
]

# ---- независимый расчёт (без формул листов) --------------------------------
turn_d = {a[0]: sum(x[3] for x in POST if x[1] == a[0]) for a in ACC}
turn_k = {a[0]: sum(x[3] for x in POST if x[2] == a[0]) for a in ACC}
end = {}
for a, _, kind, op in ACC:
    s = (op if kind == 'A' else -op) + turn_d[a] - turn_k[a]  # + = дебетовое сальдо
    end[a] = s
sum_all = sum(x[3] for x in POST)
end_d = sum(v for v in end.values() if v > 0)
end_k = -sum(v for v in end.values() if v < 0)
assert sum_all == 760000
assert end_d == end_k
# без счёта 90 (как в уроке m09-01): 260 000 = 260 000
no90_d = sum(v for a, v in end.items() if v > 0 and not a.startswith('90'))
no90_k = -sum(v for a, v in end.items() if v < 0 and not a.startswith('90'))
assert no90_d == no90_k == 260000, (no90_d, no90_k)
sum90 = sum(v for a, v in end.items() if a.startswith('90'))
assert sum90 == 0

wb = Workbook()
ws = wb.active
ws.title = 'Инструкция'
instruction(ws, [
    ('Учебный шаблон ОСВ по проводкам урока (m09-04)', True),
    ('Курс «Бухгалтерия». Все данные вымышленные: ООО «Альфа», октябрь 2026, восемь проводок из урока m09-01. Не используйте как отчётность.', False),
    ('', False),
    ('Листы', True),
    ('Проводки — восемь учебных проводок (№, Дт, Кт, сумма). Можно править суммы или добавить строки: итоги пересчитаются, если строки внутри диапазона A2:E40.', False),
    ('ОСВ — по каждому счёту: сальдо на начало, обороты Дт и Кт (формулы СУММПРОИЗВ по листу «Проводки»), сальдо на конец. Внизу — проверки.', False),
    ('Проверка — эталоны, посчитанные независимо в Python, и сравнение с формулами.', False),
    ('', False),
    ('Как работает проверка «сумма оборотов Дт = Кт»', True),
    ('Каждая проводка записывается и по дебету, и по кредиту на одну сумму, поэтому итог оборотов по дебету всегда равен итогу по кредиту (здесь 760 000). Если не равен — ошибка в данных: пропущена сторона или неверная сумма.', False),
    ('Второе условие: сумма дебетовых сальдо на конец = сумме кредитовых сальдо на конец.', False),
    ('', False),
    ('Важные оговорки', True),
    ('В учебном списке закрытие 90-1 и 90-2 на 90-9 не показано (его разбирает урок m09-05), поэтому по субсчетам 90 остаются сальдо; по счёту 90 в целом сальдо 0 — это видно в строке «Счёт 90 всего».', False),
    ('Без счёта 90 итог сальдо — 260 000 = 260 000: так в уроке m09-01 (Дт 51 — 230 000, Дт 62 — 30 000; Кт 60 — 10 000, Кт 80 — 200 000, Кт 99 — 50 000).', False),
    ('Вид счёта (активный/пассивный) нужен только для знака начального сальдо; конечное сальдо считается как «сальдо начало + Дт − Кт» (дебетовое — плюс).', False),
    ('Формулы записаны английскими именами; русский Excel покажет русские. При необходимости нажмите F9.', False),
])

pj = wb.create_sheet('Проводки')
head(pj, 1, ['№', 'Дебет', 'Кредит', 'Сумма', 'Содержание операции'])
for i, (n, d, k, s, t) in enumerate(POST, 2):
    pj.cell(i, 1, n)
    pj.cell(i, 2, d).number_format = '@'
    pj.cell(i, 3, k).number_format = '@'
    pj.cell(i, 4, s).number_format = '#,##0'
    pj.cell(i, 5, t)
    for c in range(1, 6):
        pj.cell(i, c).border = BORDER
pj.cell(42, 3, 'Итого').font = Font(bold=True)
pj.cell(42, 4, '=SUM(D2:D40)').number_format = '#,##0'
widths(pj, [5, 10, 10, 14, 44])
pj.freeze_panes = 'A2'

osv = wb.create_sheet('ОСВ')
head(osv, 1, ['Счёт', 'Название', 'Сальдо Дт нач.', 'Сальдо Кт нач.', 'Оборот Дт', 'Оборот Кт', 'Сальдо Дт кон.', 'Сальдо Кт кон.', 'Сальдо кон. (+ Дт / − Кт)'])
LAST = len(ACC) + 1
for i, (a, name, kind, op) in enumerate(ACC, 2):
    osv.cell(i, 1, a).number_format = '@'
    osv.cell(i, 2, name)
    osv.cell(i, 3, op if kind == 'A' else 0)
    osv.cell(i, 4, op if kind == 'P' else 0)
    osv.cell(i, 5, f"=SUMPRODUCT(('Проводки'!$B$2:$B$40=A{i})*'Проводки'!$D$2:$D$40)")
    osv.cell(i, 6, f"=SUMPRODUCT(('Проводки'!$C$2:$C$40=A{i})*'Проводки'!$D$2:$D$40)")
    osv.cell(i, 9, f'=C{i}-D{i}+E{i}-F{i}')
    osv.cell(i, 7, f'=MAX(I{i},0)')
    osv.cell(i, 8, f'=MAX(-I{i},0)')
    for c in range(1, 10):
        osv.cell(i, c).border = BORDER
        if c >= 3:
            osv.cell(i, c).number_format = '#,##0'
T = LAST + 1
osv.cell(T, 2, 'Итого').font = Font(bold=True)
for col in 'CDEFGH':
    osv[f'{col}{T}'] = f'=SUM({col}2:{col}{LAST})'
    osv[f'{col}{T}'].number_format = '#,##0'
    osv[f'{col}{T}'].font = Font(bold=True)
osv.cell(T + 2, 2, 'Проверка: обороты Дт = обороты Кт')
osv.cell(T + 2, 5, f'=IF(E{T}=F{T},"OK","ОШИБКА")')
osv.cell(T + 3, 2, 'Проверка: сальдо кон. Дт = Кт')
osv.cell(T + 3, 7, f'=IF(G{T}=H{T},"OK","ОШИБКА")')
osv.cell(T + 4, 2, 'Проверка: сальдо нач. Дт = Кт')
osv.cell(T + 4, 3, f'=IF(C{T}=D{T},"OK","ОШИБКА")')
osv.cell(T + 5, 2, 'Счёт 90 всего (сумма 90-1, 90-2, 90-9)')
osv.cell(T + 5, 9, f'=SUMIF(A2:A{LAST},"90-*",I2:I{LAST})')
osv.cell(T + 6, 2, 'Итого сальдо кон. без счёта 90: Дт')
osv.cell(T + 6, 7, f'=G{T}-SUMIF(A2:A{LAST},"90-*",G2:G{LAST})')
osv.cell(T + 7, 2, 'Итого сальдо кон. без счёта 90: Кт')
osv.cell(T + 7, 8, f'=H{T}-SUMIF(A2:A{LAST},"90-*",H2:H{LAST})')
for r in range(T + 5, T + 8):
    for c in (7, 8, 9):
        osv.cell(r, c).number_format = '#,##0'
widths(osv, [8, 28, 14, 14, 12, 12, 14, 14, 18])
osv.freeze_panes = 'C2'

pv = wb.create_sheet('Проверка')
head(pv, 1, ['Показатель', 'Эталон (Python)', 'В файле (формула)', 'Совпало?'])
checks = [
    ('Обороты по дебету, всего', sum_all, f"='ОСВ'!E{T}"),
    ('Обороты по кредиту, всего', sum_all, f"='ОСВ'!F{T}"),
    ('Сальдо на начало, Дт', 200000, f"='ОСВ'!C{T}"),
    ('Сальдо на начало, Кт', 200000, f"='ОСВ'!D{T}"),
    ('Сальдо на конец, Дт (все счета)', end_d, f"='ОСВ'!G{T}"),
    ('Сальдо на конец, Кт (все счета)', end_k, f"='ОСВ'!H{T}"),
    ('Сальдо на конец, Дт без счёта 90', no90_d, f"='ОСВ'!G{T + 6}"),
    ('Сальдо на конец, Кт без счёта 90', no90_k, f"='ОСВ'!H{T + 7}"),
    ('Счёт 90 в целом', sum90, f"='ОСВ'!I{T + 5}"),
]
for a, name, kind, op in ACC:
    checks.append((f'Сальдо кон. по счёту {a} (+ Дт / − Кт)', end[a], f"='ОСВ'!I{2 + [x[0] for x in ACC].index(a)}"))
for i, (n, e, f) in enumerate(checks, 2):
    pv.cell(i, 1, n)
    pv.cell(i, 2, e).number_format = '#,##0'
    pv.cell(i, 3, f).number_format = '#,##0'
    pv.cell(i, 4, f'=IF(B{i}=C{i},"OK","ОШИБКА")')
    for c in range(1, 5):
        pv.cell(i, c).border = BORDER
n = len(checks) + 3
pv.cell(n, 1, 'Все проверки')
pv.cell(n, 4, f'=IF(COUNTIF(D2:D{len(checks) + 1},"OK")={len(checks)},"OK","ЕСТЬ ОШИБКИ")')
widths(pv, [48, 18, 18, 12])

wb.save(OUT)
print('OK', OUT, end)
