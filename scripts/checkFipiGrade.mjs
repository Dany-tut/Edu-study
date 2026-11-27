// Проверка lib/fipiGrade.ts: формат бланка и частичный балл.
// Запуск: npm run check:fipi
import { gradeFipi, normShort, scoringForLine } from '../src/lib/fipiGrade.ts'

let fail = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { fail++; console.error('✗', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want)) }
  else console.log('✓', name)
}
const t = (kind, answer, maxPoints, scoring) => ({ answer, maxPoints, scoring, payload: { fipi: { kind } } })

// Соответствие ЕГЭ, линия 7 (FCE64A): 2 балла, одна ошибка — 1
const m = t('select', '4543', 2, 'ege_minus_one')
eq('select: всё верно', gradeFipi(m, '4543').got, 2)
eq('select: одна ошибка (клетка В)', gradeFipi(m, '4533'), { got: 1, max: 2, wrong: [2], full: false })
eq('select: две ошибки', gradeFipi(m, '1533').got, 0)
eq('select: пусто', gradeFipi(m, '').got, 0)

// «Выберите два» — порядок не важен
const c = t('check', '25', 2, 'ege_minus_one')
eq('check: другой порядок', gradeFipi(c, '52').got, 2)
eq('check: одна лишняя', gradeFipi(c, '125').got, 1)
eq('check: одна не та (замена = одна ошибка, ФИПИ)', gradeFipi(c, '24').got, 1)
eq('check: обе не те', gradeFipi(c, '13').got, 0)
const c3 = t('check', '135', 2, 'ege_minus_one')
eq('check 3 из 6: лишняя четвёртая', gradeFipi(c3, '1356').got, 1)
const c1 = t('check', '34', 1, 'all_or_nothing')
eq('check 1 балл: ошибка → 0', gradeFipi(c1, '3').got, 0)

// Короткий ответ
const n = t('text', '2,24', 1, 'all_or_nothing')
eq('text: точка вместо запятой', gradeFipi(n, '2.24').got, 1)
eq('text: лишний ноль', gradeFipi(n, '2,240').got, 1)
eq('text: неверно', gradeFipi(n, '2,25').got, 0)
const s = t('text', '3142', 1, 'all_or_nothing')
eq('text: последовательность с пробелами', gradeFipi(s, '3 1 4 2').got, 1)
eq('text: другой порядок', gradeFipi(s, '1342').got, 0)
const w = t('text', 'рибосома|рибосомы', 1, 'all_or_nothing')
eq('text: вариант через |', gradeFipi(w, 'Рибосомы').got, 1)
eq('normShort ё', normShort('Ёлка '), 'елка')

eq('scoringForLine', [scoringForLine('select', 2), scoringForLine('check', 1), scoringForLine('extended', 3)], ['ege_minus_one', 'all_or_nothing', 'criteria'])

if (fail) { console.error(`\n${fail} проверок не прошло`); process.exit(1) }
console.log('\nвсе проверки fipiGrade прошли')
