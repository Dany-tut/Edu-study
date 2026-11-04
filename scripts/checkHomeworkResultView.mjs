// Модалка «Результат ДЗ»: зачёт по порогу не зависит от наличия харда.
// Регрессия прод-QA 03.11.2026: ДЗ без харда на 100% показывало «Пока 100 из 100».
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { homeworkResultView as v } from '../src/lib/homeworkResultView.ts'

const cases = [
  // [описание, вход, ожидаемое]
  ['ниже порога, есть хард', { score: 79, hasHard: true }, { state: 'below', offerHard: false, gap: 1 }],
  ['ниже порога, нет харда', { score: 79, hasHard: false }, { state: 'below', offerHard: false, gap: 1 }],
  ['0 баллов', { score: 0, hasHard: false }, { state: 'below', offerHard: false, gap: 80 }],
  ['ровно порог, есть хард', { score: 80, hasHard: true }, { state: 'passed', offerHard: true, gap: 0 }],
  ['ровно порог, нет харда', { score: 80, hasHard: false }, { state: 'passed', offerHard: false, gap: 0 }],
  ['выше порога, нет харда', { score: 92, hasHard: false }, { state: 'passed', offerHard: false, gap: 0 }],
  ['100, есть хард', { score: 100, hasHard: true }, { state: 'passed', offerHard: true, gap: 0 }],
  ['100, нет харда', { score: 100, hasHard: false }, { state: 'passed', offerHard: false, gap: 0 }],
  ['ждёт проверки', { score: undefined, hasHard: true }, { state: 'pending', offerHard: false, gap: 0 }],
  ['ждёт проверки, нет харда', { score: undefined, hasHard: false }, { state: 'pending', offerHard: false, gap: 0 }],
]
for (const [name, input, expected] of cases)
  assert.deepEqual(v({ context: 'basic', passingScore: 80, ...input }), expected, name)
assert.deepEqual(v({ context: 'hard', score: 100, passingScore: 80, hasHard: true }).state, 'pending', 'хард уходит на проверку')
assert.equal(v({ context: 'basic', score: 60, passingScore: 60, hasHard: false }).state, 'passed', 'свой порог')
assert.equal(v({ context: 'basic', score: 100, passingScore: undefined, hasHard: false }).state, 'passed', 'порог по умолчанию')

// Модалка обязана брать состояние отсюда, а хард упоминать только при showHard.
const src = readFileSync('src/components/HomeworkFlow.tsx', 'utf8')
const modal = src.slice(src.indexOf('function ResultModal('), src.indexOf('type HomeworkLevelId'))
assert.ok(modal.includes('homeworkResultView('), 'ResultModal считает состояние через homeworkResultView')
assert.ok(!/showHard\s*&&\s*context === 'basic'/.test(modal), 'зачёт снова завязан на наличие харда')
assert.ok(/view\.offerHard \? \(/.test(modal), 'CTA к харду только при offerHard')
assert.ok(/showHard \? 'до открытия харда' : 'до порога'/.test(modal), 'полоса порога без харда не говорит о харде')
console.log(`PASS: homework result view (${cases.length + 3} cases + ResultModal wiring)`)
