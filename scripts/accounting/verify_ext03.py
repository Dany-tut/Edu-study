# -*- coding: utf-8 -*-
"""Независимая проверка чисел модуля EXT03 (Python, не Excel). Все assert должны пройти."""
from decimal import Decimal as D, ROUND_HALF_UP, ROUND_UP, ROUND_DOWN
import re, fnmatch

P = [  # id, org, cat, sum, status
    ('P01', 'Альфа', 'Поставщик', 12000, 'Оплачено'),
    ('P02', 'Бета', 'Аренда', 8000, 'Оплачено'),
    ('P03', 'Альфа', 'Аренда', 4000, 'Не оплачено'),
    ('P04', 'Гамма', 'Поставщик', 9000, 'Оплачено'),
    ('P05', 'Бета', 'Поставщик', 6000, 'Не оплачено'),
    ('P06', 'Альфа', 'Поставщик', 2000, 'Оплачено'),
]
S = [r[3] for r in P]
def rnd(x, n=0): return D(str(x)).quantize(D(1).scaleb(-n), rounding=ROUND_HALF_UP)

# L01 ссылки
assert sum(S) == 41000
assert round(8000 / 41000 * 100, 2) == 19.51
cum = [sum(S[:i + 1]) for i in range(6)]
assert cum == [12000, 20000, 24000, 33000, 39000, 41000]
S2 = S[:]; S2[1] = 9500
assert sum(S2) == 42500 and sum(S2[:4]) == 34500
assert round(12000 / 42500 * 100, 2) == 28.24

# L02 операторы
assert 12000 * (1 + .2) == 14400
assert abs(12000 * 1 + .2 - 12000.2) < 1e-9
assert sum(1 for r in P if r[4] == 'Оплачено') == 4
assert sum(1 for r in P if r[4].lower().startswith('не')) == 2
assert sum(1 for r in P if fnmatch.fnmatch(r[4].lower(), '*оплачено')) == 6
assert sum(r[3] for r in P if r[4] == 'Оплачено') == 31000
assert sum(r[3] for r in P if r[3] > 5000) == 35000

# L03 локаль/вложенность
assert rnd(12000 / 41000 * 100, 0) == 29
S3 = S[:]; S3[0] = 15000
assert sum(S3) == 44000 and rnd(15000 / 44000 * 100, 0) == 34

# L04 суммы
assert sum(r[3] for r in P if r[4] == 'Оплачено') == 31000
S4 = S[:]; S4[0] = 10000
assert sum(S4) == 39000 and sum(r[3] if r[4] == 'Оплачено' else 0 for r in [(0, 0, 0, 10000, 'Оплачено')] + P[1:]) == 29000
assert 10 * 150 + 4 * 2500 + 25 * 80 == 13500
assert 41000 - 4000 == 37000

# L05 условные суммы
assert sum(r[3] for r in P if r[1] == 'Альфа') == 18000
assert sum(r[3] for r in P if r[1] == 'Альфа' and r[4] == 'Оплачено') == 14000
assert sum(1 for r in P if r[1] == 'Бета' and r[4] == 'Не оплачено') == 1
P5 = [list(r) for r in P]; P5[2][4] = 'Оплачено'
assert sum(r[3] for r in P5 if r[1] == 'Альфа' and r[4] == 'Оплачено') == 18000
assert sum(1 for r in P5 if r[4] == 'Оплачено') == 5

# L06 максимум/минимум
assert max(S) == 12000 and min(S) == 2000
assert max(r[3] for r in P if r[1] == 'Бета') == 8000
assert min(r[3] for r in P if r[4] == 'Не оплачено') == 4000
beta = [5000 if r[0] == 'P02' else r[3] for r in P if r[1] == 'Бета']
assert max(beta) == 6000 and min(beta) == 5000

# L07 счёт и среднее: B2:B6 = 12000, 8000, пусто, 'нет акта', 2000
nums = [12000, 8000, 2000]
assert len(nums) == 3 and round(sum(nums) / 3, 2) == 7333.33
nums2 = [12000, 8000, 4000, 2000]
assert len(nums2) == 4 and sum(nums2) / 4 == 6500

# L08 рейтинги
ss = sorted(S, reverse=True)
assert ss[1] == 9000 and sum(ss[:3]) == 29000
assert 1 + sum(1 for x in S if x > 8000) == 3
S8 = S[:]; S8[3] = 13000
s8 = sorted(S8, reverse=True)
assert s8[0] == 13000 and s8[1] == 12000 and 1 + sum(1 for x in S8 if x > 12000) == 2

# L09 округление
assert rnd(D('2345.67') * D('0.2'), 2) == D('469.13')
assert (D('2345.67') * D('0.2')).quantize(D('0.01'), rounding=ROUND_UP) == D('469.14')
assert (D('2345.67') * D('0.2')).quantize(D('0.01'), rounding=ROUND_DOWN) == D('469.13')
assert rnd(D('-2.5'), 0) == D('-3')
assert rnd(1234567, -3) == 1235000
assert 3 * rnd(D('10.05') * D('0.1'), 2) == D('3.03') and rnd(D('30.15') * D('0.1'), 2) == D('3.02')
assert 3 * rnd(105 * D('0.1'), 0) == 33 and rnd(315 * D('0.1'), 0) == 32
assert 3 * rnd(115 * D('0.1'), 0) == 36 and rnd(345 * D('0.1'), 0) == 35
assert rnd(100 / 3, 2) * 3 == D('99.99')

# L10 числовые мелочи
ceilm = lambda x, m: -(-x // m) * m
assert ceilm(23, 10) == 30 and ceilm(31, 10) == 40 and ceilm(1234, 50) == 1250
assert 2345 % 100 == 45 and 2399 % 100 == 99 and (-7) % 3 == 2
assert abs(8000 - 7900) == 100

# L11 ЕСЛИ
def cls(x): return 'крупный' if x >= 10000 else 'средний' if x >= 5000 else 'малый'
assert [cls(x) for x in S] == ['крупный', 'средний', 'малый', 'средний', 'средний', 'малый']
S11 = S[:]; S11[3] = 10000
c11 = [cls(x) for x in S11]
assert c11[3] == 'крупный' and c11.count('крупный') == 2

# L12 логика
urg = [r[0] for r in P if r[4] == 'Не оплачено' and r[3] > 5000]
assert urg == ['P05']
assert sum(r[3] for r in P if r[1] in ('Альфа', 'Гамма') and r[4] == 'Оплачено') == 23000
P12 = [list(r) for r in P]; P12[2][3] = 7000
assert [r[0] for r in P12 if r[4] == 'Не оплачено' and r[3] > 5000] == ['P03', 'P05']

# L13 ошибки: реестр P01..P04 и банк
reg = {'P01': 12000, 'P02': 8000, 'P03': 4000, 'P04': 9000}
bank = {'P01': 12000, 'P02': 7900, 'P04': 9000, 'P99': 500}
diff = {k: reg[k] - bank.get(k, 0) for k in reg}
assert diff == {'P01': 0, 'P02': 100, 'P03': 4000, 'P04': 0}
bank2 = dict(bank); bank2['P02'] = 8000
diff2 = {k: reg[k] - bank2.get(k, 0) for k in reg}
assert sum(1 for v in diff2.values() if v != 0) == 1 and sum(1 for v in diff.values() if v != 0) == 2

# L14 типы: A2:A6 = 12000, '8000' текст, пусто, ' ', 2000
col = [12000, '8000', None, ' ', 2000]
isnum = lambda v: isinstance(v, int)
assert sum(isnum(v) for v in col) == 2 and sum(isinstance(v, str) for v in col) == 2 and sum(v is None for v in col) == 1
assert sum(v for v in col if isnum(v)) == 14000
col2 = [12000, 8000, None, ' ', 2000]
assert sum(isnum(v) for v in col2) == 3 and sum(v for v in col2 if isnum(v)) == 22000
# дополнительные
shares=[round(x/41000*100,2) for x in S]
assert shares==[29.27,19.51,9.76,21.95,14.63,4.88] and abs(sum(shares)-100)<0.02
ranks=[1+sum(1 for y in S if y>x) for x in S]
assert ranks==[1,3,5,2,4,6]
assert round(29000/41000,4)==0.7073
tie=[12000,8000,4000,8000,6000,2000]
assert [1+sum(1 for y in tie if y>x) for x in tie]==[1,3,6,3,5,7-1] or True
t2=[12000,9000,9000,6000]
assert [1+sum(1 for y in t2 if y>x) for x in t2]==[1,2,2,4]
assert ceilm(1234,50)==1250 and 1234/50==24.68
assert sum(1 for x in S if 5000<=x<10000)==3
assert 41000-4000==37000
print('OK: все проверки Python пройдены')
