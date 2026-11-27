"""Шаблон коммерческого предложения (урок m25-03…m25-05 курса «Бухгалтерия»).

Вывод: public/courses/accounting/kp-shablon.xlsx
Листы: Инструкция, Карточка, Прайс, Клиенты, Расчёт КП, Для слияния, Проверка.
Все организации, реквизиты, цены вымышлены. ИНН/ОГРН с верной контрольной суммой.
Эталоны листа «Проверка» считаются здесь, в Python, независимо от формул Excel.
Формулы английскими именами, разделитель — запятая (Excel сам покажет «;» в русской локали).
Файл не пересчитывался в Excel (его у нас нет): значения формул проверены только расчётом в Python.
Запуск: <venv>/bin/python scripts/accounting/build_kp.py
"""
import sys, os, math, datetime
sys.path.insert(0, os.path.dirname(__file__))
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from _xlhelp import head, widths, instruction, GRY, YEL, BORDER, inn10_ok, inn10_with_ctrl

OUT = 'public/courses/accounting/kp-shablon.xlsx'


def ogrn_ctrl(first12):
    return first12 + str(int(first12) % 11 % 10)


# ── исходные данные (вымышленные) ─────────────────────────────────────────────
ORG_INN = inn10_with_ctrl('781234567')
ORG_OGRN = ogrn_ctrl('112784700123')
assert inn10_ok(ORG_INN)
ORG = [
    ('Полное наименование', 'Общество с ограниченной ответственностью «Северный асфальт»'),
    ('Краткое наименование', 'ООО «Северный асфальт»'),
    ('ИНН', ORG_INN),
    ('КПП', '781201001'),
    ('ОГРН', ORG_OGRN),
    ('Юридический адрес', '190000, г. Санкт-Петербург, Учебная ул., д. 1, оф. 10 (вымышленный)'),
    ('Банк', 'АО «Учебный банк»'),
    ('БИК', '044030999 (вымышленный)'),
    ('Расчётный счёт', '40702810000000000001 (вымышленный)'),
    ('Корреспондентский счёт', '30101810000000000999 (вымышленный)'),
    ('Подписант', 'Коммерческий директор, Иванов И. И. (вымышленный)'),
    ('Телефон / e-mail', '+7 (000) 000-00-00 / kp@example.test'),
]
# наименование, ед., цена без НДС, вес единицы, т
PRICE = [
    ('Асфальтобетонная смесь тип Б марка II', 'т', 5400, 1.0),
    ('Щебёночно-мастичный асфальтобетон ЩМА-20', 'т', 7100, 1.0),
    ('Плита дорожная ПДН 6000×2000×140', 'шт', 38500, 4.2),
    ('Плита аэродромная ПАГ-14', 'шт', 31200, 2.6),
    ('Доставка самосвалом (рейс до 20 т)', 'рейс', 9500, 0.0),
    ('Аренда автокрана, час', 'ч', 4200, 0.0),
]
DELIVERY = PRICE[4][0]
TRUCK_T = 20
CLIENTS_BASE = [
    ('ООО «Дорстрой-Юг»', '781100234', 'Петров П. П.', 'г. Санкт-Петербург, Условная наб., д. 5'),
    ('АО «Тест-Магистраль»', '780500123', 'Сидорова А. А.', 'г. Санкт-Петербург, Тестовый пр., д. 7'),
    ('ООО «Пример-Инфра»', '784200987', 'Козлов К. К.', 'г. Всеволожск, Образцовая ул., д. 3'),
]
CLIENTS = []
for n, base, cont, adr in CLIENTS_BASE:
    inn = inn10_with_ctrl(base)
    assert inn10_ok(inn)
    CLIENTS.append((n, inn, cont, adr))

# вариант примера
SEL_CLIENT = 0
KP_NO = 'КП-2026/041'
KP_DATE = datetime.date(2026, 12, 1)
VALID_DAYS = 10
VAT = 0.22
LINES = [(PRICE[0][0], 120), (PRICE[1][0], 40), (PRICE[2][0], 25)]

# ── эталон (Python) ──────────────────────────────────────────────────────────
pr = {n: (u, c, w) for n, u, c, w in PRICE}
goods = sum(q * pr[n][1] for n, q in LINES)
weight = sum(q * pr[n][2] for n, q in LINES)
trips = math.ceil(weight / TRUCK_T)
deliv = trips * pr[DELIVERY][1]
base = goods + deliv
vat = round(base * VAT, 2)
total = round(base + vat, 2)
valid_to = KP_DATE + datetime.timedelta(days=VALID_DAYS)
print('weight', weight, 'trips', trips, 'goods', goods, 'deliv', deliv, 'base', base, 'vat', vat, 'total', total)

wb = Workbook()
ins = wb.active
ins.title = 'Инструкция'
instruction(ins, [
    ('Шаблон коммерческого предложения — курс «Бухгалтерия», модуль «Документы в один клик»', True),
    ('Все данные вымышлены: организация, клиенты, реквизиты, цены. Перед работой подставьте свои утверждённые данные.', False),
    ('1. «Карточка» — реквизиты организации, один раз. «Прайс» — утверждённые цены (без НДС): заменяйте только по приказу/решению об утверждении.', False),
    ('2. «Клиенты» — справочник покупателей. «Расчёт КП»: выберите клиента, дату, срок действия, ставку НДС, доставку и позиции (жёлтые ячейки).', False),
    ('3. Лист «Для слияния» — ОДНА строка с полями для Word (первая строка = имена полей). Таблицу листа не двигайте и не вставляйте пустых строк/столбцов.', False),
    ('4. Суммы-тексты в «Для слияния» сделаны функцией FIXED (в русской Excel — ФИКСИРОВАННЫЙ): так форматирование «5 400,00» не потеряется при слиянии.', False),
    ('5. Лист «Проверка» сравнивает расчёт Excel с эталоном, посчитанным отдельно. Должно быть «ОК» во всех строках для учебного примера.', False),
    ('6. Ставка НДС 22 % — для примера (с 01.01.2026 по ст. 164 НК РФ). Применимость к вашему клиенту, освобождение и льготные ставки сверяет бухгалтер.', False),
    ('7. Макросов в файле нет. Файл — .xlsx, ничего не отправляется в сеть.', False),
    ('8. Файл рассчитан на Excel 2007 и новее; проверен только расчётом в Python, в самом Excel не открывался.', False),
])

# Карточка
ws = wb.create_sheet('Карточка')
head(ws, 1, ['Поле', 'Значение'])
for i, (k, v) in enumerate(ORG, 2):
    ws.cell(i, 1, k).fill = GRY
    c = ws.cell(i, 2, v)
    c.number_format = '@'
    c.fill = YEL
    for j in (1, 2):
        ws.cell(i, j).border = BORDER
        ws.cell(i, j).alignment = Alignment(wrap_text=True, vertical='top')
widths(ws, [28, 70])
CARD = {k: f'Карточка!$B${i}' for i, (k, _) in enumerate(ORG, 2)}

# Прайс
wp = wb.create_sheet('Прайс')
head(wp, 1, ['Наименование', 'Ед.', 'Цена без НДС, ₽', 'Вес единицы, т', 'Действует с', 'Основание (приказ)'])
for i, (n, u, c, w) in enumerate(PRICE, 2):
    wp.cell(i, 1, n); wp.cell(i, 2, u)
    wp.cell(i, 3, c).number_format = '#,##0.00'
    wp.cell(i, 4, w).number_format = '0.0'
    wp.cell(i, 5, datetime.date(2026, 11, 1)).number_format = 'DD.MM.YYYY'
    wp.cell(i, 6, 'Приказ № 77 от 30.10.2026 (вымышленный)')
    for j in range(1, 7):
        wp.cell(i, j).border = BORDER
        if j in (3, 4):
            wp.cell(i, j).fill = YEL
widths(wp, [46, 8, 18, 16, 14, 40])
wp['H1'] = 'Вместимость самосвала, т'
wp['H1'].font = Font(bold=True)
wp['H2'] = TRUCK_T
wp['H2'].fill = YEL
wp.column_dimensions['H'].width = 26
PR_LAST = 1 + len(PRICE)

# Клиенты
wc = wb.create_sheet('Клиенты')
head(wc, 1, ['Клиент', 'ИНН', 'Контактное лицо', 'Адрес'])
for i, row in enumerate(CLIENTS, 2):
    for j, v in enumerate(row, 1):
        c = wc.cell(i, j, v)
        c.border = BORDER
        if j == 2:
            c.number_format = '@'
widths(wc, [28, 14, 22, 48])
CL_LAST = 1 + len(CLIENTS)

# Расчёт КП
wr = wb.create_sheet('Расчёт КП')
labels = [('Номер КП', KP_NO), ('Клиент', CLIENTS[SEL_CLIENT][0]), ('Дата КП', KP_DATE), ('Срок действия, дн.', VALID_DAYS),
          ('Ставка НДС', VAT), ('Доставка (да/нет)', 'да'), ('Действует до', None)]
for i, (k, v) in enumerate(labels, 1):
    wr.cell(i, 1, k).font = Font(bold=True)
    c = wr.cell(i, 2, v)
    if i != 7:
        c.fill = YEL
wr['B3'].number_format = 'DD.MM.YYYY'
wr['B5'].number_format = '0%'
wr['B7'] = '=B3+B4'
wr['B7'].number_format = 'DD.MM.YYYY'
dv = DataValidation(type='list', formula1=f'=Клиенты!$A$2:$A${CL_LAST}', allow_blank=False)
wr.add_data_validation(dv); dv.add('B2')
dv2 = DataValidation(type='list', formula1='"да,нет"', allow_blank=False)
wr.add_data_validation(dv2); dv2.add('B6')
dv3 = DataValidation(type='list', formula1=f'=Прайс!$A$2:$A${PR_LAST}', allow_blank=True)
wr.add_data_validation(dv3)
head(wr, 9, ['№', 'Номенклатура (выбрать из списка)', 'Ед.', 'Количество', 'Цена без НДС', 'Сумма без НДС', 'Вес, т'])
L1, LN = 10, 17
for r in range(L1, LN + 1):
    k = r - L1
    wr.cell(r, 1, k + 1)
    b = wr.cell(r, 2, LINES[k][0] if k < len(LINES) else None); b.fill = YEL
    q = wr.cell(r, 4, LINES[k][1] if k < len(LINES) else None); q.fill = YEL
    dv3.add(f'B{r}')
    wr.cell(r, 3, f'=IF(B{r}="","",INDEX(Прайс!$B$2:$B${PR_LAST},MATCH(B{r},Прайс!$A$2:$A${PR_LAST},0)))')
    wr.cell(r, 5, f'=IF(B{r}="","",INDEX(Прайс!$C$2:$C${PR_LAST},MATCH(B{r},Прайс!$A$2:$A${PR_LAST},0)))').number_format = '#,##0.00'
    wr.cell(r, 6, f'=IF(B{r}="",0,ROUND(D{r}*E{r},2))').number_format = '#,##0.00'
    wr.cell(r, 7, f'=IF(B{r}="",0,D{r}*INDEX(Прайс!$D$2:$D${PR_LAST},MATCH(B{r},Прайс!$A$2:$A${PR_LAST},0)))').number_format = '0.0'
    for j in range(1, 8):
        wr.cell(r, j).border = BORDER
R = LN + 2  # 19
rows = [
    ('Итого товары, без НДС', f'=SUM(F{L1}:F{LN})'),
    ('Вес груза, т', f'=SUM(G{L1}:G{LN})'),
    ('Рейсов (вверх до целого)', f'=IF(B6="да",ROUNDUP(B{R+1}/Прайс!$H$2,0),0)'),
    ('Доставка, без НДС', f'=ROUND(B{R+2}*INDEX(Прайс!$C$2:$C${PR_LAST},MATCH("{DELIVERY}",Прайс!$A$2:$A${PR_LAST},0)),2)'),
    ('Итого без НДС', f'=B{R}+B{R+3}'),
    ('НДС', f'=ROUND(B{R+4}*B5,2)'),
    ('Итого с НДС', f'=B{R+4}+B{R+5}'),
]
for i, (k, f) in enumerate(rows):
    wr.cell(R + i, 1, k).font = Font(bold=True)
    c = wr.cell(R + i, 2, f)
    c.number_format = '#,##0.0' if i == 1 else ('0' if i == 2 else '#,##0.00')
    c.fill = GRY
    for j in (1, 2):
        wr.cell(R + i, j).border = BORDER
wr['D19'] = 'Доставка считается по весу из «Прайса»: рейсы = ROUNDUP(вес / вместимость, 0). Неполный рейс оплачивается как целый.'
widths(wr, [26, 46, 8, 14, 16, 18, 10])
# адреса итогов
T_GOODS, T_W, T_TRIPS, T_DELIV, T_BASE, T_VAT, T_TOTAL = (f"'Расчёт КП'!$B${R+i}" for i in range(7))

# Для слияния
wm = wb.create_sheet('Для слияния')
fields = [
    ('Номер', "='Расчёт КП'!$B$1", None),
    ('Дата', "='Расчёт КП'!$B$3", 'DD.MM.YYYY'),
    ('ДействуетДо', "='Расчёт КП'!$B$7", 'DD.MM.YYYY'),
    ('Клиент', "='Расчёт КП'!$B$2", None),
    ('КлиентИНН', f"=INDEX(Клиенты!$B$2:$B${CL_LAST},MATCH('Расчёт КП'!$B$2,Клиенты!$A$2:$A${CL_LAST},0))", '@'),
    ('Контакт', f"=INDEX(Клиенты!$C$2:$C${CL_LAST},MATCH('Расчёт КП'!$B$2,Клиенты!$A$2:$A${CL_LAST},0))", None),
    ('Организация', f"={CARD['Краткое наименование']}", None),
    ('ОрганизацияИНН', f"={CARD['ИНН']}", '@'),
    ('Подписант', f"={CARD['Подписант']}", None),
]
for k in range(1, 6):
    r = L1 + k - 1
    fields += [
        (f'Поз{k}Название', f"='Расчёт КП'!$B${r}&\"\"", None),
        (f'Поз{k}Кол', f"=IF('Расчёт КП'!$D${r}=\"\",\"\",FIXED('Расчёт КП'!$D${r},0,FALSE))", None),
        (f'Поз{k}Цена', f"=IF('Расчёт КП'!$B${r}=\"\",\"\",FIXED('Расчёт КП'!$E${r},2,FALSE))", None),
        (f'Поз{k}Сумма', f"=IF('Расчёт КП'!$B${r}=\"\",\"\",FIXED('Расчёт КП'!$F${r},2,FALSE))", None),
    ]
fields += [
    ('Доставка', f"=FIXED({T_DELIV},2,FALSE)", None),
    ('ИтогоБезНДС', f"=FIXED({T_BASE},2,FALSE)", None),
    ('НДС', f"=FIXED({T_VAT},2,FALSE)", None),
    ('ИтогоСНДС', f"=FIXED({T_TOTAL},2,FALSE)", None),
]
head(wm, 1, [f[0] for f in fields])
for j, (_, f, nf) in enumerate(fields, 1):
    c = wm.cell(2, j, f)
    if nf:
        c.number_format = nf
    wm.column_dimensions[c.column_letter].width = 18
wm['A4'] = 'Первая строка — имена полей слияния (без пробелов). Вторая — единственная запись. Ничего не вставляйте выше и левее.'

# Проверка
wk = wb.create_sheet('Проверка')
head(wk, 1, ['Показатель', 'Эталон (Python)', 'Excel (формула)', 'Результат'])
checks = [
    ('Итого товары, без НДС', goods, f'={T_GOODS}'),
    ('Вес груза, т', round(weight, 1), f'={T_W}'),
    ('Рейсов', trips, f'={T_TRIPS}'),
    ('Доставка, без НДС', deliv, f'={T_DELIV}'),
    ('Итого без НДС', base, f'={T_BASE}'),
    ('НДС 22 %', vat, f'={T_VAT}'),
    ('Итого с НДС', total, f'={T_TOTAL}'),
    ('Действует до (серийный номер даты)', (valid_to - datetime.date(1899, 12, 30)).days, "='Расчёт КП'!$B$7"),
]
for i, (n, e, f) in enumerate(checks, 2):
    wk.cell(i, 1, n)
    wk.cell(i, 2, e)
    wk.cell(i, 3, f)
    wk.cell(i, 4, f'=IF(ABS(B{i}-C{i})<0.005,"ОК","ОШИБКА")')
    for j in range(1, 5):
        wk.cell(i, j).border = BORDER
    wk.cell(i, 2).number_format = '#,##0.00'
    wk.cell(i, 3).number_format = '#,##0.00'
n = len(checks) + 2
wk.cell(n + 1, 1, 'ИНН организации: контрольная цифра верна (эталон — Python)')
wk.cell(n + 1, 2, 'да')
wk.cell(n + 2, 1, 'ИНН клиентов: контрольные цифры верны (эталон — Python)')
wk.cell(n + 2, 2, 'да')
wk.cell(n + 4, 1, 'Данные листа «Расчёт КП» изменены → эталон устарел: проверка корректна только для учебного примера.')
widths(wk, [60, 20, 20, 12])

wb.save(OUT)
print('saved', OUT, 'ИНН орг', ORG_INN, 'ОГРН', ORG_OGRN, [c[1] for c in CLIENTS])
