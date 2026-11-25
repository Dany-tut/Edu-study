# Сборка учебного шаблона сверки: public/courses/accounting/sverka-shablon.xlsx
# Запуск: python scripts/accounting/build_sverka.py  (нужен openpyxl)
# Все данные вымышленные. Формулы пишутся английскими именами с запятыми;
# русский Excel показывает их русскими именами и «;».
import datetime as dt
from collections import Counter
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter

OUT = Path(__file__).resolve().parents[2] / 'public/courses/accounting/sverka-shablon.xlsx'
D = lambda d: dt.date(2026, 11, d)

REG = [  # ID, дата, контрагент, сумма
    ('P101', D(2), 'Альфа', 10000), ('P102', D(3), 'Бета', 8500), ('P103', D(4), 'Гамма', 15000),
    ('P104', D(5), 'Альфа', 4000), ('P105', D(9), 'Бета', 6000), ('P106', D(10), 'Гамма', 2500),
    ('P107', D(12), 'Альфа', 7200), ('P108', D(16), 'Бета', 3000),
]
BANK = [
    ('P101', D(2), 'Альфа', 10000), ('P102', D(3), 'Бета', 8500), ('P103', D(4), 'Гамма', 15000),
    (None, D(9), 'Бета', 6000), ('P106', D(10), 'Гамма', 2500), ('P106', D(11), 'Гамма', 2500),
    ('P107', D(12), 'Альфа', 7020), ('P108', D(16), 'Бета', 3000), ('P199', D(18), 'Альфа', 900),
]
CONTRACTS = [('Д-01', 'Альфа', 30000), ('Д-02', 'Бета', 20000), ('Д-03', 'Гамма', 15000)]
PAYS = [('Д-01', 10000), ('Д-01', 12000), ('Д-02', 20000), ('Д-03', 5000), ('Д-09', 1000)]
NR, NB, NC, NP = len(REG), len(BANK), len(CONTRACTS), len(PAYS)

# ---- независимый расчёт эталонов -------------------------------------------
reg_sum = sum(r[3] for r in REG); bank_sum = sum(b[3] for b in BANK)
reg_status, bank_status = [], []
for i, (rid, rd, rc, ra) in enumerate(REG):
    n_id = sum(1 for b in BANK if b[0] == rid)
    n_crit = sum(1 for b in BANK if (b[1], b[2], b[3]) == (rd, rc, ra))
    s_id = sum(b[3] for b in BANK if b[0] == rid)
    if sum(1 for r in REG if r[0] == rid) > 1: st = 'Дубль ID в реестре'
    elif n_id == 0: st = 'Найдено по дата+сумма+контрагент' if n_crit else 'Нет в банке'
    elif n_id > 1: st = 'Повтор оплаты в банке'
    elif s_id == ra: st = 'Совпало'
    else: st = 'Расхождение суммы'
    reg_status.append(st)
seen = Counter()
for bid, bd, bc, ba in BANK:
    n_crit = sum(1 for r in REG if (r[1], r[2], r[3]) == (bd, bc, ba))
    if bid is None: st = 'Есть по дата+сумма+контрагент' if n_crit else 'Нет в реестре'
    elif not any(r[0] == bid for r in REG): st = 'Нет в реестре'
    else:
        seen[bid] += 1
        if seen[bid] > 1: st = 'Повторная оплата'
        elif sum(r[3] for r in REG if r[0] == bid) != ba: st = 'Расхождение суммы'
        else: st = 'Есть в реестре'
    bank_status.append(st)
cnt_r, cnt_b = Counter(reg_status), Counter(bank_status)
sum_r = lambda s: sum(r[3] for r, st in zip(REG, reg_status) if st == s)
sum_b = lambda s: sum(b[3] for b, st in zip(BANK, bank_status) if st == s)
bridge = -sum_r('Нет в банке') + sum_b('Повторная оплата') + sum_b('Нет в реестре') + (sum_b('Расхождение суммы') - sum_r('Расхождение суммы'))
assert bank_sum - reg_sum == bridge, (bank_sum - reg_sum, bridge)
paid = {c[0]: sum(p[1] for p in PAYS if p[0] == c[0]) for c in CONTRACTS}
c_total = sum(c[2] for c in CONTRACTS); c_paid = sum(paid.values()); c_saldo = c_total - c_paid
c_unmatched = sum(p[1] for p in PAYS if p[0] not in paid)

# ---- оформление -------------------------------------------------------------
HEAD = PatternFill('solid', fgColor='1F2A44'); HF = Font(bold=True, color='FFFFFF')
YEL = PatternFill('solid', fgColor='FFF4C2'); GRY = PatternFill('solid', fgColor='EEF0F5')
thin = Side(style='thin', color='C9CEDA'); BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
def head(ws, row, titles):
    for c, t in enumerate(titles, 1):
        x = ws.cell(row, c, t); x.fill = HEAD; x.font = HF; x.alignment = Alignment(wrap_text=True, vertical='center'); x.border = BORDER
def widths(ws, ws_w):
    for i, w in enumerate(ws_w, 1): ws.column_dimensions[get_column_letter(i)].width = w

wb = Workbook()
# 1. Инструкция
ws = wb.active; ws.title = 'Инструкция'
lines = [
    ('Учебный шаблон сверки «реестр платежей ↔ банковская выписка»', True),
    ('Курс «Бухгалтерия», модуль «Сверки». Все данные вымышленные (организации «Альфа», «Бета», «Гамма»). Не используйте учебные данные в отчётности.', False),
    ('', False),
    ('Листы', True),
    ('Реестр — что мы планировали заплатить. Столбцы E–J — формулы: сверка «от реестра к банку».', False),
    ('Банк — выписка. Столбцы E–H — формулы: сверка «от банка к реестру» (обратное направление).', False),
    ('Итоги — контрольные суммы, количество по статусам и «мост» от разницы сумм к найденным причинам. Контроль должен быть 0.', False),
    ('Договоры — сверка начислений по договорам с оплатами и остаток задолженности.', False),
    ('Проверка — эталоны, посчитанные независимо (не формулами листов). Столбец D показывает OK или ОШИБКА.', False),
    ('', False),
    ('Как пользоваться со своими данными', True),
    ('1. Вставьте свои строки в Реестр (A:D) и Банк (A:D) поверх учебных. Столбцы с формулами не затирайте.', False),
    ('2. Если строк больше, чем в учебном примере, протяните формулы вниз и расширьте диапазоны (в учебнике: Ctrl+D) — диапазоны в формулах $A$2:$A$10 и т. п. нужно увеличить.', False),
    ('3. Сначала смотрите статусы «Нет в банке», «Нет в реестре», «Повтор…», «Расхождение суммы». Ничего не удаляйте: сверяйте с первичкой и назначением платежа.', False),
    ('4. «Найдено по дата+сумма+контрагент» — предположение. Подтвердите по документу, затем впишите ID в выписку.', False),
    ('', False),
    ('Версии Excel', True),
    ('Формулы используют СЧЁТЕСЛИ, СЧЁТЕСЛИМН, СУММЕСЛИ, ЕСЛИ, ЕСЛИОШИБКА — работают в Excel 2016, 2019, 2021, Microsoft 365. Динамические массивы и ПРОСМОТРX не нужны.', False),
    ('Формулы записаны в стандартном формате; русский Excel показывает локальные имена и «;». Значения считаются при открытии файла — при необходимости нажмите F9 или Ctrl+Alt+F9.', False),
]
for i, (t, b) in enumerate(lines, 1):
    c = ws.cell(i, 1, t); c.font = Font(bold=b, size=14 if i == 1 else 11); c.alignment = Alignment(wrap_text=True, vertical='top')
ws.column_dimensions['A'].width = 120

# 2. Реестр
rg = wb.create_sheet('Реестр')
head(rg, 1, ['ID реестра', 'Дата', 'Контрагент', 'Сумма реестра', 'Строк в банке по ID', 'Сумма в банке по ID', 'Строк по ID+сумма+дата', 'Строк по дата+сумма+контрагент', 'Статус', 'Разница (реестр − банк)'])
RL = NR + 1; BL = NB + 1
for i, (rid, rd, rc, ra) in enumerate(REG, 2):
    rg.cell(i, 1, rid); rg.cell(i, 2, rd).number_format = 'DD.MM.YYYY'; rg.cell(i, 3, rc); rg.cell(i, 4, ra).number_format = '#,##0'
    rg.cell(i, 5, f"=COUNTIF('Банк'!$A$2:$A${BL},A{i})")
    rg.cell(i, 6, f"=SUMIF('Банк'!$A$2:$A${BL},A{i},'Банк'!$D$2:$D${BL})").number_format = '#,##0'
    rg.cell(i, 7, f"=COUNTIFS('Банк'!$A$2:$A${BL},A{i},'Банк'!$D$2:$D${BL},D{i},'Банк'!$B$2:$B${BL},B{i})")
    rg.cell(i, 8, f"=COUNTIFS('Банк'!$B$2:$B${BL},B{i},'Банк'!$C$2:$C${BL},C{i},'Банк'!$D$2:$D${BL},D{i})")
    rg.cell(i, 9, f'=IF(COUNTIF($A$2:$A${RL},A{i})>1,"Дубль ID в реестре",IF(E{i}=0,IF(H{i}>=1,"Найдено по дата+сумма+контрагент","Нет в банке"),IF(E{i}>1,"Повтор оплаты в банке",IF(F{i}=D{i},"Совпало","Расхождение суммы"))))')
    rg.cell(i, 10, f'=IF(E{i}=1,D{i}-F{i},"Проверить")').number_format = '#,##0'
    for c in range(1, 11): rg.cell(i, c).border = BORDER
    for c in range(5, 11): rg.cell(i, c).fill = GRY
rg.cell(RL + 2, 1, 'Итого').font = Font(bold=True)
rg.cell(RL + 2, 4, f'=SUM(D2:D{RL})').number_format = '#,##0'
widths(rg, [12, 12, 14, 14, 14, 14, 16, 18, 36, 16]); rg.freeze_panes = 'A2'
rg.conditional_formatting.add(f'I2:I{RL}', FormulaRule(formula=['$I2<>"Совпало"'], fill=PatternFill('solid', bgColor='FDECEA')))

# 3. Банк
bk = wb.create_sheet('Банк')
head(bk, 1, ['ID платежа (из назначения)', 'Дата', 'Контрагент', 'Сумма банка', 'Строк в реестре по ID', 'Строк по дата+сумма+контрагент в реестре', 'Статус', 'Сумма в реестре по ID'])
for i, (bid, bd, bc, ba) in enumerate(BANK, 2):
    if bid: bk.cell(i, 1, bid)
    bk.cell(i, 2, bd).number_format = 'DD.MM.YYYY'; bk.cell(i, 3, bc); bk.cell(i, 4, ba).number_format = '#,##0'
    bk.cell(i, 5, f"=IF(A{i}=\"\",0,COUNTIF('Реестр'!$A$2:$A${RL},A{i}))")
    bk.cell(i, 6, f"=COUNTIFS('Реестр'!$B$2:$B${RL},B{i},'Реестр'!$C$2:$C${RL},C{i},'Реестр'!$D$2:$D${RL},D{i})")
    bk.cell(i, 8, f"=IF(A{i}=\"\",0,SUMIF('Реестр'!$A$2:$A${RL},A{i},'Реестр'!$D$2:$D${RL}))").number_format = '#,##0'
    bk.cell(i, 7, f'=IF(E{i}=0,IF(F{i}>=1,"Есть по дата+сумма+контрагент","Нет в реестре"),IF(COUNTIF($A$2:A{i},A{i})>1,"Повторная оплата",IF(H{i}<>D{i},"Расхождение суммы","Есть в реестре")))')
    for c in range(1, 9): bk.cell(i, c).border = BORDER
    for c in range(5, 9): bk.cell(i, c).fill = GRY
bk.cell(BL + 2, 1, 'Итого').font = Font(bold=True)
bk.cell(BL + 2, 4, f'=SUM(D2:D{BL})').number_format = '#,##0'
widths(bk, [18, 12, 14, 14, 14, 20, 34, 16]); bk.freeze_panes = 'A2'
bk.conditional_formatting.add(f'G2:G{BL}', FormulaRule(formula=['$G2<>"Есть в реестре"'], fill=PatternFill('solid', bgColor='FDECEA')))

# 4. Итоги
it = wb.create_sheet('Итоги')
head(it, 1, ['Показатель', 'Значение'])
rows = [
    ('Сумма реестра', f"=SUM('Реестр'!D2:D{RL})"),
    ('Сумма банка', f"=SUM('Банк'!D2:D{BL})"),
    ('Разница (банк − реестр)', '=B3-B2'),
    ('Строк реестра', f"=COUNTA('Реестр'!A2:A{RL})"),
    ('Строк банка', f"=COUNTA('Банк'!C2:C{BL})"),
    ('', None),
    ('Причины разницы (мост)', None),
    ('− Нет в банке (сумма по реестру)', f"=-SUMIF('Реестр'!I2:I{RL},\"Нет в банке\",'Реестр'!D2:D{RL})"),
    ('+ Повторная оплата (сумма по банку)', f"=SUMIF('Банк'!G2:G{BL},\"Повторная оплата\",'Банк'!D2:D{BL})"),
    ('+ Нет в реестре (сумма по банку)', f"=SUMIF('Банк'!G2:G{BL},\"Нет в реестре\",'Банк'!D2:D{BL})"),
    ('± Расхождение суммы (банк − реестр)', f"=SUMIF('Банк'!G2:G{BL},\"Расхождение суммы\",'Банк'!D2:D{BL})-SUMIF('Реестр'!I2:I{RL},\"Расхождение суммы\",'Реестр'!D2:D{RL})"),
    ('Сумма причин', '=SUM(B9:B12)'),
    ('Контроль (должен быть 0)', '=B4-B13'),
]
for i, (a, f) in enumerate(rows, 2):
    it.cell(i, 1, a)
    if f is not None: it.cell(i, 2, f).number_format = '#,##0'
    if a.startswith('Причины') or a.startswith('Контроль'): it.cell(i, 1).font = Font(bold=True)
it.cell(16, 1, 'Количество по статусам').font = Font(bold=True)
statuses_r = ['Совпало', 'Расхождение суммы', 'Нет в банке', 'Повтор оплаты в банке', 'Найдено по дата+сумма+контрагент', 'Дубль ID в реестре']
statuses_b = ['Есть в реестре', 'Расхождение суммы', 'Нет в реестре', 'Повторная оплата', 'Есть по дата+сумма+контрагент']
it.cell(17, 1, 'Реестр → банк').font = Font(italic=True)
r0 = 18
for k, s in enumerate(statuses_r):
    it.cell(r0 + k, 1, s); it.cell(r0 + k, 2, f"=COUNTIF('Реестр'!I2:I{RL},A{r0 + k})")
b0 = r0 + len(statuses_r) + 1
it.cell(b0 - 1, 1, 'Банк → реестр').font = Font(italic=True)
for k, s in enumerate(statuses_b):
    it.cell(b0 + k, 1, s); it.cell(b0 + k, 2, f"=COUNTIF('Банк'!G2:G{BL},A{b0 + k})")
widths(it, [48, 16])
ROW = {'Совпало': r0, 'Расхождение суммы': r0 + 1, 'Нет в банке': r0 + 2, 'Повтор оплаты в банке': r0 + 3, 'Найдено по дата+сумма+контрагент': r0 + 4}
ROWB = {s: b0 + k for k, s in enumerate(statuses_b)}

# 5. Договоры
dg = wb.create_sheet('Договоры')
head(dg, 1, ['Договор', 'Контрагент', 'Начислено', 'Оплачено', 'Сальдо (долг)', 'Статус'])
PL = NP + 1
for i, (cid, cc, ca) in enumerate(CONTRACTS, 2):
    dg.cell(i, 1, cid); dg.cell(i, 2, cc); dg.cell(i, 3, ca).number_format = '#,##0'
    dg.cell(i, 4, f'=SUMIF($H$2:$H${PL},A{i},$I$2:$I${PL})').number_format = '#,##0'
    dg.cell(i, 5, f'=C{i}-D{i}').number_format = '#,##0'
    dg.cell(i, 6, f'=IF(E{i}=0,"Закрыт",IF(E{i}>0,"Есть долг","Переплата"))')
    for c in range(1, 7): dg.cell(i, c).border = BORDER
tr = NC + 2
dg.cell(tr, 1, 'Итого').font = Font(bold=True)
for col in 'CDE': dg[f'{col}{tr}'] = f'=SUM({col}2:{col}{NC + 1})'; dg[f'{col}{tr}'].number_format = '#,##0'
head(dg, 1, ['Договор', 'Контрагент', 'Начислено', 'Оплачено', 'Сальдо (долг)', 'Статус'])
for c, t in zip('HIJ', ['Договор в оплате', 'Сумма оплаты', 'Договор есть в списке?']): dg[f'{c}1'] = t; dg[f'{c}1'].fill = HEAD; dg[f'{c}1'].font = HF
for i, (pc, pa) in enumerate(PAYS, 2):
    dg[f'H{i}'] = pc; dg[f'I{i}'] = pa; dg[f'I{i}'].number_format = '#,##0'
    dg[f'J{i}'] = f'=IF(COUNTIF($A$2:$A${NC + 1},H{i})=0,"Нет такого договора","Да")'
dg[f'H{PL + 2}'] = 'Оплаты без договора'; dg[f'I{PL + 2}'] = f'=SUMIF(J2:J{PL},"Нет такого договора",I2:I{PL})'; dg[f'I{PL + 2}'].number_format = '#,##0'
widths(dg, [12, 14, 14, 14, 16, 14, 3, 18, 14, 22])

# 6. Проверка
pv = wb.create_sheet('Проверка')
head(pv, 1, ['Показатель', 'Эталон (посчитан независимо)', 'В файле (формула)', 'Совпало?'])
checks = [
    ('Сумма реестра', reg_sum, '=Итоги!B2'), ('Сумма банка', bank_sum, '=Итоги!B3'), ('Разница банк − реестр', bank_sum - reg_sum, '=Итоги!B4'),
    ('Строк реестра', NR, '=Итоги!B5'), ('Строк банка', NB, '=Итоги!B6'),
    ('Реестр: «Совпало»', cnt_r['Совпало'], f'=Итоги!B{ROW["Совпало"]}'),
    ('Реестр: «Расхождение суммы»', cnt_r['Расхождение суммы'], f'=Итоги!B{ROW["Расхождение суммы"]}'),
    ('Реестр: «Нет в банке»', cnt_r['Нет в банке'], f'=Итоги!B{ROW["Нет в банке"]}'),
    ('Реестр: «Повтор оплаты в банке»', cnt_r['Повтор оплаты в банке'], f'=Итоги!B{ROW["Повтор оплаты в банке"]}'),
    ('Реестр: «Найдено по дата+сумма+контрагент»', cnt_r['Найдено по дата+сумма+контрагент'], f'=Итоги!B{ROW["Найдено по дата+сумма+контрагент"]}'),
    ('Банк: «Нет в реестре»', cnt_b['Нет в реестре'], f'=Итоги!B{ROWB["Нет в реестре"]}'),
    ('Банк: «Повторная оплата»', cnt_b['Повторная оплата'], f'=Итоги!B{ROWB["Повторная оплата"]}'),
    ('Банк: «Расхождение суммы»', cnt_b['Расхождение суммы'], f'=Итоги!B{ROWB["Расхождение суммы"]}'),
    ('Сумма причин (мост)', bridge, '=Итоги!B13'), ('Контроль моста', 0, '=Итоги!B14'),
    ('Договоры: начислено', c_total, f'=Договоры!C{tr}'), ('Договоры: оплачено по договорам', c_paid, f'=Договоры!D{tr}'),
    ('Договоры: задолженность', c_saldo, f'=Договоры!E{tr}'), ('Оплаты без договора', c_unmatched, f'=Договоры!I{PL + 2}'),
]
for i, (n, e, f) in enumerate(checks, 2):
    pv.cell(i, 1, n); pv.cell(i, 2, e).number_format = '#,##0'; pv.cell(i, 3, f).number_format = '#,##0'
    pv.cell(i, 4, f'=IF(ROUND(B{i}-C{i},2)=0,"OK","ОШИБКА")')
last = len(checks) + 1
pv.cell(last + 2, 1, 'Итог проверки').font = Font(bold=True)
pv.cell(last + 2, 4, f'=IF(COUNTIF(D2:D{last},"OK")=ROWS(D2:D{last}),"Все эталоны сошлись","Есть расхождения")').font = Font(bold=True)
pv.cell(last + 4, 1, 'Эталоны записаны числами; если вы заменили учебные данные своими, лист «Проверка» перестанет сходиться — это нормально.')
widths(pv, [46, 28, 20, 14])

OUT.parent.mkdir(parents=True, exist_ok=True); wb.save(OUT)
print('saved', OUT)
print('reg_sum', reg_sum, 'bank_sum', bank_sum, 'diff', bank_sum - reg_sum, 'bridge', bridge)
print('reg', list(zip([r[0] for r in REG], reg_status))); print('bank', list(zip([b[0] for b in BANK], bank_status)))
print('contracts', c_total, c_paid, c_saldo, c_unmatched)
