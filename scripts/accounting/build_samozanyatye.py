"""Учебный журнал выплат самозанятым с контролем — курс «Бухгалтерия», модуль EXP13.

Запуск: <venv>/bin/python scripts/accounting/build_samozanyatye.py
Вывод:  public/courses/accounting/samozanyatye-kontrol.xlsx

Все данные вымышленные: люди «Иванов И. И.» и т. п., ИНН — заглушки 7700000001NN.
Формулы пишутся английскими именами с запятыми — Excel покажет русские.
Эталоны листа «Проверка» считаются здесь же в Python, независимо от формул.
"""
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parents[2] / 'public' / 'courses' / 'accounting' / 'samozanyatye-kontrol.xlsx'
LAST = 101  # формулы стоят в строках 2..101 — хватит на свои 100 выплат

# Дата выплаты, исполнитель, ИНН (заглушка), период услуг, сумма, статус НПД (ручной ввод),
# дата проверки, № чека, сумма чека, статус чека, связь с работодателем (столбец K):
# дата увольнения, «работает» — действующий работник, «не был» — работником не был.
# Пустой K — не заполнено: формула P покажет «заполните K», итог — «Проверить».
ROWS = [
    (date(2026, 10, 5), 'Иванов И. И.', '770000000156', '2026-09', 30000, 'Является', date(2026, 10, 5), 'УЧ-0001', 30000, 'Получен', 'не был'),
    (date(2026, 10, 5), 'Петров П. П.', '770000000220', '2026-09', 15000, 'Является', date(2026, 10, 5), 'УЧ-0002', 15000, 'Получен', 'не был'),
    (date(2026, 10, 5), 'Сидорова А. И.', '770000000103', '2026-09', 20000, 'Не является', date(2026, 10, 5), '', None, 'Нет', 'не был'),
    (date(2026, 10, 5), 'Ким О. С.', '770000000104', '2026-09', 12000, 'Является', date(2026, 10, 5), 'УЧ-0004', 11000, 'Получен', 'не был'),
    (date(2026, 10, 5), 'Орлова М. С.', '770000000105', '2026-09', 18000, 'Является', date(2026, 10, 5), 'УЧ-0005', 18000, 'Аннулирован', 'не был'),
    (date(2026, 10, 7), 'Иванов И. И.', '770000000156', '2026-09', 30000, 'Является', date(2026, 10, 7), '', None, 'Нет', 'не был'),
    (date(2026, 11, 5), 'Белов Б. Б.', '770000000106', '2026-10', 25000, 'Является', date(2026, 11, 5), 'УЧ-0007', 25000, 'Получен', date(2025, 3, 31)),
    (date(2026, 11, 5), 'Громова Г. Г.', '770000000107', '2026-10', 9000, 'Является', date(2026, 11, 5), 'УЧ-0008', 9000, 'Получен', date(2023, 6, 30)),
    (date(2026, 11, 5), 'Петров П. П.', '770000000220', '2026-10', 15000, 'Является', date(2026, 11, 5), 'УЧ-0009', 15000, 'Получен', 'не был'),
    (date(2026, 11, 5), 'Дмитриев Д. Д.', '770000000108', '2026-10', 40000, 'Не проверен', None, '', None, 'Нет', 'не был'),
]

HEAD = ['Дата выплаты', 'Исполнитель', 'ИНН (заглушка)', 'Период услуг', 'Сумма выплаты',
        'Статус НПД на дату выплаты (ввод)', 'Дата проверки статуса', '№ чека', 'Сумма чека',
        'Статус чека (ввод)', 'Работник? Дата увольнения / «работает» / «не был»',
        'Контроль: НПД', 'Контроль: чек', 'Контроль: сумма чека', 'Контроль: дубль', 'Контроль: бывший работник', 'Итог']

BOLD = Font(bold=True)
HEAD_FILL = PatternFill('solid', fgColor='E8EEF9')
INPUT_FILL = PatternFill('solid', fgColor='FFF7E0')
CALC_FILL = PatternFill('solid', fgColor='EEF7F0')
WARN_FILL = PatternFill('solid', fgColor='FDECEA')


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    import calendar
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def expected():
    """Независимый расчёт тех же проверок в Python."""
    res = []
    for i, r in enumerate(ROWS):
        pay, _, inn, per, s, npd, _, _, csum, cst, fired = r
        c_npd = 'ок' if npd == 'Является' else ('не НПД' if npd == 'Не является' else 'не проверен')
        c_chk = 'ок' if cst == 'Получен' else ('аннулирован' if cst == 'Аннулирован' else 'нет чека')
        c_sum = '—' if cst != 'Получен' else ('ок' if abs((csum or 0) - s) < 0.005 else 'не совпадает')
        dup = sum(1 for x in ROWS if x[2] == inn and x[3] == per and x[4] == s) > 1
        c_dup = 'дубль?' if dup else 'нет'
        if fired is None:
            c_fired = 'заполните K'
        elif fired == 'не был':
            c_fired = 'нет'
        elif fired == 'работает':
            c_fired = 'работник'
        else:
            c_fired = 'менее 2 лет' if add_months(fired, 24) > pay else 'нет'
        ok = c_npd == 'ок' and c_chk == 'ок' and c_sum == 'ок' and c_dup == 'нет' and c_fired == 'нет'
        res.append((c_npd, c_chk, c_sum, c_dup, c_fired, 'ОК' if ok else 'Проверить'))
    return res


def build():
    wb = Workbook()
    ins = wb.active
    ins.title = 'Инструкция'
    lines = [
        'Журнал выплат самозанятым с контролем — учебный файл курса «Бухгалтерия» (Искра).',
        'Все люди, ИНН и номера чеков вымышленные. Не вносите сюда реальные персональные данные без правил компании о защите ПДн.',
        '',
        'Как пользоваться',
        '1. Откройте лист «Журнал». Жёлтые столбцы A–K — ввод, зелёные L–Q и «Итог» — формулы, их не трогайте.',
        '2. Статус НПД на дату выплаты (столбец F) вводите вручную после проверки в сервисе ФНС «Проверить статус налогоплательщика НПД» (npd.nalog.ru/check-status) на дату выплаты.',
        '3. Дату проверки (G) пишите всегда: она показывает, на какой день вы смотрели статус.',
        '4. Статус чека (J): «Получен», «Аннулирован» или «Нет». Сумму чека (I) — из самого чека.',
        '5. Столбец K заполняйте в каждой строке: дату увольнения, если исполнитель был вашим работником; «работает», если он ваш работник сейчас; «не был», если работником не был. Пустой K формула не считает ответом «не был»: покажет «заполните K».',
        '6. Столбец «Итог» = «ОК» только если все пять проверок пройдены. «Проверить» — разберитесь до оплаты или до закрытия месяца.',
        '7. Лист «Проверка» сверяет ваш расчёт с эталоном учебных данных. После замены данных на свои эталон перестанет совпадать — это нормально.',
        '',
        'Что значат проверки',
        'Контроль: НПД — статус «Является» на дату выплаты. Иначе выплата не по правилам 422-ФЗ: нужна другая схема (ГПХ с НДФЛ и взносами) — решает ответственный бухгалтер.',
        'Контроль: чек — чек получен и не аннулирован. Без чека расходы не учитываются (ч. 8–9 ст. 15 422-ФЗ), освобождение от взносов не действует (ч. 1 ст. 15).',
        'Контроль: сумма чека — сумма чека совпадает с выплатой (допуск 0,5 коп.).',
        'Контроль: дубль — тот же ИНН, тот же период и та же сумма встречаются больше одного раза. Это подсказка, а не вывод: проверьте выписку, прежде чем что-то делать.',
        'Контроль: бывший работник — «менее 2 лет»: с даты увольнения прошло меньше двух лет; «работник»: исполнитель — ваш действующий работник (п. 8 ч. 2 ст. 6 422-ФЗ: в обоих случаях доход не облагается НПД); «заполните K»: связь с работодателем не указана.',
        '',
        'Формулы рассчитаны на строки 2–101. Excel для Windows/Mac (Microsoft 365, 2021, 2019); функция ДАТАМЕС (EDATE) есть во всех этих версиях.',
    ]
    for i, t in enumerate(lines, 1):
        c = ins.cell(row=i, column=1, value=t)
        if t in ('Как пользоваться', 'Что значат проверки') or i == 1:
            c.font = BOLD
    ins.column_dimensions['A'].width = 140

    ws = wb.create_sheet('Журнал')
    for c, h in enumerate(HEAD, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font = BOLD
        cell.fill = HEAD_FILL
        cell.alignment = Alignment(wrap_text=True, vertical='top')
    widths = [13, 18, 16, 11, 13, 18, 13, 10, 11, 13, 16, 12, 13, 14, 11, 15, 11]
    for i, w in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = w
    ws.row_dimensions[1].height = 48
    ws.freeze_panes = 'C2'

    for r in range(2, LAST + 1):
        if r - 2 < len(ROWS):
            row = ROWS[r - 2]
            for c, v in enumerate(row, 1):
                ws.cell(row=r, column=c, value=v if v != '' else None)
        for c in range(1, 12):
            ws.cell(row=r, column=c).fill = INPUT_FILL
        for c in (1, 7, 11):
            ws.cell(row=r, column=c).number_format = 'DD.MM.YYYY'
        for c in (5, 9):
            ws.cell(row=r, column=c).number_format = '# ##0.00'
        ws.cell(row=r, column=3).number_format = '@'
        ws.cell(row=r, column=4).number_format = '@'
        f = {
            12: f'=IF($C{r}="","",IF(F{r}="Является","ок",IF(F{r}="Не является","не НПД","не проверен")))',
            13: f'=IF($C{r}="","",IF(J{r}="Получен","ок",IF(J{r}="Аннулирован","аннулирован","нет чека")))',
            14: f'=IF($C{r}="","",IF(J{r}<>"Получен","—",IF(ABS(I{r}-E{r})<0.005,"ок","не совпадает")))',
            15: f'=IF($C{r}="","",IF(COUNTIFS($C$2:$C${LAST},C{r},$D$2:$D${LAST},D{r},$E$2:$E${LAST},E{r})>1,"дубль?","нет"))',
            16: f'=IF($C{r}="","",IF(K{r}="","заполните K",IF(K{r}="не был","нет",IF(K{r}="работает","работник",IF(EDATE(K{r},24)>A{r},"менее 2 лет","нет")))))',
            17: f'=IF($C{r}="","",IF(AND(L{r}="ок",M{r}="ок",N{r}="ок",O{r}="нет",P{r}="нет"),"ОК","Проверить"))',
        }
        for c, formula in f.items():
            cell = ws.cell(row=r, column=c, value=formula)
            cell.fill = CALC_FILL
    ws.conditional_formatting.add(f'Q2:Q{LAST}', FormulaRule(formula=['$Q2="Проверить"'], fill=WARN_FILL))

    dv_npd = DataValidation(type='list', formula1='"Является,Не является,Не проверен"', allow_blank=True)
    dv_chk = DataValidation(type='list', formula1='"Получен,Аннулирован,Нет"', allow_blank=True)
    ws.add_data_validation(dv_npd)
    ws.add_data_validation(dv_chk)
    dv_npd.add(f'F2:F{LAST}')
    dv_chk.add(f'J2:J{LAST}')

    # ── Проверка ──────────────────────────────────────────────────────────────
    exp = expected()
    pr = wb.create_sheet('Проверка')
    pr.append(['Контрольная величина', 'Эталон (учебные данные)', 'Ваш расчёт', 'Сверка'])
    for c in range(1, 5):
        pr.cell(row=1, column=c).font = BOLD
        pr.cell(row=1, column=c).fill = HEAD_FILL
    J = 'Журнал!'
    checks = [
        ('Строк с выплатами', len(ROWS), f'=COUNTA({J}C2:C{LAST})'),
        ('Сумма выплат, руб.', sum(r[4] for r in ROWS), f'=SUM({J}E2:E{LAST})'),
        ('Итог «ОК»', sum(1 for e in exp if e[5] == 'ОК'), f'=COUNTIF({J}Q2:Q{LAST},"ОК")'),
        ('Итог «Проверить»', sum(1 for e in exp if e[5] == 'Проверить'), f'=COUNTIF({J}Q2:Q{LAST},"Проверить")'),
        ('НПД не «ок» (не НПД или не проверен)', sum(1 for e in exp if e[0] != 'ок'), f'=COUNTIF({J}L2:L{LAST},"не НПД")+COUNTIF({J}L2:L{LAST},"не проверен")'),
        ('Чек не «ок» (нет или аннулирован)', sum(1 for e in exp if e[1] != 'ок'), f'=COUNTIF({J}M2:M{LAST},"нет чека")+COUNTIF({J}M2:M{LAST},"аннулирован")'),
        ('Сумма чека не совпадает', sum(1 for e in exp if e[2] == 'не совпадает'), f'=COUNTIF({J}N2:N{LAST},"не совпадает")'),
        ('Строк с признаком дубля', sum(1 for e in exp if e[3] == 'дубль?'), f'=COUNTIF({J}O2:O{LAST},"дубль?")'),
        ('Бывший работник менее 2 лет', sum(1 for e in exp if e[4] == 'менее 2 лет'), f'=COUNTIF({J}P2:P{LAST},"менее 2 лет")'),
        ('Действующий работник или K не заполнен', sum(1 for e in exp if e[4] in ('работник', 'заполните K')), f'=COUNTIF({J}P2:P{LAST},"работник")+COUNTIF({J}P2:P{LAST},"заполните K")'),
        ('Сумма выплат со статусом «ОК», руб.', sum(r[4] for r, e in zip(ROWS, exp) if e[5] == 'ОК'), f'=SUMIF({J}Q2:Q{LAST},"ОК",{J}E2:E{LAST})'),
    ]
    for i, (name, ref, formula) in enumerate(checks, 2):
        pr.cell(row=i, column=1, value=name)
        pr.cell(row=i, column=2, value=ref)
        pr.cell(row=i, column=3, value=formula)
        pr.cell(row=i, column=4, value=f'=IF(B{i}=C{i},"совпадает","расхождение")')
    n = len(checks) + 3
    pr.cell(row=n, column=1, value='Эталон по строкам учебных данных (что должно получиться в столбце «Итог»)').font = BOLD
    pr.cell(row=n + 1, column=1, value='Строка журнала')
    pr.cell(row=n + 1, column=2, value='Эталон «Итог»')
    pr.cell(row=n + 1, column=3, value='Ваш «Итог»')
    pr.cell(row=n + 1, column=4, value='Сверка')
    for k, e in enumerate(exp):
        rr = n + 2 + k
        pr.cell(row=rr, column=1, value=k + 2)
        pr.cell(row=rr, column=2, value=e[5])
        pr.cell(row=rr, column=3, value=f'={J}Q{k + 2}')
        pr.cell(row=rr, column=4, value=f'=IF(B{rr}=C{rr},"совпадает","расхождение")')
    pr.column_dimensions['A'].width = 44
    pr.column_dimensions['B'].width = 24
    pr.column_dimensions['C'].width = 14
    pr.column_dimensions['D'].width = 14

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print('saved', OUT)
    for name, ref, _ in checks:
        print(f'  {name}: {ref}')
    for k, e in enumerate(exp):
        print('  row', k + 2, e)


if __name__ == '__main__':
    build()
