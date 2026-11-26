# Сборка учебной выписки в формате обмена 1С с клиент-банком (m12-02):
# public/courses/accounting/vypiska-1c-klient-bank.zip с файлом vypiska-1CClientBankExchange.txt
# (кодировка Windows-1251, CRLF). Отдаётся архивом: список материалов урока подхватывает только .xlsx/.zip.
# Запуск: python scripts/accounting/build_vypiska.py
# Структура секций — по описанию «Структура файлов обмена данными (версия 1.02)»,
# its.1c.ru/db/content/metod8dev/src/developers/dataexchange/bankexchange/clibnkdexchange/i8103262.htm
# (на самой странице пометка, что актуальная информация — на другой странице; версия формата в файле — 1.02).
# Код ВидОплаты везде «01» (условно; перечень шифров ЦБ в учебном файле не сверялся).
# Все данные вымышленные: организации «Альфа», «Бета», «Гамма», счета-заглушки.
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / 'public/courses/accounting/vypiska-1c-klient-bank.zip'
ACC_A = '40702810000000000001'  # Альфа (наш счёт)
ACC_B = '40702810000000000002'  # Бета (поставщик)
ACC_G = '40702810000000000003'  # Гамма (покупатель)
BIK_A, COR_A = '040000001', '30101810000000000001'
BIK_B, COR_B = '040000002', '30101810000000000002'
INN_A, INN_B, INN_G = '7700000048', '7700000016', '7700000023'
DATE = '05.11.2026'

OPEN, IN, OUT_, CLOSE = 500000.00, 61000.00, 100000.00 + 1200.00, 459800.00
assert OPEN + IN - OUT_ == CLOSE

def fmt(x):
    return f'{x:.2f}'

def doc(kind, num, summ, payer, receiver, purpose, vid='01', written=False):
    """payer/receiver: (счёт, ИНН, наименование, банк, БИК, корсчёт)."""
    L = [f'СекцияДокумент={kind}', f'Номер={num}', f'Дата={DATE}', f'Сумма={fmt(summ)}']
    L += [f'ПлательщикСчет={payer[0]}']
    if written:
        L += [f'ДатаСписано={DATE}']
    L += [f'Плательщик=ИНН {payer[1]} {payer[2]}', f'ПлательщикИНН={payer[1]}', f'Плательщик1={payer[2]}',
          f'ПлательщикРасчСчет={payer[0]}', f'ПлательщикБанк1={payer[3]}', f'ПлательщикБИК={payer[4]}', f'ПлательщикКорсчет={payer[5]}']
    L += [f'ПолучательСчет={receiver[0]}']
    if not written:
        L += [f'ДатаПоступило={DATE}']
    L += [f'Получатель=ИНН {receiver[1]} {receiver[2]}', f'ПолучательИНН={receiver[1]}', f'Получатель1={receiver[2]}',
          f'ПолучательРасчСчет={receiver[0]}', f'ПолучательБанк1={receiver[3]}', f'ПолучательБИК={receiver[4]}', f'ПолучательКорсчет={receiver[5]}']
    L += [f'ВидОплаты={vid}', f'НазначениеПлатежа={purpose}', 'КонецДокумента']
    return L

alpha = (ACC_A, INN_A, 'ООО «Альфа»', 'Учебный банк 1', BIK_A, COR_A)
beta = (ACC_B, INN_B, 'ООО «Бета»', 'Учебный банк 2', BIK_B, COR_B)
gamma = (ACC_G, INN_G, 'ООО «Гамма»', 'Учебный банк 2', BIK_B, COR_B)
bank = ('30102810000000000001', '7700000070', 'Учебный банк 1', 'Учебный банк 1', BIK_A, COR_A)

lines = [
    '1CClientBankExchange',
    'ВерсияФормата=1.02',
    'Кодировка=Windows',
    'Отправитель=Учебная выписка курса «Бухгалтерия» (не из реального банка)',
    'Получатель=1С:Бухгалтерия',
    f'ДатаСоздания={DATE}',
    'ВремяСоздания=18:00:00',
    f'ДатаНачала={DATE}',
    f'ДатаКонца={DATE}',
    f'РасчСчет={ACC_A}',
    'Документ=Платежное поручение',
    'Документ=Банковский ордер',
    'СекцияРасчСчет',
    f'ДатаНачала={DATE}',
    f'ДатаКонца={DATE}',
    f'РасчСчет={ACC_A}',
    f'НачальныйОстаток={fmt(OPEN)}',
    f'ВсегоПоступило={fmt(IN)}',
    f'ВсегоСписано={fmt(OUT_)}',
    f'КонечныйОстаток={fmt(CLOSE)}',
    'КонецРасчСчет',
]
lines += doc('Платежное поручение', '101', 61000.00, gamma, alpha, 'Оплата по счету № 12 от 01.11.2026 за товар. НДС не облагается')
lines += doc('Платежное поручение', '57', 100000.00, alpha, beta, 'Оплата по счету № 31 от 20.10.2026 за товар. НДС не облагается', written=True)
lines += doc('Банковский ордер', '9001', 1200.00, alpha, bank, 'Комиссия за обслуживание счёта за ноябрь', vid='01', written=True)
lines += ['КонецФайла']

text = '\r\n'.join(lines) + '\r\n'
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('vypiska-1CClientBankExchange.txt', text.encode('cp1251'))
print('OK', OUT, len(lines), 'строк; остаток', OPEN, '->', CLOSE)
