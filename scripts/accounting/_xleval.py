# -*- coding: utf-8 -*-
"""Мини-вычислитель формул Excel для проверки учебных XLSX курса «Бухгалтерия».

Excel у автора курса нет, поэтому формулы шаблона проверяются здесь: книга,
собранная openpyxl, пересчитывается этим модулем, и результат сравнивается
с независимым расчётом на Python. Поддержан только тот набор функций, который
есть в Excel 2007 и используется в шаблонах: IF, AND, OR, NOT, IFERROR,
ISNUMBER, VLOOKUP, COUNT, LEFT, RIGHT, FIND, COUNTA, COUNTIF, COUNTIFS, SUMIF, SUMIFS, SUM, SUMPRODUCT,
MAX, MIN, INDEX, MATCH (точное), ROUND, ABS, N, LEN, TRIM, UPPER, SUBSTITUTE,
CHAR, MID, ROW.

Это не Excel: сравнение текста — без учёта регистра по кодам символов,
десятичный разделитель — точка. Итог «проверено программно», а не «в Excel».
"""
import re

from openpyxl.utils import column_index_from_string


class XLError(Exception):
    def __init__(self, code):
        self.code = code

    def __repr__(self):
        return self.code


NA = XLError('#N/A')
VALUE = XLError('#VALUE!')
DIV0 = XLError('#DIV/0!')

TOKEN = re.compile(r'''
  (?P<ws>\s+)
 |(?P<str>"(?:[^"]|"")*")
 |(?P<ref>(?:'(?:[^']|'')+'!|[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё.]*!)?\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?)
 |(?P<bool>TRUE|FALSE)(?![\w(])
 |(?P<num>\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)
 |(?P<func>[A-Z][A-Z0-9.]*)\(
 |(?P<op><>|<=|>=|[-+*/&=<>(),])
''', re.X)


def tokenize(s):
    out, i = [], 0
    while i < len(s):
        m = TOKEN.match(s, i)
        if not m:
            raise SyntaxError(f'не разобрать: {s[i:i + 30]!r} в {s!r}')
        i = m.end()
        k = m.lastgroup
        if k == 'ws':
            continue
        v = m.group(k)
        if k == 'func':
            out.append(('func', v))
        else:
            out.append((k, v))
    return out


def parse_ref(text, cur_sheet):
    if '!' in text:
        sh, a = text.rsplit('!', 1)
        if sh.startswith("'"):
            sh = sh[1:-1].replace("''", "'")
    else:
        sh, a = cur_sheet, text
    parts = a.replace('$', '').split(':')

    def rc(p):
        m = re.match(r'([A-Z]+)(\d+)', p)
        return int(m.group(2)), column_index_from_string(m.group(1))
    r1, c1 = rc(parts[0])
    r2, c2 = rc(parts[-1])
    return ('ref', sh, r1, c1, r2, c2, len(parts) == 2)


class Parser:
    PREC = {'=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4}

    def __init__(self, toks, sheet):
        self.t, self.i, self.sheet = toks, 0, sheet

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def take(self):
        x = self.t[self.i]
        self.i += 1
        return x

    def expr(self, minp=0):
        left = self.unary()
        while True:
            k, v = self.peek()
            if k != 'op' or v not in self.PREC or self.PREC[v] < minp + (0 if minp == 0 else 0):
                break
            p = self.PREC[v]
            if p < minp:
                break
            self.take()
            right = self.expr(p + 1)
            left = ('bin', v, left, right)
        return left

    def unary(self):
        k, v = self.peek()
        if k == 'op' and v in '-+':
            self.take()
            x = self.unary()
            return ('neg', x) if v == '-' else x
        return self.atom()

    def atom(self):
        k, v = self.take()
        if k == 'num':
            return ('lit', float(v))
        if k == 'bool':
            return ('lit', v == 'TRUE')
        if k == 'str':
            return ('lit', v[1:-1].replace('""', '"'))
        if k == 'ref':
            return parse_ref(v, self.sheet)
        if k == 'func':
            args = []
            if self.peek() == ('op', ')'):
                self.take()
                return ('call', v, args)
            while True:
                args.append(self.expr())
                k2, v2 = self.take()
                if v2 == ')':
                    break
                assert v2 == ',', (k2, v2)
            return ('call', v, args)
        if k == 'op' and v == '(':
            x = self.expr()
            assert self.take() == ('op', ')')
            return x
        raise SyntaxError(f'неожиданно {k} {v}')


def to_num(v):
    if isinstance(v, XLError):
        raise v
    if v is None:
        return 0.0
    if isinstance(v, bool):
        return 1.0 if v else 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = v.strip()
    try:
        return float(s)
    except ValueError:
        raise VALUE


def to_text(v):
    if isinstance(v, XLError):
        raise v
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, float):
        if v == int(v) and abs(v) < 1e15:
            return str(int(v))
        return ('%.15g' % v)
    if isinstance(v, int):
        return str(v)
    return v


def to_bool(v):
    if isinstance(v, XLError):
        raise v
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return v != 0
    raise VALUE


def cmp(a, b):
    """Сравнение как в Excel: числа < текст < логические; текст без регистра."""
    def rank(x):
        if x is None:
            return 0
        if isinstance(x, bool):
            return 3
        if isinstance(x, (int, float)):
            return 1
        return 2
    if a is None:
        a = '' if isinstance(b, str) else (0.0 if not isinstance(b, bool) else False)
    if b is None:
        b = '' if isinstance(a, str) else (0.0 if not isinstance(a, bool) else False)
    ra, rb = rank(a), rank(b)
    if ra != rb:
        return -1 if ra < rb else 1
    if ra == 2:
        a, b = a.upper(), b.upper()
    return (a > b) - (a < b)


def flat(v):
    if isinstance(v, list):
        return [x for row in v for x in row]
    return [v]


def crit_fn(c):
    """Условие СЧЁТЕСЛИ/СЧЁТЕСЛИМН."""
    if isinstance(c, XLError):
        raise c
    if isinstance(c, (int, float)) and not isinstance(c, bool):
        return lambda x: isinstance(x, (int, float)) and not isinstance(x, bool) and float(x) == float(c)
    c = to_text(c)
    op = '='
    for o in ('<=', '>=', '<>', '<', '>', '='):
        if c.startswith(o):
            op, c = o, c[len(o):]
            break
    try:
        num = float(c) if c.strip() != '' else None
    except ValueError:
        num = None
    if num is not None:
        def f(x):
            isn = isinstance(x, (int, float)) and not isinstance(x, bool)
            if op == '=':
                return isn and x == num
            if op == '<>':
                return not (isn and x == num)
            if not isn:
                return False
            return {'<': x < num, '>': x > num, '<=': x <= num, '>=': x >= num}[op]
        return f
    if op in ('=', '<>'):
        if c == '':
            eq = lambda x: x is None or x == ''
        else:
            rx = re.compile('^' + ''.join('.' if ch == '?' else '.*' if ch == '*' else re.escape(ch) for ch in c) + '$', re.I | re.S)
            eq = lambda x: isinstance(x, str) and rx.match(x) is not None
        return eq if op == '=' else (lambda x: not eq(x))

    def g(x):
        if not isinstance(x, str):
            return False
        r = cmp(x, c)
        return {'<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0}[op]
    return g


class Book:
    def __init__(self, wb):
        self.cells = {}
        for ws in wb.worksheets:
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value is not None:
                        self.cells[(ws.title, cell.row, cell.column)] = cell.value
        self.memo = {}
        self.ast = {}
        self.rng = {}

    def value(self, sheet, r, c):
        key = (sheet, r, c)
        if key in self.memo:
            return self.memo[key]
        v = self.cells.get(key)
        if isinstance(v, str) and v.startswith('='):
            if key not in self.ast:
                self.ast[key] = Parser(tokenize(v[1:]), sheet).expr()
            try:
                v = self.ev(self.ast[key], sheet, r)
            except XLError as e:
                v = e
            if isinstance(v, list):
                v = flat(v)[0]
        elif isinstance(v, int) and not isinstance(v, bool):
            v = float(v)
        self.memo[key] = v
        return v

    def range(self, sh, r1, c1, r2, c2):
        k = (sh, r1, c1, r2, c2)
        if k not in self.rng:
            self.rng[k] = [[self.value(sh, r, c) for c in range(c1, c2 + 1)] for r in range(r1, r2 + 1)]
        return self.rng[k]

    def ev(self, n, sheet, row):
        t = n[0]
        if t == 'lit':
            return n[1]
        if t == 'ref':
            _, sh, r1, c1, r2, c2, is_rng = n
            if not is_rng:
                return self.value(sh, r1, c1)
            return self.range(sh, r1, c1, r2, c2)
        if t == 'neg':
            v = self.ev(n[1], sheet, row)
            if isinstance(v, list):
                return [[self._safe(lambda: -to_num(x)) for x in rr] for rr in v]
            return -to_num(v)
        if t == 'bin':
            a = self.ev(n[2], sheet, row)
            b = self.ev(n[3], sheet, row)
            return self.binop(n[1], a, b)
        if t == 'call':
            return self.call(n[1], n[2], sheet, row)
        raise ValueError(t)

    @staticmethod
    def _safe(f):
        try:
            return f()
        except XLError as e:
            return e

    def binop(self, op, a, b):
        if isinstance(a, list) or isinstance(b, list):
            A = a if isinstance(a, list) else None
            B = b if isinstance(b, list) else None
            rows = len(A or B)
            cols = len((A or B)[0])
            out = []
            for i in range(rows):
                rr = []
                for j in range(cols):
                    x = A[i][j] if A else a
                    y = B[i][j] if B else b
                    rr.append(self._safe(lambda: self.binop(op, x, y)))
                out.append(rr)
            return out
        if isinstance(a, XLError):
            raise a
        if isinstance(b, XLError):
            raise b
        if op == '&':
            return to_text(a) + to_text(b)
        if op in ('=', '<>', '<', '>', '<=', '>='):
            r = cmp(a, b)
            return {'=': r == 0, '<>': r != 0, '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0}[op]
        x, y = to_num(a), to_num(b)
        if op == '+':
            return x + y
        if op == '-':
            return x - y
        if op == '*':
            return x * y
        if op == '/':
            if y == 0:
                raise DIV0
            return x / y
        raise ValueError(op)

    def call(self, f, args, sheet, row):
        E = lambda i: self.ev(args[i], sheet, row)
        if f == 'IF':
            c = to_bool(E(0))
            if c:
                return E(1)
            return E(2) if len(args) > 2 else False
        if f == 'IFERROR':
            try:
                v = E(0)
                if isinstance(v, XLError):
                    raise v
                return v
            except XLError:
                return E(1)
        if f == 'AND':
            return all(to_bool(x) for i in range(len(args)) for x in flat(E(i)))
        if f == 'OR':
            return any(to_bool(x) for i in range(len(args)) for x in flat(E(i)))
        if f == 'NOT':
            return not to_bool(E(0))
        if f == 'ISNUMBER':
            try:
                v = E(0)
            except XLError:
                return False
            return isinstance(v, (int, float)) and not isinstance(v, bool)
        if f == 'ROW':
            return float(row)
        if f in ('COUNTIF', 'COUNTIFS'):
            ranges = [flat(E(i)) for i in range(0, len(args), 2)]
            crits = [crit_fn(E(i)) for i in range(1, len(args), 2)]
            return float(sum(1 for k in range(len(ranges[0])) if all(cr(rg[k]) for rg, cr in zip(ranges, crits))))
        if f == 'SUMIF':
            rg = flat(E(0))
            cr = crit_fn(E(1))
            sm = flat(E(2)) if len(args) > 2 else rg
            return float(sum(sm[k] for k in range(len(rg)) if cr(rg[k]) and isinstance(sm[k], (int, float)) and not isinstance(sm[k], bool)))
        if f == 'SUMIFS':
            sm = flat(E(0))
            ranges = [flat(E(i)) for i in range(1, len(args), 2)]
            crits = [crit_fn(E(i)) for i in range(2, len(args), 2)]
            return float(sum(sm[k] for k in range(len(sm)) if all(cr(rg[k]) for rg, cr in zip(ranges, crits)) and isinstance(sm[k], (int, float)) and not isinstance(sm[k], bool)))
        if f == 'SUM':
            tot = 0.0
            for i in range(len(args)):
                v = E(i)
                if isinstance(v, list):
                    for x in flat(v):
                        if isinstance(x, XLError):
                            raise x
                        if isinstance(x, (int, float)) and not isinstance(x, bool):
                            tot += x
                else:
                    tot += to_num(v)
            return tot
        if f == 'SUMPRODUCT':
            arrs = [flat(E(i)) for i in range(len(args))]
            tot = 0.0
            for k in range(len(arrs[0])):
                p = 1.0
                for a in arrs:
                    x = a[k]
                    if isinstance(x, XLError):
                        raise x
                    p *= float(x) if isinstance(x, (int, float)) and not isinstance(x, bool) else 0.0
                tot += p
            return tot
        if f in ('MAX', 'MIN'):
            vals = []
            for i in range(len(args)):
                v = E(i)
                for x in flat(v) if isinstance(v, list) else [to_num(v)]:
                    if isinstance(x, XLError):
                        raise x
                    if isinstance(x, (int, float)) and not isinstance(x, bool):
                        vals.append(x)
            if not vals:
                return 0.0
            return max(vals) if f == 'MAX' else min(vals)
        if f == 'COUNT':
            return float(sum(1 for i in range(len(args)) for x in flat(E(i)) if isinstance(x, (int, float)) and not isinstance(x, bool)))
        if f == 'COUNTA':
            return float(sum(1 for i in range(len(args)) for x in flat(E(i)) if x is not None))
        if f == 'INDEX':
            rg = E(0)
            r = int(to_num(E(1)))
            c = int(to_num(E(2))) if len(args) > 2 else 1
            if not isinstance(rg, list):
                rg = [[rg]]
            if len(rg) == 1 and len(args) == 2:
                r, c = 1, r
            if c == 0 and len(args) > 2:
                if r < 1 or r > len(rg):
                    raise XLError('#REF!')
                return [rg[r - 1]]
            if r < 1 or c < 1 or r > len(rg) or c > len(rg[0]):
                raise XLError('#REF!')
            v = rg[r - 1][c - 1]
            if isinstance(v, XLError):
                raise v
            return v
        if f == 'VLOOKUP':
            x = E(0)
            if isinstance(x, XLError):
                raise x
            rg = E(1)
            c = int(to_num(E(2)))
            assert len(args) == 4 and E(3) is False, 'только точный ВПР'
            for row in rg:
                v = row[0]
                if v is not None and not isinstance(v, XLError) and isinstance(x, str) == isinstance(v, str) and cmp(x, v) == 0:
                    res = row[c - 1]
                    if isinstance(res, XLError):
                        raise res
                    return res
            raise NA
        if f == 'MATCH':
            x = E(0)
            if isinstance(x, XLError):
                raise x
            rg = flat(E(1))
            assert len(args) == 3 and to_num(E(2)) == 0, 'только точный ПОИСКПОЗ'
            for k, v in enumerate(rg):
                if v is None or isinstance(v, XLError):
                    continue
                if (isinstance(x, str) == isinstance(v, str)) and cmp(x, v) == 0:
                    return float(k + 1)
            raise NA
        if f == 'ROUND':
            x, d = to_num(E(0)), int(to_num(E(1)))
            m = 10 ** d
            return float(int(abs(x) * m + 0.5 + 1e-9) / m) * (1 if x >= 0 else -1)
        if f == 'ABS':
            return abs(to_num(E(0)))
        if f == 'N':
            v = E(0)
            return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0
        if f == 'LEN':
            return float(len(to_text(E(0))))
        if f == 'TRIM':
            return ' '.join(to_text(E(0)).split(' ')).strip() if False else re.sub(' +', ' ', to_text(E(0))).strip(' ')
        if f == 'UPPER':
            return to_text(E(0)).upper()
        if f == 'SUBSTITUTE':
            return to_text(E(0)).replace(to_text(E(1)), to_text(E(2)))
        if f == 'CHAR':
            return chr(int(to_num(E(0))))
        if f == 'MID':
            s = to_text(E(0))
            st, ln = int(to_num(E(1))), int(to_num(E(2)))
            return s[st - 1:st - 1 + ln]
        if f == 'LEFT':
            return to_text(E(0))[:int(to_num(E(1))) if len(args) > 1 else 1]
        if f == 'RIGHT':
            n = int(to_num(E(1))) if len(args) > 1 else 1
            t = to_text(E(0))
            return t[-n:] if n else ''
        if f == 'FIND':
            k = to_text(E(1)).find(to_text(E(0)))
            if k < 0:
                raise VALUE
            return float(k + 1)
        raise NotImplementedError(f)
