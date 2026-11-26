# Общие мелочи для учебных XLSX курса «Бухгалтерия» (openpyxl). Только вымышленные данные.
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HEAD = PatternFill('solid', fgColor='1F2A44')
HF = Font(bold=True, color='FFFFFF')
GRY = PatternFill('solid', fgColor='EEF0F5')
YEL = PatternFill('solid', fgColor='FFF4C2')
thin = Side(style='thin', color='C9CEDA')
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)


def head(ws, row, titles):
    for c, t in enumerate(titles, 1):
        x = ws.cell(row, c, t)
        x.fill = HEAD
        x.font = HF
        x.alignment = Alignment(wrap_text=True, vertical='center')
        x.border = BORDER


def widths(ws, ws_w):
    for i, w in enumerate(ws_w, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def instruction(ws, lines):
    """lines: (текст, жирный). Лист «Инструкция» — первый."""
    for i, (t, b) in enumerate(lines, 1):
        c = ws.cell(i, 1, t)
        c.font = Font(bold=b, size=14 if i == 1 else 11)
        c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.column_dimensions['A'].width = 120


def inn10_ok(inn):
    """Контрольная сумма ИНН юрлица: веса 2,4,10,3,5,9,4,6,8; остаток от деления на 11, затем на 10."""
    w = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    return len(inn) == 10 and inn.isdigit() and sum(int(a) * b for a, b in zip(inn[:9], w)) % 11 % 10 == int(inn[9])


def inn10_with_ctrl(first9):
    w = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    return first9 + str(sum(int(a) * b for a, b in zip(first9, w)) % 11 % 10)
