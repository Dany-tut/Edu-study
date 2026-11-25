"""Чек-лист закрытия месяца на 10 организаций (урок m16-07 курса «Бухгалтерия»).

Вывод: public/courses/accounting/zakrytie-mesyaca-cheklist.xlsx
Пункты повторяют урок m16-07 (практическая рекомендация курса, не нормативный
документ). Формулы стоят во всех столбцах организаций — протягивать не нужно.
Эталоны листа «Проверка» считаются здесь же, независимо от формул Excel.
Запуск: <venv>/bin/python scripts/accounting/build_zakrytie.py
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter

OUT = 'public/courses/accounting/zakrytie-mesyaca-cheklist.xlsx'
ITEMS = [
    ('До закрытия', 'Банк: остаток 51 = выпискам на конец месяца', 'ОСВ по счёту 51 ↔ выписки'),
    ('До закрытия', 'Касса: остаток 50 не отрицательный, документы введены', 'Карточка счёта 50'),
    ('До закрытия', 'Первичка: поступления и реализации получены и введены', 'Журнал документов, ЭДО'),
    ('До закрытия', 'Расчёты 60/62/76: нет развёрнутого сальдо по контрагенту', 'ОСВ 60, 62 по субконто'),
    ('До закрытия', 'Нет отрицательных остатков 41/10/43', 'ОСВ по счетам запасов'),
    ('До закрытия', 'Зарплата начислена / отражение из ЗУП получено', 'Отражение зарплаты в учёте'),
    ('До закрытия', 'Авансовые отчёты (71) введены', 'ОСВ по счёту 71'),
    ('Закрытие', 'Перепроведение документов за месяц (при необходимости)', 'Помощник закрытия месяца'),
    ('Закрытие', 'Закрытие месяца выполнено без ошибок', 'Операции → Закрытие периода → Закрытие месяца'),
    ('После закрытия', '25/26/44 без сальдо (кроме распределённых транспортных)', 'ОСВ за месяц'),
    ('После закрытия', 'Результат 90 и 91 закрыт на 99, сверен вручную', 'Справки-расчёты, ОСВ 99'),
    ('После закрытия', 'Амортизация начислена и сверена', 'Карточка счёта 02'),
    ('После закрытия', 'Экспресс-проверка без новых ошибок', 'Отчеты → Анализ учета → Экспресс-проверка'),
    ('После закрытия', 'Дата запрета изменения установлена (последним шагом)', 'Даты запрета изменения'),
]
ORGS = [f'Организация {i}' for i in range(1, 11)]
N = len(ITEMS)
FIRST, LAST = 2, 1 + N  # строки пунктов на листе «Чек-лист»
# Учебные отметки: три организации заполнены, остальные пусты.
DEMO = {
    0: ['да'] * N,                                          # всё закрыто
    1: ['да'] * 4 + ['нет'] + ['да'] * (N - 5),             # минус по запасам, а запрет уже стоит
    2: ['да'] * 6 + ['н/п', 'н/п'] + ['да'] * 4 + ['', ''],  # в работе: нет экспресс-проверки и запрета
}

wb = Workbook()
ins = wb.active
ins.title = 'Инструкция'
for row in [
    ['Чек-лист закрытия месяца — курс «Бухгалтерия», урок «Контрольный чек-лист закрытия месяца»'],
    ['1. Переименуйте столбцы «Организация 1…10» на листе «Чек-лист» (можно условными названиями).'],
    ['2. В ячейках выбирайте из списка: да / нет / н/п (не применяется к этой организации).'],
    ['3. Лист «Итоги» считает сам: сколько пунктов выполнено, статус и предупреждения.'],
    ['4. «Запрет раньше проверок!» — дата запрета отмечена «да», а другой пункт ещё «нет» или пуст.'],
    ['5. Столбцы B–D трёх первых организаций заполнены для примера — очистите их перед работой.'],
    ['Пункты — практическая рекомендация курса для 1С:Бухгалтерии 3.0, коммерческая организация, 2026 год.'],
    ['С отчётности 2027 года дополните чек-лист по модулю курса о ФСБУ 9/2025 и 10/2026.'],
    ['Не вносите реальные названия и реквизиты, если отправляете файл преподавателю или в ИИ.'],
]:
    ins.append(row)
ins['A1'].font = Font(bold=True, size=13)
ins.column_dimensions['A'].width = 110

ws = wb.create_sheet('Чек-лист')
ws.append(['Блок', 'Пункт', 'Где проверить'] + ORGS + ['Комментарий'])
for i, (block, item, where) in enumerate(ITEMS):
    marks = [DEMO.get(o, [''] * N)[i] for o in range(len(ORGS))]
    ws.append([block, item, where] + [m or None for m in marks] + [None])
for c in range(1, 4 + len(ORGS) + 1):
    ws.cell(1, c).font = Font(bold=True)
    ws.cell(1, c).fill = PatternFill('solid', fgColor='E3EDFB')
    ws.cell(1, c).alignment = Alignment(wrap_text=True, vertical='top')
ws.column_dimensions['A'].width = 15
ws.column_dimensions['B'].width = 52
ws.column_dimensions['C'].width = 38
for o in range(len(ORGS)):
    ws.column_dimensions[get_column_letter(4 + o)].width = 13
ws.column_dimensions[get_column_letter(4 + len(ORGS))].width = 30
ws.freeze_panes = 'D2'
rng = f'D{FIRST}:{get_column_letter(3 + len(ORGS))}{LAST}'
dv = DataValidation(type='list', formula1='"да,нет,н/п"', allow_blank=True, showErrorMessage=True,
                    errorTitle='Только из списка', error='Выберите: да, нет или н/п')
ws.add_data_validation(dv)
dv.add(rng)
ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"нет"'], fill=PatternFill('solid', fgColor='FDECEA')))
ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"да"'], fill=PatternFill('solid', fgColor='E4F5EC')))

it = wb.create_sheet('Итоги')
it.append(['Организация', 'Выполнено («да»)', 'Не применяется', 'Нужно выполнить', 'Есть «нет»', 'Статус', 'Предупреждение'])
for o, name in enumerate(ORGS):
    col = get_column_letter(4 + o)
    r = o + 2
    span = f"'Чек-лист'!{col}${FIRST}:{col}${LAST}"
    last_item = f"'Чек-лист'!{col}${LAST}"
    before = f"'Чек-лист'!{col}${FIRST}:{col}${LAST - 1}"
    it.append([
        f"='Чек-лист'!{col}1",
        f'=COUNTIF({span},"да")',
        f'=COUNTIF({span},"н/п")',
        f'={N}-C{r}',
        f'=COUNTIF({span},"нет")',
        f'=IF(B{r}+C{r}=0,"Не начато",IF(B{r}=D{r},"Закрыт",IF(E{r}>0,"Есть «нет»","В работе")))',
        f'=IF(AND({last_item}="да",COUNTIF({before},"да")+COUNTIF({before},"н/п")<{N - 1}),"Запрет раньше проверок!","")',
    ])
for c in range(1, 8):
    it.cell(1, c).font = Font(bold=True)
it.column_dimensions['A'].width = 18
it.column_dimensions['F'].width = 14
it.column_dimensions['G'].width = 26
tot = len(ORGS) + 3
it.cell(tot, 1, 'Закрыто организаций')
it.cell(tot, 2, f'=COUNTIF(F2:F{len(ORGS) + 1},"Закрыт")')
it.cell(tot, 1).font = Font(bold=True)


# Эталоны — независимо от формул
def expect(marks):
    done = sum(m == 'да' for m in marks)
    na = sum(m == 'н/п' for m in marks)
    no = sum(m == 'нет' for m in marks)
    need = N - na
    if done + na == 0:
        status = 'Не начато'
    elif done == need:
        status = 'Закрыт'
    elif no > 0:
        status = 'Есть «нет»'
    else:
        status = 'В работе'
    warn = marks[-1] == 'да' and sum(m in ('да', 'н/п') for m in marks[:-1]) < N - 1
    return done, na, status, warn


ck = wb.create_sheet('Проверка')
ck.append(['Показатель', 'Эталон (посчитан независимо)', 'В файле', 'Совпало?'])
rows = []
closed = 0
for o in range(3):
    done, na, status, warn = expect(DEMO[o])
    closed += status == 'Закрыт'
    r = o + 2
    rows += [
        (f'{ORGS[o]}: выполнено', done, f'=Итоги!B{r}'),
        (f'{ORGS[o]}: не применяется', na, f'=Итоги!C{r}'),
        (f'{ORGS[o]}: статус', status, f'=Итоги!F{r}'),
        (f'{ORGS[o]}: предупреждение', 'Запрет раньше проверок!' if warn else '', f'=Итоги!G{r}'),
    ]
rows.append(('Закрыто организаций', closed, f'=Итоги!B{tot}'))
for i, (name, val, f) in enumerate(rows, start=2):
    ck.append([name, val, f, f'=IF(B{i}=C{i},"OK","ОШИБКА")'])
ck.column_dimensions['A'].width = 34
ck.column_dimensions['B'].width = 28
ck.column_dimensions['C'].width = 28
wb.save(OUT)
print(OUT, [(n, v) for n, v, _ in rows])
