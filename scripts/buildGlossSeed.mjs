// Словарь тапа из слов самих курсов.
//
// ЗАЧЕМ. Разбор текста (lib/lexicon.ts) берёт самое длинное совпадение по
// словарю. Слова, которого в словаре нет, для него не существует — и он
// раскладывает его на то, что есть, то есть на частицы и односложные записи:
//
//   오이 (огурец)  → 오 «приходить; пять» + 이 «указывает на подлежащее»
//   여자 (женщина) → 여 «о!»              + 자 «ну, держи»
//   いぬ (собака)  → い «?»               + ぬ «не»
//
// Это хуже, чем «слова нет в словаре»: ученик тыкает в слово урока и получает
// два уверенных чужих перевода. Ровно на этом споткнулся первый же урок
// хангыля, где 오이 стоит в списке слов урока.
//
// ПОЧЕМУ ГЕНЕРАТОР, А НЕ РУКИ. Слова уже написаны — они лежат в словарях
// юнитов всех двадцати курсов вместе с переводом (это и есть карточки
// знакомства). Переписывать полторы тысячи слов в wordGloss.ts руками значит
// держать одно и то же в двух местах и расходиться на первой же правке курса.
//
// ПОЧЕМУ ФАЙЛОМ, А НЕ НА ЛЕТУ. Курс тянет за собой схемы конспекта в data-URI:
// импорт сида ради словаря утащил бы в бандл ученика мегабайты картинок
// (ровно поэтому wordGloss.ts и ведётся отдельно). Здесь курсы собираются один
// раз при сборке контента, а в приложение попадает плоский список «слово —
// перевод».
//
// ЧТО НЕ БЕРЁМ:
//   • фразы и предложения (в термине есть пробел) — иначе тап по любому слову
//     фразы выделял бы всю строку разом, а разбор фразы на слова это и есть
//     то, ради чего разбор существует;
//   • курсы родного языка (rulit/ruvo/ruzh) — там на лице карточки толкование,
//     а в русском кликается только то, у чего толкование есть (GLOSS_ONLY);
//   • слова, которые уже записаны руками, — ручная запись точнее и она главнее.
//
// Запуск: npm run build:gloss
// Проверка: npm run check:gloss (там же сторож «слово урока = один тап»)

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { NATIVE_KEYS, SCRIPT, cardTerms, meaning } from './glossTerms.mjs'

const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'glossseed-'))
const out = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { COURSE_SEEDS } from './src/data/courseSeeds'
      export { MANUAL_GLOSS } from './src/data/wordGloss'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const { COURSE_SEEDS, MANUAL_GLOSS } = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

const key = s => s.toLowerCase().replace(/[’‘`]/g, "'")

/** lang → Map(ключ → { term, ru: Set }) */
const collected = new Map()
const manualKeys = new Map()
for (const [lang, list] of Object.entries(MANUAL_GLOSS)) {
  manualKeys.set(lang, new Set(list.map(g => key(g.term.trim()))))
}

let courses = 0
for (const seed of COURSE_SEEDS) {
  if (NATIVE_KEYS.has(seed.key)) continue
  let course
  try {
    course = await seed.build(`gloss-${seed.key}`)
  } catch (e) {
    console.log(`✗ ${seed.key}: курс не собрался — ${e.message}`)
    continue
  }
  courses++
  for (const lesson of course.lessons) {
    const tasks = lesson.hwTasks ?? []
    const lang = tasks.map(t => t.lang).find(Boolean)
    if (!lang || !SCRIPT[lang]) continue
    const bucket = collected.get(lang) ?? new Map()
    collected.set(lang, bucket)
    for (const task of tasks) {
      if (task.type !== 'flashcard') continue
      const ru = meaning(task.back)
      if (!ru) continue
      for (const term of cardTerms(task.front, lang)) {
        const k = key(term)
        if (manualKeys.get(lang)?.has(k)) continue
        const cur = bucket.get(k) ?? { term, ru: new Set() }
        cur.ru.add(ru)
        bucket.set(k, cur)
      }
    }
  }
}

/**
 * Одно слово — один перевод.
 *
 * Одно и то же слово стоит в словарях разных курсов с разными формулировками
 * («сумка» и «сумка, портфель»). Склеивать их через «;» — плодить простыню из
 * синонимов; берём самую полную запись: она содержательнее короткой и уже
 * написана человеком.
 */
const pick = set => [...set].sort((a, b) => b.length - a.length || a.localeCompare(b))[0]

const lit = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const langs = [...collected.keys()].sort()
const body = langs.map(lang => {
  const rows = [...collected.get(lang).values()]
    .sort((a, b) => a.term.localeCompare(b.term))
    .map(v => `    g(${lit(v.term)}, ${lit(pick(v.ru))}),`)
    .join('\n')
  return `  ${/[^a-z]/.test(lang) ? lit(lang) : lang}: [\n${rows}\n  ],`
}).join('\n')

const HEADER = `// СГЕНЕРИРОВАННЫЙ ФАЙЛ — правки затрутся: npm run build:gloss
//
// Слова словарей юнитов всех курсов-сидов, разложенные по языкам. Нужны разбору
// текста (lib/lexicon.ts): без записи о слове он раскладывает его на частицы —
// 오이 «огурец» превращается в 오 «приходить» и 이 «частица». Подробности и
// правила отбора — в scripts/buildGlossSeed.mjs.
//
// Ручной словарь (wordGloss.ts) главнее: то, что записано там, сюда не
// попадает, а при склейке ручная запись перекрывает эту.

import type { WordGloss } from './wordGloss'

const g = (term: string, ru: string): WordGloss => ({ term, ru })

export const SEED_GLOSS: Record<string, WordGloss[]> = {
`

const file = 'src/data/wordGlossSeed.ts'
writeFileSync(file, `${HEADER}${body}\n}\n`)

console.log(`${file}: курсов ${courses}`)
for (const lang of langs) console.log(`  ${lang.padEnd(6)} ${collected.get(lang).size}`)
console.log('\nПроверка: npm run check:gloss')
