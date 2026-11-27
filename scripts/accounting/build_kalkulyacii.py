"""Калькуляции производства: асфальт, бетон, плиты, знаки и стойки, транспорт (модуль EXP24 курса «Бухгалтерия»).

Вывод: public/courses/accounting/kalkulyacii-proizvodstva.xlsx
Все рецептуры, цены, тарифы и объёмы — УЧЕБНЫЕ и вымышленные. Это не нормативные
рецептуры и не рыночные цены: замените своими утверждёнными данными.

Формулы — только функции, которые есть в Excel 2007 и новее (СУММЕСЛИМН, СЧЁТЕСЛИМН,
ВПР, ИНДЕКС/ПОИСКПОЗ, СУММПРОИЗВ, ЕСЛИОШИБКА, ОКРВВЕРХ, ОКРУГЛ) и одно имя CalcDate.
Сменили цену на листе «Цены» — пересчитываются все калькуляции (книга пересчитывается
при открытии). Эталоны листа «Проверка» считаются здесь же, в Python, независимо
от формул Excel.
Запуск: <venv>/bin/python scripts/accounting/build_kalkulyacii.py
Программная проверка формул: KALK_NO_NAMES=<путь>.xlsx — копия без именованных диапазонов
(CalcDate, PriceTab подставлены адресами, NA() → 1/0, листы без пробелов) для пересчёта
в Apple Numbers, который не понимает имена; эталоны листа «Проверка» должны дать «ОК».
"""
import datetime as dt
import math
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import PatternFill

sys.path.insert(0, str(Path(__file__).parent))
from _xlhelp import head, widths, instruction, YEL, BORDER, HEAD, HF  # noqa: E402

OUT = 'public/courses/accounting/kalkulyacii-proizvodstva.xlsx'
D = dt.date
CALC_DATE = D(2026, 11, 1)
RED = PatternFill('solid', fgColor='F8D7DA')
GRN = PatternFill('solid', fgColor='D4EDDA')

# ─── Справочник цен и тарифов (учебный) ─────────────────────────────────────
# (код, наименование, ед. цены, поставщик, действует с, цена без НДС, ставка входящего НДС, утверждена)
PRICES = [
    ('A-MIN', 'Минеральная часть асфальтобетона (учебно)', 'кг', 'Поставщик 1', D(2026, 1, 1), 1.6, 0.22, 'да'),
    ('A-BIT', 'Вяжущее (учебно)', 'кг', 'Поставщик 2', D(2026, 1, 1), 38, 0.22, 'да'),
    ('A-BIT', 'Вяжущее (учебно)', 'кг', 'Поставщик 2', D(2026, 10, 1), 40, 0.22, 'да'),
    ('A-BIT', 'Вяжущее (учебно)', 'кг', 'Поставщик 2', D(2026, 12, 1), 43, 0.22, 'нет'),   # проект, не утверждена
    ('C-CEM', 'Цемент (учебно)', 'кг', 'Поставщик 3', D(2026, 3, 1), 7.2, 0.22, 'да'),
    ('C-CEM', 'Цемент (учебно)', 'кг', 'Поставщик 3', D(2026, 9, 1), 7.5, 0.22, 'да'),
    ('C-SND', 'Песок (учебно)', 'т', 'Поставщик 4', D(2026, 1, 1), 900, 0.22, 'да'),
    ('C-GRV', 'Щебень для бетона (учебно)', 'т', 'Поставщик 4', D(2026, 1, 1), 1200, 0.22, 'да'),
    ('C-WAT', 'Вода техническая (поставщик без НДС, учебно)', 'м3', 'Поставщик 5', D(2026, 1, 1), 50, 0, 'да'),
    ('C-ADD', 'Добавка-пластификатор (учебно)', 'кг', 'Поставщик 6', D(2026, 1, 1), 120, 0.22, 'да'),
    ('R-STL', 'Арматура (учебно)', 'кг', 'Поставщик 7', D(2026, 1, 1), 75, 0.22, 'да'),
    ('E-KWH', 'Электроэнергия (тариф учебный)', 'кВт·ч', 'Сбыт', D(2026, 1, 1), 7.4, 0.22, 'да'),
    ('E-KWH', 'Электроэнергия (тариф учебный)', 'кВт·ч', 'Сбыт', D(2026, 7, 1), 8, 0.22, 'да'),
    ('G-M3', 'Газ (тариф учебный)', 'м3', 'Газ', D(2026, 1, 1), 9, 0.22, 'да'),
    ('F-DSL', 'Дизельное топливо (учебно)', 'л', 'АЗС', D(2026, 1, 1), 65, 0.22, 'да'),
    ('L-HR', 'Труд рабочих с взносами (ставка учебная)', 'чел-ч', 'Штат', D(2026, 1, 1), 650, 0, 'да'),
    ('S-SHT', 'Лист оцинкованный (учебно)', 'м2', 'Поставщик 8', D(2026, 1, 1), 1250, 0.22, 'да'),
    ('S-FLM', 'Плёнка световозвращающая (учебно)', 'м2', 'Поставщик 8', D(2026, 1, 1), 1100, 0.22, 'да'),
    ('S-BRK', 'Кронштейн (учебно)', 'шт', 'Поставщик 8', D(2026, 1, 1), 95, 0.22, 'да'),
    ('S-FST', 'Крепёж, комплект (учебно)', 'компл', 'Поставщик 8', D(2026, 1, 1), 60, 0.22, 'да'),
    ('S-PIP', 'Труба для стойки (учебно)', 'м', 'Поставщик 9', D(2026, 1, 1), 520, 0.22, 'да'),
    ('S-CAP', 'Заглушка стойки (учебно)', 'шт', 'Поставщик 9', D(2026, 1, 1), 70, 0.22, 'да'),
    ('S-PNT', 'Покраска стойки (учебно)', 'м2', 'Поставщик 9', D(2026, 1, 1), 90, 0.22, 'да'),
    ('S-CLP', 'Хомут крепления знака (учебно)', 'шт', 'Поставщик 8', D(2026, 1, 1), 85, 0.22, 'да'),
    ('S-PRF', 'Профиль секции (учебно)', 'м', 'Поставщик 9', D(2026, 1, 1), 380, 0.22, 'да'),
]
CODES = []
for r in PRICES:
    if r[0] not in CODES:
        CODES.append(r[0])

# ─── Рецептуры и спецификации (учебные, замените своими) ────────────────────
# (продукт, версия, действует с, утверждена, ресурс, группа, норма, ед. нормы, потери)
RECIPES = [
    ('ASF-1', 'v1', D(2025, 1, 1), 'да', 'A-MIN', 'Сырьё', 945, 'кг', 0),
    ('ASF-1', 'v1', D(2025, 1, 1), 'да', 'A-BIT', 'Сырьё', 55, 'кг', 0),
    ('ASF-1', 'v1', D(2025, 1, 1), 'да', 'E-KWH', 'Энергия', 11, 'кВт·ч', 0),
    ('ASF-1', 'v1', D(2025, 1, 1), 'да', 'G-M3', 'Энергия', 8.5, 'м3', 0),
    ('ASF-1', 'v2', D(2026, 6, 1), 'да', 'A-MIN', 'Сырьё', 950, 'кг', 0),
    ('ASF-1', 'v2', D(2026, 6, 1), 'да', 'A-BIT', 'Сырьё', 50, 'кг', 0),
    ('ASF-1', 'v2', D(2026, 6, 1), 'да', 'E-KWH', 'Энергия', 10, 'кВт·ч', 0),
    ('ASF-1', 'v2', D(2026, 6, 1), 'да', 'G-M3', 'Энергия', 8, 'м3', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'C-CEM', 'Сырьё', 350, 'кг', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'C-SND', 'Сырьё', 750, 'кг', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'C-GRV', 'Сырьё', 1050, 'кг', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'C-WAT', 'Сырьё', 180, 'л', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'C-ADD', 'Сырьё', 3.5, 'кг', 0),
    ('CON-1', 'v1', D(2026, 1, 1), 'да', 'E-KWH', 'Энергия', 4, 'кВт·ч', 0),
    ('PLT-1', 'v1', D(2026, 1, 1), 'да', 'CON-1', 'Полуфабрикат', 0.81, 'м3', 0.015),
    ('PLT-1', 'v1', D(2026, 1, 1), 'да', 'R-STL', 'Сырьё', 45, 'кг', 0),
    ('PLT-1', 'v1', D(2026, 1, 1), 'да', 'L-HR', 'Труд', 1.2, 'чел-ч', 0),
    ('PLT-1', 'v1', D(2026, 1, 1), 'да', 'E-KWH', 'Энергия', 25, 'кВт·ч', 0),
    ('SGN-1', 'v1', D(2026, 1, 1), 'да', 'S-SHT', 'Сырьё', 0.35, 'м2', 0),
    ('SGN-1', 'v1', D(2026, 1, 1), 'да', 'S-FLM', 'Сырьё', 0.35, 'м2', 0.10),
    ('SGN-1', 'v1', D(2026, 1, 1), 'да', 'S-BRK', 'Сырьё', 2, 'шт', 0),
    ('SGN-1', 'v1', D(2026, 1, 1), 'да', 'S-FST', 'Сырьё', 1, 'компл', 0),
    ('SGN-1', 'v1', D(2026, 1, 1), 'да', 'L-HR', 'Труд', 0.8, 'чел-ч', 0),
    ('PST-1', 'v1', D(2026, 1, 1), 'да', 'S-PIP', 'Сырьё', 3.5, 'м', 0),
    ('PST-1', 'v1', D(2026, 1, 1), 'да', 'S-CAP', 'Сырьё', 1, 'шт', 0),
    ('PST-1', 'v1', D(2026, 1, 1), 'да', 'S-PNT', 'Сырьё', 0.6, 'м2', 0),
    ('PST-1', 'v1', D(2026, 1, 1), 'да', 'L-HR', 'Труд', 0.5, 'чел-ч', 0),
    ('SEC-1', 'v1', D(2026, 1, 1), 'да', 'S-PRF', 'Сырьё', 2, 'м', 0),
    ('SEC-1', 'v1', D(2026, 1, 1), 'да', 'S-SHT', 'Сырьё', 1, 'м2', 0),
    ('SEC-1', 'v1', D(2026, 1, 1), 'да', 'S-FLM', 'Сырьё', 1, 'м2', 0.10),
    ('SEC-1', 'v1', D(2026, 1, 1), 'да', 'S-FST', 'Сырьё', 2, 'компл', 0),
    ('SEC-1', 'v1', D(2026, 1, 1), 'да', 'L-HR', 'Труд', 1.5, 'чел-ч', 0),
]
UNITS = [('кг>т', 0.001), ('т>кг', 1000), ('л>м3', 0.001), ('г>кг', 0.001), ('м3>л', 1000)]

# Параметры листов
ASF = dict(out=2000, normal=2000, other=150, fixed=600000)
CON = dict(out=1500, normal=1800, other=100, fixed=450000)
PLT = dict(l=3, w=1.5, h=0.18, out=600, normal=700, fixed=360000)
SGN_VOL = {'SGN-1': 400, 'PST-1': 400, 'SEC-1': 120}
SGN_OVH = 240000
KITS = [('KIT-1', 'Знак на стойке', [('SGN-1', 1), ('PST-1', 1), ('S-CLP', 2)]),
        ('KIT-2', 'Большой знак из 3 секций', [('SEC-1', 3), ('PST-1', 2), ('S-CLP', 4)])]
TR = dict(norm=38, tyres=6, cost=3600000, months=60, fixed=40000, hours=176, km_month=6000,
          trip_km=25, trip_h=1.5, load_t=20)
SC_VOLS = [0, 500, 1000, 1500, 2000, 2500]
SC_IDX = [0.9, 1.0, 1.1, 1.2]
MARKUP = 0.20
MARGIN = 0.20
ROUND_TO = 10
VAT_OUT = 0.22
APPROVED = dict(num='АБ-2026-08', date=D(2026, 8, 1), raw=3420, energy=152, other=150, fixed=600000, base=2000,
                norm_min=950, norm_bit=50, p_min=1.6, p_bit=38, kwh=10, p_kwh=8, gas=8, p_gas=9)
FACT = dict(out=1800, min_kg=1728000, p_min=1.6, bit_kg=92700, p_bit=41, kwh=19000, p_kwh=8,
            gas=14800, p_gas=9, other=279000, fixed=612000)


# ─── Эталоны: независимый расчёт в Python ───────────────────────────────────
def price_on(code, date, approved_only=True):
    rows = [r for r in PRICES if r[0] == code and r[4] <= date and (r[7] == 'да' or not approved_only)]
    if not rows:
        return None
    best = max(rows, key=lambda r: r[4])
    return best


def active_recipe(prod, date):
    rows = [r for r in RECIPES if r[0] == prod and r[3] == 'да' and r[2] <= date]
    last = max(r[2] for r in rows)
    return [r for r in rows if r[2] == last]


def unit_k(nu, pu):
    return 1 if nu == pu else dict(UNITS)[f'{nu}>{pu}']


E = {}


def recipe_cost(prod, vat_cost=False, con_var=None, con_var_vat=None):
    out = {}
    for r in active_recipe(prod, CALC_DATE):
        code, grp, norm, nu, loss = r[4], r[5], r[6], r[7], r[8]
        p = price_on(code, CALC_DATE)
        if code == 'CON-1':
            unit_price = con_var_vat if vat_cost else con_var
            pu = 'м3'
        else:
            unit_price = p[5] * ((1 + p[6]) if vat_cost else 1)
            pu = p[2]
        out[grp] = out.get(grp, 0) + norm * (1 + loss) * unit_k(nu, pu) * unit_price
    return out


a = recipe_cost('ASF-1')
av = recipe_cost('ASF-1', True)
E['asf_raw'] = a['Сырьё']
E['asf_energy'] = a['Энергия']
E['asf_var'] = a['Сырьё'] + a['Энергия'] + ASF['other']
E['asf_fix_t'] = ASF['fixed'] / ASF['out']
E['asf_full'] = E['asf_var'] + E['asf_fix_t']
E['asf_full_vat'] = av['Сырьё'] + av['Энергия'] + ASF['other'] + E['asf_fix_t']
E['asf_mass'] = sum(r[6] for r in active_recipe('ASF-1', CALC_DATE) if r[7] == 'кг')
E['asf_1000'] = E['asf_var'] + ASF['fixed'] / 1000

c = recipe_cost('CON-1')
cv = recipe_cost('CON-1', True)
E['con_var'] = c['Сырьё'] + c['Энергия'] + CON['other']
E['con_var_vat'] = cv['Сырьё'] + cv['Энергия'] + CON['other']
E['con_full'] = E['con_var'] + CON['fixed'] / CON['out']
E['con_mass'] = sum(r[6] for r in active_recipe('CON-1', CALC_DATE) if r[7] in ('кг', 'л'))

pl = recipe_cost('PLT-1', con_var=E['con_var'])
E['plt_volume'] = PLT['l'] * PLT['w'] * PLT['h']
E['plt_var'] = sum(pl.values())
E['plt_full'] = E['plt_var'] + PLT['fixed'] / PLT['out']

hours = {p: sum(r[6] for r in active_recipe(p, CALC_DATE) if r[5] == 'Труд') for p in SGN_VOL}
tot_h = sum(hours[p] * SGN_VOL[p] for p in SGN_VOL)
rate = SGN_OVH / tot_h
E['sgn_rate'] = rate
sg = {}
for p in SGN_VOL:
    rc = recipe_cost(p)
    sg[p] = sum(rc.values()) + hours[p] * rate
    E[f'{p}_direct'] = sum(rc.values())
    E[f'{p}_full'] = sg[p]
E['sgn_alloc_total'] = sum(hours[p] * rate * SGN_VOL[p] for p in SGN_VOL)
for k, name, comps in KITS:
    E[k] = sum(q * (sg[c] if c in sg else price_on(c, CALC_DATE)[5]) for c, q in comps)

fuel = price_on('F-DSL', CALC_DATE)[5]
lab = price_on('L-HR', CALC_DATE)[5]
E['tr_km'] = TR['norm'] / 100 * fuel + TR['tyres']
E['tr_amort'] = TR['cost'] / TR['months']
E['tr_driver'] = lab * TR['hours']
E['tr_hour'] = (E['tr_amort'] + TR['fixed'] + E['tr_driver']) / TR['hours']
E['tr_trip'] = 2 * TR['trip_km'] * E['tr_km'] + TR['trip_h'] * E['tr_hour']
E['tr_tkm'] = E['tr_trip'] / (TR['load_t'] * TR['trip_km'])
E['tr_month'] = TR['km_month'] * E['tr_km'] + E['tr_amort'] + TR['fixed'] + E['tr_driver']
E['tr_full_km'] = E['tr_month'] / TR['km_month']

E['sc_1000_idx11'] = E['asf_raw'] * 1.1 + E['asf_energy'] + ASF['other'] + ASF['fixed'] / 1000
E['pr_markup'] = E['asf_full'] * (1 + MARKUP)
E['pr_margin'] = E['asf_full'] / (1 - MARGIN)
E['pr_round'] = math.ceil(round(E['pr_margin'], 6) / ROUND_TO) * ROUND_TO
E['pr_vat'] = round(E['pr_round'] * VAT_OUT, 2)
E['pr_gross'] = E['pr_round'] + E['pr_vat']
E['markup_margin'] = (E['pr_markup'] - E['asf_full']) / E['pr_markup']

ap = APPROVED
E['ap_full'] = ap['raw'] + ap['energy'] + ap['other'] + ap['fixed'] / ap['base']
f = FACT
fact_total = (f['min_kg'] * f['p_min'] + f['bit_kg'] * f['p_bit'] + f['kwh'] * f['p_kwh'] + f['gas'] * f['p_gas']
              + f['other'] + f['fixed'])
plan_on_fact = (ap['raw'] + ap['energy'] + ap['other']) * f['out'] + ap['fixed']
E['pf_fact_total'] = fact_total
E['pf_plan_total'] = plan_on_fact
E['pf_dev'] = fact_total - plan_on_fact
E['pf_bit_qty'] = (f['bit_kg'] - ap['norm_bit'] * f['out']) * ap['p_bit']
E['pf_bit_price'] = (f['p_bit'] - ap['p_bit']) * f['bit_kg']
E['pf_fact_t'] = fact_total / f['out']

assert abs(E['asf_full'] - 4122) < 1e-9 and abs(E['asf_1000'] - 4422) < 1e-9 and E['asf_mass'] == 1000
assert abs(E['asf_raw'] - 3520) < 1e-9
assert abs(E['pf_dev'] - 442100) < 1e-6
assert abs(E['ap_full'] - 4022) < 1e-9

# ─── Книга ──────────────────────────────────────────────────────────────────
wb = Workbook()
ins = wb.active
ins.title = 'Инструкция'
instruction(ins, [
    ('Калькуляции производства — курс «Бухгалтерия», модуль «Производственные калькуляции, стройка и транспорт»', True),
    ('ВСЕ ДАННЫЕ УЧЕБНЫЕ И ВЫМЫШЛЕННЫЕ. Учебная рецептура, замените своей. Это не нормативные рецептуры (не ГОСТ) и не рыночные цены.', True),
    ('1. Лист «Цены»: одна строка — одна цена с датой начала действия. Новую цену ДОБАВЛЯЙТЕ строкой, старую не стирайте.', False),
    ('   В B1 — дата расчёта (имя CalcDate). Действует последняя УТВЕРЖДЁННАЯ («да») цена с датой не позже даты расчёта.', False),
    ('2. Блок «Цены на дату» (K:Q) считает формулы. Статус «НЕТ ЦЕНЫ» или «ДУБЛЬ» — исправьте справочник, нулём не заменяйте.', False),
    ('3. Лист «Рецептуры»: нормы на 1 единицу продукта (т, м3, шт). Версия действует с даты; новая версия — новые строки.', False),
    ('   Потери — доля к норме (0,10 = 10 %). Единица нормы и единица цены сводятся через таблицу «Единицы» (S:T).', False),
    ('4. Листы «Асфальт», «Бетон», «Плиты», «Знаки и стойки», «Транспорт» берут нормы и цены сами. Жёлтые ячейки — ввод.', False),
    ('   Столбец B — себестоимость без возмещаемого НДС (НДС принимается к вычету). Столбец C — если входной НДС не к вычету', False),
    ('   (например, УСН без НДС или ставка НДС 5 %/7 % на УСН) — проверьте свой режим с главным бухгалтером.', False),
    ('5. «Сценарии» — себестоимость при разных объёмах и ценах сырья; цена продажи: наценка против маржи, округление, НДС.', False),
    ('6. «План-факт» — утверждённая калькуляция записана ЗНАЧЕНИЯМИ (не формулами): новая цена не переписывает утверждённый план.', False),
    ('7. «Печатная форма» — калькуляция для подписи; область печати задана. «Проверка» — эталоны из Python и контроли.', False),
    ('Попробуйте: на «Цены» в F строки вяжущего от 01.10.2026 поставьте 42 — изменятся Асфальт, Сценарии, Печатная форма,', False),
    ('   а «Проверка» покажет расхождение с эталоном (эталон посчитан для исходных данных). Верните 40.', False),
    ('Формулы на функциях Excel 2007 и новее. В Microsoft Excel файл не открывался: эталоны посчитаны в Python, формулы пересчитаны в Apple Numbers (копия без имён).', False),
    ('Не вносите реальные цены поставщиков и данные организации, если отправляете файл преподавателю или в ИИ.', False),
])

# Цены
pr = wb.create_sheet('Цены')
pr['A1'] = 'Дата расчёта'
pr['A1'].font = Font(bold=True)
pr['B1'] = CALC_DATE
pr['B1'].number_format = 'dd.mm.yyyy'
pr['B1'].fill = YEL
pr['C1'] = '← меняйте дату: калькуляции возьмут цены и версии рецептур, действующие на неё'
wb.defined_names['CalcDate'] = DefinedName('CalcDate', attr_text="'Цены'!$B$1")
head(pr, 3, ['Код', 'Наименование', 'Ед. цены', 'Поставщик', 'Действует с', 'Цена без НДС', 'Ставка вход. НДС',
             'Утверждена', 'Действует на дату (1/0)'])
P0, P1 = 4, 80
for i, r in enumerate(PRICES):
    row = P0 + i
    for c, v in enumerate(r, 1):
        cell = pr.cell(row, c, v)
        cell.border = BORDER
    pr.cell(row, 5).number_format = 'dd.mm.yyyy'
    pr.cell(row, 7).number_format = '0%'
    for c in (5, 6, 7, 8):
        pr.cell(row, c).fill = YEL
    # Действует, если утверждена, началась не позже даты расчёта и нет более поздней утверждённой
    # строки того же кода до даты расчёта. СУММПРОИЗВ вместо СЧЁТЕСЛИМН с датой в условии.
    pr.cell(row, 9, f'=IF(AND(H{row}="да",E{row}<=CalcDate,F{row}>0),'
                    f'IF(SUMPRODUCT(($A${P0}:$A${P1}=A{row})*($H${P0}:$H${P1}="да")*($E${P0}:$E${P1}>E{row})'
                    f'*($E${P0}:$E${P1}<=CalcDate))=0,1,0),0)').border = BORDER
dv = DataValidation(type='list', formula1='"да,нет"', allow_blank=True)
pr.add_data_validation(dv)
dv.add(f'H{P0}:H{P1}')
pr['K2'] = 'Цены на дату (считается само)'
pr['K2'].font = Font(bold=True)
for c, t in enumerate(['Код', 'Наименование', 'Ед.', 'Цена на дату', 'Действующих строк', 'НДС вход.', 'Статус'], 11):
    x = pr.cell(3, c, t)
    x.fill, x.font, x.border = HEAD, HF, BORDER
T0 = 4
for i, code in enumerate(CODES):
    row = T0 + i
    pr.cell(row, 11, code)
    pr.cell(row, 12, f'=VLOOKUP(K{row},$A${P0}:$C${P1},2,FALSE)')
    pr.cell(row, 13, f'=VLOOKUP(K{row},$A${P0}:$C${P1},3,FALSE)')
    pr.cell(row, 14, f'=IF(O{row}=1,SUMIFS($F${P0}:$F${P1},$A${P0}:$A${P1},K{row},$I${P0}:$I${P1},1),NA())')
    pr.cell(row, 15, f'=COUNTIFS($A${P0}:$A${P1},K{row},$I${P0}:$I${P1},1)')
    pr.cell(row, 16, f'=SUMIFS($G${P0}:$G${P1},$A${P0}:$A${P1},K{row},$I${P0}:$I${P1},1)')
    pr.cell(row, 17, f'=IF(O{row}=1,"ок",IF(O{row}=0,"НЕТ ЦЕНЫ на дату","ДУБЛЬ: проверьте даты"))')
    pr.cell(row, 16).number_format = '0%'
    for c in range(11, 18):
        pr.cell(row, c).border = BORDER
T1 = T0 + len(CODES) - 1
PT = f"'Цены'!$K${T0}:$Q${T1 + 10}"   # запас строк под новые коды
wb.defined_names['PriceTab'] = DefinedName('PriceTab', attr_text=PT)
pr.conditional_formatting.add(f'Q{T0}:Q{T1 + 10}', FormulaRule(formula=[f'LEFT(Q{T0},2)<>"ок"'], fill=RED))
widths(pr, [9, 46, 8, 13, 12, 12, 10, 11, 12, 2, 9, 46, 7, 12, 11, 9, 22])
pr.freeze_panes = 'A4'

# Рецептуры
rc = wb.create_sheet('Рецептуры')
rc['A1'] = 'Учебная рецептура, замените своей. Нормы не нормативные (не ГОСТ), придуманы для упражнения.'
rc['A1'].font = Font(bold=True, color='C00000')
head(rc, 3, ['Продукт', 'Версия', 'Действует с', 'Утверждена', 'Код ресурса', 'Группа', 'Норма на ед.', 'Ед. нормы',
             'Потери, доля', 'Норма с потерями', 'Наименование', 'Ед. цены', 'Коэф. единиц', 'Цена на дату',
             'Сумма (НДС к вычету)', 'Активна (1/0)', 'Сумма (НДС не к вычету)', 'Ключ версии'])
R0, R1 = 4, 80
for i, r in enumerate(RECIPES):
    row = R0 + i
    for c, v in enumerate(r, 1):
        rc.cell(row, c, v).border = BORDER
        if c in (3, 4, 7, 9):
            rc.cell(row, c).fill = YEL
    rc.cell(row, 3).number_format = 'dd.mm.yyyy'
    rc.cell(row, 9).number_format = '0.0%'
    rc.cell(row, 10, f'=G{row}*(1+I{row})').number_format = '0.000'
    # Полуфабрикат своего производства (бетон в плитах) цену берёт с листа своего продукта,
    # а не из «Цен»: иначе получится циклическая ссылка (бетон суммирует этот же столбец).
    rc.cell(row, 11, f'=IF(F{row}="Полуфабрикат","Свой полуфабрикат: цена на листе продукта",IFERROR(VLOOKUP(E{row},PriceTab,2,FALSE),"НЕТ В СПРАВОЧНИКЕ"))')
    rc.cell(row, 12, f'=IF(F{row}="Полуфабрикат",H{row},IFERROR(VLOOKUP(E{row},PriceTab,3,FALSE),"?"))')
    rc.cell(row, 13, f'=IF(H{row}=L{row},1,IFERROR(VLOOKUP(H{row}&">"&L{row},$S$4:$T$12,2,FALSE),NA()))')
    rc.cell(row, 14, f'=IF(F{row}="Полуфабрикат",0,VLOOKUP(E{row},PriceTab,4,FALSE))')
    rc.cell(row, 15, f'=J{row}*M{row}*N{row}')
    rc.cell(row, 16, f'=IF(AND(D{row}="да",C{row}<=CalcDate),IF(SUMPRODUCT(($A${R0}:$A${R1}=A{row})*($D${R0}:$D${R1}="да")'
                     f'*($C${R0}:$C${R1}>C{row})*($C${R0}:$C${R1}<=CalcDate))=0,1,0),0)')
    rc.cell(row, 17, f'=IF(F{row}="Полуфабрикат",0,O{row}*(1+VLOOKUP(E{row},PriceTab,6,FALSE)))')
    rc.cell(row, 18, f'=IF(P{row}=1,A{row}&"|акт","")')
    for c in range(10, 19):
        rc.cell(row, c).border = BORDER
    for c in (14, 15, 17):
        rc.cell(row, c).number_format = '#,##0.00'
rc['S3'], rc['T3'] = 'Единицы: из>в', 'Коэф.'
rc['S3'].font = rc['T3'].font = Font(bold=True)
for i, (k, v) in enumerate(UNITS):
    rc.cell(4 + i, 19, k)
    rc.cell(4 + i, 20, v)
widths(rc, [9, 7, 12, 10, 10, 13, 11, 9, 10, 11, 40, 8, 9, 11, 13, 9, 14, 12, 12, 8])
rc.freeze_panes = 'A4'


def sumg(prod_cell, grp, col='O'):
    return (f'SUMIFS(Рецептуры!${col}${R0}:${col}${R1},Рецептуры!$A${R0}:$A${R1},{prod_cell},'
            f'Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$F${R0}:$F${R1},"{grp}")')


def calc_sheet(name, prod, unit, params, extra_rows):
    """Лист калькуляции на единицу продукта; строки 11–19 — стандартные."""
    ws = wb.create_sheet(name)
    ws['A1'] = f'Калькуляция: {name.lower()} — на 1 {unit} (учебные данные)'
    ws['A1'].font = Font(bold=True, size=13)
    ws['A2'] = 'Версия рецептуры:'
    ws['B2'] = f'=IFERROR(INDEX(Рецептуры!$B${R0}:$B${R1},MATCH($B$3&"|акт",Рецептуры!$R${R0}:$R${R1},0)),"НЕТ АКТИВНОЙ ВЕРСИИ")'
    ws['A3'], ws['B3'] = 'Продукт (код)', prod
    for i, (label, val) in enumerate(params, 4):
        ws.cell(i, 1, label)
        x = ws.cell(i, 2, val)
        x.fill = YEL
    head(ws, 10, ['Статья', f'На 1 {unit}, НДС к вычету', f'На 1 {unit}, НДС не к вычету'])
    return ws


# Асфальт
asf = calc_sheet('Асфальт', 'ASF-1', 'т', [
    ('Выпуск за месяц, т', ASF['out']), ('Нормальная мощность, т/мес', ASF['normal']),
    ('Прочие переменные, руб/т', ASF['other']), ('Постоянные за месяц, руб', ASF['fixed'])], [])
rows = [
    ('Сырьё (по рецептуре)', '=' + sumg('$B$3', 'Сырьё'), '=' + sumg('$B$3', 'Сырьё', 'Q')),
    ('Энергия: электроэнергия и газ', '=' + sumg('$B$3', 'Энергия'), '=' + sumg('$B$3', 'Энергия', 'Q')),
    ('Прочие переменные', '=$B$6', '=$B$6'),
    ('Итого переменные', '=SUM(B11:B13)', '=SUM(C11:C13)'),
    ('Постоянные на 1 т (по факт. выпуску)', '=IF($B$4>0,$B$7/$B$4,NA())', '=B15'),
    ('ПОЛНАЯ СЕБЕСТОИМОСТЬ 1 т', '=B14+B15', '=C14+C15'),
    ('Постоянные на 1 т (по нормальной мощности)', '=IF($B$5>0,$B$7/$B$5,NA())', '=B17'),
    ('Себестоимость 1 т при нормальной мощности', '=B14+B17', '=C14+C17'),
    ('Недогрузка мощности за месяц, руб', '=IF($B$4<$B$5,($B$5-$B$4)*B17,0)', ''),
]
for i, (l, b, cc) in enumerate(rows, 11):
    asf.cell(i, 1, l)
    asf.cell(i, 2, b).number_format = '#,##0.00'
    asf.cell(i, 3, cc).number_format = '#,##0.00'
asf['A16'].font = asf['B16'].font = asf['C16'].font = Font(bold=True)
asf['A21'] = 'Сырьё через СУММПРОИЗВ (контроль)'
asf['B21'] = (f'=SUMPRODUCT((Рецептуры!$A${R0}:$A${R1}=$B$3)*(Рецептуры!$P${R0}:$P${R1}=1)'
              f'*(Рецептуры!$F${R0}:$F${R1}="Сырьё"),Рецептуры!$J${R0}:$J${R1},Рецептуры!$M${R0}:$M${R1},Рецептуры!$N${R0}:$N${R1})')
asf['A22'] = 'Масса рецептуры, кг на 1 т'
asf['B22'] = f'=SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$H${R0}:$H${R1},"кг")'
asf['C22'] = '=IF(ABS(B22-1000)<0.5,"ок: 1000 кг","СУММА РЕЦЕПТУРЫ НЕ 1000 кг")'
asf['A24'] = 'Пример формулы на русском: =СУММЕСЛИМН(Рецептуры!$O$4:$O$80;Рецептуры!$A$4:$A$80;$B$3;Рецептуры!$P$4:$P$80;1;Рецептуры!$F$4:$F$80;"Сырьё")'
widths(asf, [46, 20, 22])

# Бетон
con = calc_sheet('Бетон', 'CON-1', 'м3', [
    ('Выпуск за месяц, м3', CON['out']), ('Нормальная мощность, м3/мес', CON['normal']),
    ('Прочие переменные, руб/м3', CON['other']), ('Постоянные за месяц, руб', CON['fixed'])], [])
for i, (l, b, cc) in enumerate(rows, 11):
    con.cell(i, 1, l.replace(' т', ' м3').replace('1 т', '1 м3'))
    con.cell(i, 2, b).number_format = '#,##0.00'
    con.cell(i, 3, cc).number_format = '#,##0.00'
con['A11'] = 'Сырьё: цемент, песок, щебень, вода, добавка'
con['A12'] = 'Энергия'
con['A14'] = 'Итого переменные (внутренняя цена 1 м3 для плит)'
con['A16'] = 'ПОЛНАЯ СЕБЕСТОИМОСТЬ 1 м3'
con['A16'].font = con['B16'].font = con['C16'].font = Font(bold=True)
con['A22'] = 'Масса смеси, кг на 1 м3 (кг + л воды)'
con['B22'] = (f'=SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$H${R0}:$H${R1},"кг")'
              f'+SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$H${R0}:$H${R1},"л")')
con['C22'] = '=IF(AND(B22>=2200,B22<=2500),"ок: в учебном диапазоне 2200–2500","ПРОВЕРЬТЕ ЕДИНИЦЫ И РЕЦЕПТУРУ")'
con['A23'] = 'Доля добавки от массы цемента'
con['B23'] = (f'=SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$E${R0}:$E${R1},"C-ADD")'
              f'/SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$E${R0}:$E${R1},"C-CEM")')
con['B23'].number_format = '0.0%'
con['A24'] = 'Диапазон 2200–2500 кг/м3 — учебная проверка на грубую ошибку единиц, не норматив плотности.'
widths(con, [50, 20, 22])

# Плиты
plt = wb.create_sheet('Плиты')
plt['A1'] = 'Калькуляция: плита бетонная (учебная) — на 1 шт'
plt['A1'].font = Font(bold=True, size=13)
plt['A2'], plt['B2'] = 'Версия спецификации:', f'=IFERROR(INDEX(Рецептуры!$B${R0}:$B${R1},MATCH($B$3&"|акт",Рецептуры!$R${R0}:$R${R1},0)),"НЕТ АКТИВНОЙ ВЕРСИИ")'
plt['A3'], plt['B3'] = 'Продукт (код)', 'PLT-1'
for i, (l, v) in enumerate([('Длина, м', PLT['l']), ('Ширина, м', PLT['w']), ('Толщина, м', PLT['h'])], 4):
    plt.cell(i, 1, l)
    plt.cell(i, 2, v).fill = YEL
plt['A7'], plt['B7'] = 'Объём плиты по размерам, м3', '=B4*B5*B6'
plt['A8'] = 'Норма бетона в спецификации, м3'
plt['B8'] = f'=SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},$B$3,Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$E${R0}:$E${R1},"CON-1")'
plt['C8'] = '=IF(ABS(B8-B7)<0.0005,"ок: норма = объём","НОРМА БЕТОНА НЕ РАВНА ОБЪЁМУ ПЛИТЫ")'
for i, (l, v) in enumerate([('Выпуск за месяц, шт', PLT['out']), ('Постоянные цеха за месяц, руб', PLT['fixed']),
                            ('Нормальная мощность, шт/мес', PLT['normal'])], 9):
    plt.cell(i, 1, l)
    plt.cell(i, 2, v).fill = YEL
head(plt, 13, ['Статья', 'На 1 шт, НДС к вычету', 'На 1 шт, НДС не к вычету'])
prow = [
    ('Бетон (с потерями 1,5 %) × цена 1 м3 с листа «Бетон»', '=' + sumg('$B$3', 'Полуфабрикат', 'J') + '*Бетон!$B$14',
     '=' + sumg('$B$3', 'Полуфабрикат', 'J') + '*Бетон!$C$14'),
    ('Арматура', '=' + sumg('$B$3', 'Сырьё'), '=' + sumg('$B$3', 'Сырьё', 'Q')),
    ('Труд рабочих (с взносами)', '=' + sumg('$B$3', 'Труд'), '=' + sumg('$B$3', 'Труд', 'Q')),
    ('Энергия (пропарка, учебно)', '=' + sumg('$B$3', 'Энергия'), '=' + sumg('$B$3', 'Энергия', 'Q')),
    ('Итого переменные', '=SUM(B14:B17)', '=SUM(C14:C17)'),
    ('Постоянные на 1 шт (по факт. выпуску)', '=IF($B$9>0,$B$10/$B$9,NA())', '=B19'),
    ('ПОЛНАЯ СЕБЕСТОИМОСТЬ 1 шт', '=B18+B19', '=C18+C19'),
    ('Постоянные на 1 шт (по нормальной мощности)', '=IF($B$11>0,$B$10/$B$11,NA())', '=B21'),
]
for i, (l, b, cc) in enumerate(prow, 14):
    plt.cell(i, 1, l)
    plt.cell(i, 2, b).number_format = '#,##0.00'
    plt.cell(i, 3, cc).number_format = '#,##0.00'
plt['A20'].font = plt['B20'].font = plt['C20'].font = Font(bold=True)
widths(plt, [46, 20, 22])

# Знаки и стойки
sg_ws = wb.create_sheet('Знаки и стойки')
sg_ws['A1'] = 'Знаки, стойки, секции: спецификации и сборка комплектов (учебные данные)'
sg_ws['A1'].font = Font(bold=True, size=13)
sg_ws['A2'], sg_ws['B2'] = 'Накладные цеха за месяц, руб', SGN_OVH
sg_ws['B2'].fill = YEL
sg_ws['A3'], sg_ws['B3'] = 'База распределения: чел-ч по плану выпуска', '=SUMPRODUCT(D6:D8,E6:E8)'
sg_ws['A4'], sg_ws['B4'] = 'Ставка накладных, руб за чел-ч', '=IF(B3>0,B2/B3,NA())'
head(sg_ws, 5, ['Код', 'Изделие', 'Материалы и труд (прямые), руб', 'Чел-ч на 1 шт', 'План выпуска, шт',
                'Накладные на 1 шт', 'ПОЛНАЯ себестоимость 1 шт', 'Накладные на весь выпуск'])
names = {'SGN-1': 'Знак (щит с плёнкой)', 'PST-1': 'Стойка 3,5 м', 'SEC-1': 'Секция щита 1 м2'}
for i, p in enumerate(SGN_VOL, 6):
    sg_ws.cell(i, 1, p)
    sg_ws.cell(i, 2, names[p])
    sg_ws.cell(i, 3, f'=SUMIFS(Рецептуры!$O${R0}:$O${R1},Рецептуры!$A${R0}:$A${R1},A{i},Рецептуры!$P${R0}:$P${R1},1)')
    sg_ws.cell(i, 4, f'=SUMIFS(Рецептуры!$G${R0}:$G${R1},Рецептуры!$A${R0}:$A${R1},A{i},Рецептуры!$P${R0}:$P${R1},1,Рецептуры!$F${R0}:$F${R1},"Труд")')
    sg_ws.cell(i, 5, SGN_VOL[p]).fill = YEL
    sg_ws.cell(i, 6, f'=D{i}*$B$4')
    sg_ws.cell(i, 7, f'=C{i}+F{i}')
    sg_ws.cell(i, 8, f'=F{i}*E{i}')
    for c in (3, 6, 7, 8):
        sg_ws.cell(i, c).number_format = '#,##0.00'
sg_ws['A9'], sg_ws['H9'] = 'Распределено накладных всего (должно = B2)', '=SUM(H6:H8)'
sg_ws['A9'].font = Font(bold=True)
head(sg_ws, 11, ['Комплект', 'Название', 'Компонент', 'Кол-во', 'Цена компонента', 'Сумма'])
r = 12
kit_rows = {}
for k, name, comps in KITS:
    first = r
    for comp, q in comps:
        sg_ws.cell(r, 1, k)
        sg_ws.cell(r, 2, name)
        sg_ws.cell(r, 3, comp)
        sg_ws.cell(r, 4, q).fill = YEL
        sg_ws.cell(r, 5, f'=IFERROR(VLOOKUP(C{r},$A$6:$G$8,7,FALSE),VLOOKUP(C{r},PriceTab,4,FALSE))').number_format = '#,##0.00'
        sg_ws.cell(r, 6, f'=D{r}*E{r}').number_format = '#,##0.00'
        r += 1
    kit_rows[k] = (first, r - 1)
kit_end = r - 1
r += 1
head(sg_ws, r, ['Комплект', 'Итого себестоимость комплекта'])
KIT_TOT = {}
for k, _, _ in KITS:
    r += 1
    sg_ws.cell(r, 1, k)
    sg_ws.cell(r, 2, f'=SUMIFS($F$12:$F${kit_end},$A$12:$A${kit_end},A{r})').number_format = '#,##0.00'
    KIT_TOT[k] = f"'Знаки и стойки'!B{r}"
widths(sg_ws, [12, 26, 16, 12, 16, 16, 18, 16])

# Транспорт
tr = wb.create_sheet('Транспорт')
tr['A1'] = 'Калькуляция транспортной услуги: самосвал (учебные данные)'
tr['A1'].font = Font(bold=True, size=13)
tparams = [
    ('Норма топлива, л на 100 км (учебная, не норматив)', TR['norm']), ('Шины и ТО, руб/км', TR['tyres']),
    ('Стоимость машины, руб без НДС', TR['cost']), ('Срок полезного использования, мес', TR['months']),
    ('Страхование и прочие постоянные, руб/мес', TR['fixed']), ('Часы работы за месяц, ч', TR['hours']),
    ('Пробег за месяц, км', TR['km_month']), ('Рейс: плечо в одну сторону, км', TR['trip_km']),
    ('Рейс: время с погрузкой, ч', TR['trip_h']), ('Груз за рейс, т', TR['load_t']),
]
for i, (l, v) in enumerate(tparams, 3):
    tr.cell(i, 1, l)
    tr.cell(i, 2, v).fill = YEL
tcalc = [
    ('Цена топлива на дату, руб/л (лист «Цены»)', '=VLOOKUP("F-DSL",PriceTab,4,FALSE)'),
    ('Ставка водителя с взносами, руб/ч (лист «Цены»)', '=VLOOKUP("L-HR",PriceTab,4,FALSE)'),
    ('Переменные на 1 км: топливо + шины, руб', '=B3/100*B14+B4'),
    ('Амортизация за месяц (линейно, учебно), руб', '=IF(B6>0,B5/B6,NA())'),
    ('Водитель за месяц, руб', '=B15*B8'),
    ('Ставка 1 часа: амортизация + постоянные + водитель, руб/ч', '=IF(B8>0,(B17+B7+B18)/B8,NA())'),
    ('СЕБЕСТОИМОСТЬ РЕЙСА (туда и обратно), руб', '=2*B10*B16+B11*B19'),
    ('Себестоимость 1 т·км, руб', '=IF(B12*B10>0,B20/(B12*B10),NA())'),
    ('Затраты машины за месяц, руб', '=B9*B16+B17+B7+B18'),
    ('Полная себестоимость 1 км за месяц, руб', '=IF(B9>0,B22/B9,NA())'),
]
for i, (l, fml) in enumerate(tcalc, 14):
    tr.cell(i, 1, l)
    tr.cell(i, 2, fml).number_format = '#,##0.00'
tr['A20'].font = tr['B20'].font = Font(bold=True)
widths(tr, [58, 18])

# Сценарии
sc = wb.create_sheet('Сценарии')
sc['A1'] = 'Асфальт: себестоимость 1 т при разных объёмах и ценах сырья; цена продажи'
sc['A1'].font = Font(bold=True, size=13)
sc['A2'], sc['B2'] = 'Сырьё на 1 т (база)', '=Асфальт!B11'
sc['A3'], sc['B3'] = 'Энергия + прочие переменные на 1 т', '=Асфальт!B12+Асфальт!B13'
sc['A4'], sc['B4'] = 'Постоянные за месяц', '=Асфальт!B7'
sc.cell(6, 1, 'Выпуск, т \\ индекс цен сырья').font = Font(bold=True)
for j, idx in enumerate(SC_IDX, 2):
    x = sc.cell(6, j, idx)
    x.fill = YEL
    x.number_format = '0.00'
for i, v in enumerate(SC_VOLS, 7):
    sc.cell(i, 1, v).fill = YEL
    for j in range(2, 2 + len(SC_IDX)):
        col = sc.cell(6, j).column_letter
        sc.cell(i, j, f'=IF($A{i}>0,$B$2*{col}$6+$B$3+$B$4/$A{i},"нет выпуска")').number_format = '#,##0.00'
pr0 = 7 + len(SC_VOLS) + 1
plist = [
    ('Себестоимость 1 т (лист «Асфальт»)', '=Асфальт!B16', '#,##0.00'),
    ('Наценка к себестоимости', MARKUP, '0%'),
    ('Цена при наценке', f'=B{pr0}*(1+B{pr0 + 1})', '#,##0.00'),
    ('Маржа от цены', MARGIN, '0%'),
    ('Цена при марже', f'=IF(B{pr0 + 3}<1,B{pr0}/(1-B{pr0 + 3}),NA())', '#,##0.00'),
    ('Фактическая маржа при наценке', f'=(B{pr0 + 2}-B{pr0})/B{pr0 + 2}', '0.00%'),
    ('Шаг округления цены вверх, руб', ROUND_TO, '0'),
    ('Цена без НДС (маржа, округлена вверх)', f'=CEILING(ROUND(B{pr0 + 4},6),B{pr0 + 6})', '#,##0.00'),
    ('Ставка НДС на продажу (проверьте режим и дату)', VAT_OUT, '0%'),
    ('НДС', f'=ROUND(B{pr0 + 7}*B{pr0 + 8},2)', '#,##0.00'),
    ('Цена с НДС', f'=B{pr0 + 7}+B{pr0 + 9}', '#,##0.00'),
]
for i, (l, v, nf) in enumerate(plist, pr0):
    sc.cell(i, 1, l)
    x = sc.cell(i, 2, v)
    x.number_format = nf
    if not isinstance(v, str):
        x.fill = YEL
widths(sc, [46, 16, 16, 16, 16])
SC = dict(cell_1000_11=f'Сценарии!D9', markup=f'Сценарии!B{pr0 + 2}', margin=f'Сценарии!B{pr0 + 4}',
          rounded=f'Сценарии!B{pr0 + 7}', vat=f'Сценарии!B{pr0 + 9}', gross=f'Сценарии!B{pr0 + 10}',
          mm=f'Сценарии!B{pr0 + 5}', zero='Сценарии!B7')

# План-факт
pf = wb.create_sheet('План-факт')
pf['A1'] = f'Асфальт, ноябрь 2026: факт против утверждённой калькуляции № {ap["num"]} от {ap["date"]:%d.%m.%Y}'
pf['A1'].font = Font(bold=True, size=13)
pf['A2'] = 'Утверждённая калькуляция записана ЗНАЧЕНИЯМИ — новые цены на листе «Цены» её не меняют.'
head(pf, 4, ['Статья', 'Норма на 1 т (утв.)', 'Цена (утв.)', 'Факт: количество', 'Факт: цена',
             'План на факт. выпуск, руб', 'Факт, руб', 'Отклонение, руб', 'В т.ч. норма (кол-во)', 'В т.ч. цена'])
pf['A3'], pf['B3'] = 'Факт. выпуск, т', FACT['out']
pf['B3'].fill = YEL
lines = [
    ('Минеральная часть, кг', ap['norm_min'], ap['p_min'], FACT['min_kg'], FACT['p_min']),
    ('Вяжущее, кг', ap['norm_bit'], ap['p_bit'], FACT['bit_kg'], FACT['p_bit']),
    ('Электроэнергия, кВт·ч', ap['kwh'], ap['p_kwh'], FACT['kwh'], FACT['p_kwh']),
    ('Газ, м3', ap['gas'], ap['p_gas'], FACT['gas'], FACT['p_gas']),
]
for i, (l, n, p, q, fp) in enumerate(lines, 5):
    pf.cell(i, 1, l)
    pf.cell(i, 2, n)
    pf.cell(i, 3, p)
    pf.cell(i, 4, q).fill = YEL
    pf.cell(i, 5, fp).fill = YEL
    pf.cell(i, 6, f'=B{i}*$B$3*C{i}')
    pf.cell(i, 7, f'=D{i}*E{i}')
    pf.cell(i, 8, f'=G{i}-F{i}')
    pf.cell(i, 9, f'=(D{i}-B{i}*$B$3)*C{i}')
    pf.cell(i, 10, f'=(E{i}-C{i})*D{i}')
pf.cell(9, 1, 'Прочие переменные, руб')
pf.cell(9, 2, ap['other'])
pf.cell(9, 6, '=B9*$B$3')
pf.cell(9, 7, FACT['other']).fill = YEL
pf.cell(9, 8, '=G9-F9')
pf.cell(10, 1, 'Постоянные за месяц, руб')
pf.cell(10, 6, ap['fixed'])
pf.cell(10, 7, FACT['fixed']).fill = YEL
pf.cell(10, 8, '=G10-F10')
pf.cell(11, 1, 'ИТОГО')
for col in 'FGHIJ':
    pf[f'{col}11'] = f'=SUM({col}5:{col}10)'
pf['A11'].font = Font(bold=True)
pf['A13'], pf['B13'] = 'Факт. себестоимость 1 т', '=IF(B3>0,G11/B3,NA())'
pf['A14'], pf['B14'] = 'План на 1 т при факт. выпуске', '=IF(B3>0,F11/B3,NA())'
pf['A15'], pf['B15'] = 'Утверждённая себестоимость 1 т (при 2000 т)', ap['raw'] + ap['energy'] + ap['other'] + ap['fixed'] / ap['base']
pf['A16'], pf['B16'] = 'Действующая калькуляция сегодня (лист «Асфальт»), справочно', '=Асфальт!B16'
for rr in range(5, 17):
    for cc in range(2, 11):
        pf.cell(rr, cc).number_format = '#,##0.00'
pf['B3'].number_format = '0'
widths(pf, [44, 14, 11, 16, 10, 18, 16, 16, 16, 14])

# Печатная форма
pt = wb.create_sheet('Печатная форма')
pf_rows = [
    ('КАЛЬКУЛЯЦИЯ СЕБЕСТОИМОСТИ И ЦЕНЫ', ''),
    ('Организация', 'ООО «Учебный дорстрой» (вымышленная)'),
    ('Продукт', 'Асфальтобетон учебный (ASF-1), на 1 т'),
    ('Версия рецептуры', '=Асфальт!B2'),
    ('Дата расчёта', '=CalcDate'),
    ('Статус', 'ПРОЕКТ — действует только после подписи; утверждённую копию сохраните значениями'),
    ('', ''),
    ('Сырьё', '=Асфальт!B11'),
    ('Энергия', '=Асфальт!B12'),
    ('Прочие переменные', '=Асфальт!B13'),
    ('Постоянные (на 1 т)', '=Асфальт!B15'),
    ('Себестоимость 1 т', '=Асфальт!B16'),
    ('Цена без НДС (маржа, округление)', f'={SC["rounded"]}'),
    ('НДС', f'={SC["vat"]}'),
    ('Цена с НДС', f'={SC["gross"]}'),
    ('', ''),
    ('Контроль', "=IF(COUNTIF(Проверка!D:D,\"ОШИБКА\")=0,\"контроли пройдены\",\"ЕСТЬ ОШИБКИ — см. лист «Проверка»\")"),
    ('Составил', '____________________ / ____________ /'),
    ('Проверил', '____________________ / ____________ /'),
    ('Утвердил', '____________________ / ____________ /   «___» __________ 20__ г.'),
]
for i, (l, v) in enumerate(pf_rows, 1):
    pt.cell(i, 1, l)
    x = pt.cell(i, 2, v)
    if l:
        pt.cell(i, 1).border = BORDER
        x.border = BORDER
    if 8 <= i <= 15:
        x.number_format = '#,##0.00'
pt['B5'].number_format = 'dd.mm.yyyy'
pt['A1'].font = Font(bold=True, size=14)
pt['A12'].font = pt['B12'].font = pt['A15'].font = pt['B15'].font = Font(bold=True)
widths(pt, [36, 62])
pt.print_area = 'A1:B20'
pt.page_setup.orientation = 'portrait'
pt.page_setup.fitToWidth = 1
pt.sheet_properties.pageSetUpPr.fitToPage = True

# Проверка
ck = wb.create_sheet('Проверка')
head(ck, 1, ['Показатель', 'Эталон (Python)', 'В файле', 'Совпало?'])
checks = [
    ('Асфальт: сырьё на 1 т', E['asf_raw'], '=Асфальт!B11'),
    ('Асфальт: энергия на 1 т', E['asf_energy'], '=Асфальт!B12'),
    ('Асфальт: переменные на 1 т', E['asf_var'], '=Асфальт!B14'),
    ('Асфальт: постоянные на 1 т', E['asf_fix_t'], '=Асфальт!B15'),
    ('Асфальт: полная себестоимость 1 т', E['asf_full'], '=Асфальт!B16'),
    ('Асфальт: то же через СУММПРОИЗВ (сырьё)', E['asf_raw'], '=Асфальт!B21'),
    ('Асфальт: полная, НДС не к вычету', E['asf_full_vat'], '=Асфальт!C16'),
    ('Асфальт: масса рецептуры, кг', E['asf_mass'], '=Асфальт!B22'),
    ('Асфальт при 1000 т (индекс 1,0)', E['asf_1000'], '=Сценарии!C9'),
    ('Асфальт при 1000 т и сырьё +10 %', E['sc_1000_idx11'], f'={SC["cell_1000_11"]}'),
    ('Бетон: переменные на 1 м3', E['con_var'], '=Бетон!B14'),
    ('Бетон: переменные, НДС не к вычету', E['con_var_vat'], '=Бетон!C14'),
    ('Бетон: полная себестоимость 1 м3', E['con_full'], '=Бетон!B16'),
    ('Бетон: масса смеси, кг/м3', E['con_mass'], '=Бетон!B22'),
    ('Плита: объём, м3', E['plt_volume'], '=Плиты!B7'),
    ('Плита: переменные на 1 шт', E['plt_var'], '=Плиты!B18'),
    ('Плита: полная себестоимость 1 шт', E['plt_full'], '=Плиты!B20'),
    ('Знаки: ставка накладных, руб/чел-ч', E['sgn_rate'], "='Знаки и стойки'!B4"),
    ('Знак: полная себестоимость', E['SGN-1_full'], "='Знаки и стойки'!G6"),
    ('Стойка: полная себестоимость', E['PST-1_full'], "='Знаки и стойки'!G7"),
    ('Секция: полная себестоимость', E['SEC-1_full'], "='Знаки и стойки'!G8"),
    ('Накладные распределены всего', E['sgn_alloc_total'], "='Знаки и стойки'!H9"),
    ('Комплект «Знак на стойке»', E['KIT-1'], '=' + KIT_TOT['KIT-1']),
    ('Комплект «Большой знак из 3 секций»', E['KIT-2'], '=' + KIT_TOT['KIT-2']),
    ('Транспорт: переменные на 1 км', E['tr_km'], '=Транспорт!B16'),
    ('Транспорт: ставка 1 часа', E['tr_hour'], '=Транспорт!B19'),
    ('Транспорт: рейс', E['tr_trip'], '=Транспорт!B20'),
    ('Транспорт: 1 т·км', E['tr_tkm'], '=Транспорт!B21'),
    ('Транспорт: полная на 1 км', E['tr_full_km'], '=Транспорт!B23'),
    ('Цена при наценке 20 %', E['pr_markup'], f'={SC["markup"]}'),
    ('Цена при марже 20 %', E['pr_margin'], f'={SC["margin"]}'),
    ('Маржа при наценке 20 %', E['markup_margin'], f'={SC["mm"]}'),
    ('Цена без НДС, округлена вверх до 10', E['pr_round'], f'={SC["rounded"]}'),
    ('Цена с НДС', E['pr_gross'], f'={SC["gross"]}'),
    ('План-факт: факт всего', E['pf_fact_total'], "='План-факт'!G11"),
    ('План-факт: план на факт. выпуск', E['pf_plan_total'], "='План-факт'!F11"),
    ('План-факт: отклонение', E['pf_dev'], "='План-факт'!H11"),
    ('План-факт: вяжущее, отклонение по норме', E['pf_bit_qty'], "='План-факт'!I6"),
    ('План-факт: вяжущее, отклонение по цене', E['pf_bit_price'], "='План-факт'!J6"),
]
for i, (name, val, fml) in enumerate(checks, 2):
    ck.cell(i, 1, name)
    ck.cell(i, 2, round(val, 6)).number_format = '#,##0.00##'
    ck.cell(i, 3, fml).number_format = '#,##0.00##'
    ck.cell(i, 4, f'=IF(ISERROR(C{i}),"ОШИБКА",IF(ABS(C{i}-B{i})<0.005,"ОК","ОШИБКА"))')
n = len(checks) + 2
ck.cell(n + 1, 1, 'Контроли данных').font = Font(bold=True)
data_checks = [
    ('Кодов без действующей цены на дату', f"=COUNTIF('Цены'!Q{T0}:Q{T1},\"НЕТ*\")", 0),
    ('Кодов с двумя ценами на одну дату', f"=COUNTIF('Цены'!Q{T0}:Q{T1},\"ДУБЛЬ*\")", 0),
    ('Строк рецептур без цены или единицы', f'=SUMPRODUCT(--ISERROR(Рецептуры!O{R0}:O{R0 + len(RECIPES) - 1}))', 0),
    ('Отрицательные нормы или цены', f'=COUNTIF(Рецептуры!G{R0}:G{R1},"<0")+COUNTIF(\'Цены\'!F{P0}:F{P1},"<0")', 0),
    ('Сценарий с нулевым выпуском показан текстом', f'=IF(ISNUMBER({SC["zero"]}),1,0)', 0),
]
for i, (name, fml, exp) in enumerate(data_checks, n + 2):
    ck.cell(i, 1, name)
    ck.cell(i, 2, exp)
    ck.cell(i, 3, fml)
    ck.cell(i, 4, f'=IF(ISERROR(C{i}),"ОШИБКА",IF(C{i}=B{i},"ОК","ОШИБКА"))')
last = n + 1 + len(data_checks)
ck.conditional_formatting.add(f'D2:D{last}', FormulaRule(formula=['D2="ОШИБКА"'], fill=RED))
ck.conditional_formatting.add(f'D2:D{last}', FormulaRule(formula=['D2="ОК"'], fill=GRN))
widths(ck, [46, 18, 18, 12])

wb.calculation.fullCalcOnLoad = True
import os  # noqa: E402
if os.environ.get('KALK_NO_NAMES'):
    # Вариант без имён — только для программной проверки в приложениях, где нет именованных диапазонов.
    OUT = os.environ['KALK_NO_NAMES']
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith('='):
                    v = cell.value.replace('CalcDate', "'Цены'!$B$1").replace('PriceTab', PT).replace('NA()', '(1/0)')
                    for a, b in (("'Цены'!", 'Цены!'), ("'План-факт'!", 'ПланФакт!'), ("'Знаки и стойки'!", 'Знаки!'),
                                 ("'Печатная форма'!", 'Печать!')):
                        v = v.replace(a, b)
                    cell.value = v
    for a, b in (('План-факт', 'ПланФакт'), ('Знаки и стойки', 'Знаки'), ('Печатная форма', 'Печать')):
        wb[a].title = b
Path(OUT).parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)

if __name__ == '__main__':
    for k in sorted(E):
        print(f'{k:16} {E[k]:.4f}')
    print('saved', OUT)
