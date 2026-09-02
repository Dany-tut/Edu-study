// Напоминание сверить заявления курсов об экзаменах с официальными источниками.
//
// ЗАЧЕМ. Курс, готовящий к экзамену, утверждает вещи о внешнем мире, а мир их
// не согласовывает: в середине 2026 IELTS перестал существовать на бумаге, и
// курс продолжал учить переносить ответы в бланк, которого больше нет. Изнутри
// репозитория это не видно ничем — файл компилируется, ссылки живы, урок
// проходит стандарт, а написанное в нём неправда.
//
// ЧТО СКРИПТ УМЕЕТ И ЧЕГО НЕ УМЕЕТ. Читать сайт экзамена за человека он не
// может: «Reading 60 минут» и «60 минут плюс перенос» отличаются одним словом
// в середине страницы, и никакая регулярка не решит, изменилось ли правило.
// Поэтому он делает ровно две вещи, которые машине по силам:
//
//   1. проверяет, что страница-источник вообще открывается — переехавшая или
//      удалённая страница сама по себе повод сходить посмотреть;
//   2. напоминает про заявления, которых человек давно не касался.
//
// Запуск: node scripts/checkExamClaims.mjs (или npm run check:exams).
// Флаг --list печатает все заявления, а не только просроченные.

import { readFileSync } from 'node:fs'

const SRC = new URL('../src/data/examClaims.ts', import.meta.url).pathname
const src = readFileSync(SRC, 'utf8')

const FRESH_DAYS = Number(src.match(/CLAIM_FRESH_DAYS = (\d+)/)?.[1] ?? 183)

// Разбор без сборщика: файл — плоский список литералов, и тянуть ради него
// esbuild значило бы усложнить проверку, которая должна запускаться одной
// командой в любой момент.
const claims = [...src.matchAll(/\{\s*course: '([^']+)',\s*exam: '([^']+)',\s*claim:\s*'((?:[^'\\]|\\.)*)',\s*where: '([^']+)',\s*source: '([^']+)',\s*checked: '([^']+)',\s*\}/g)]
  .map(m => ({ course: m[1], exam: m[2], claim: m[3], where: m[4], source: m[5], checked: m[6] }))

if (!claims.length) {
  console.error('Не разобрал ни одного заявления — формат examClaims.ts изменился, поправьте регулярку.')
  process.exit(1)
}

const listAll = process.argv.includes('--list')
const today = new Date()
const daysSince = iso => Math.floor((today - new Date(iso)) / 86_400_000)

const stale = []
const brokenSource = []

// Источники повторяются: одна страница описывает несколько заявлений.
const sources = [...new Set(claims.map(c => c.source))]
for (const url of sources) {
  try {
    // Сначала HEAD: интересует доступность страницы, а не её содержимое.
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    // Часть государственных сайтов (gov.br) отвечает на HEAD отказом 403, а на
    // обычный GET отдаёт страницу. Считать их мёртвыми — значит каждый запуск
    // гонять человека проверять живую ссылку, и через три раза он перестанет
    // читать вывод вообще.
    if (!res.ok && (res.status === 403 || res.status === 405)) {
      res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } })
    }
    if (!res.ok) brokenSource.push(`${url} — HTTP ${res.status}`)
  } catch (err) {
    brokenSource.push(`${url} — ${err.message}`)
  }
}

console.log(`Заявлений: ${claims.length}, источников: ${sources.length}, срок свежести: ${FRESH_DAYS} дней\n`)

for (const c of claims) {
  const age = daysSince(c.checked)
  const old = age > FRESH_DAYS
  if (old) stale.push(c)
  if (old || listAll) {
    console.log(`${old ? '⏰' : '  '} ${c.course.padEnd(6)} ${c.exam.padEnd(16)} сверяли ${age} дн. назад`)
    console.log(`     ${c.claim}`)
    console.log(`     где: ${c.where}`)
    console.log(`     источник: ${c.source}\n`)
  }
}

if (brokenSource.length) {
  console.log('Источники, которые не открылись (страница могла переехать — сходите посмотреть):')
  brokenSource.forEach(x => console.log('  ❌ ' + x))
  console.log('')
}

if (!stale.length) {
  console.log(`✅ Все заявления сверялись не позже ${FRESH_DAYS} дней назад.`)
} else {
  console.log(`⏰ Просрочено заявлений: ${stale.length}. По каждому: открыть источник, сверить,`)
  console.log('   поправить курс при расхождении и обновить `checked` в src/data/examClaims.ts —')
  console.log('   даже если ничего не изменилось.')
}

// Просроченная сверка — не повод ронять сборку: это напоминание человеку, а не
// поломка. Ненулевой код только у недоступного источника, который проверяется
// машинно и означает конкретную проблему.
process.exit(brokenSource.length ? 1 : 0)
