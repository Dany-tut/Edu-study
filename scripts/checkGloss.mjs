// Проверка пословного словаря: в каждом тексте библиотеки переводится КАЖДОЕ слово.
//
// ЗАЧЕМ. Ученик читает и тыкает в незнакомое слово. Если слова нет в словаре,
// он видит «Этого слова нет в словаре — но послушать можно»: формально честно,
// на деле — тупик ровно в тот момент, ради которого текст и открывали. Ошибка
// тихая, сборка от неё не падает, и заметна она только тому, кто читает.
//
// А расходится это быстро: сцену добавляют одним файлом (src/data/scenes/*),
// словарь ведётся другим (src/data/wordGloss.ts), и между ними нет никакой
// связи, кроме внимательности. Поэтому связь делает этот скрипт.
//
// ЧТО ПРОВЕРЯЕМ:
//   1. покрытие — у каждого кликабельного куска каждого текста есть перевод;
//   2. дубли — две записи с одним ключом: вторая молча затирает первую, и одна
//      из них написана зря;
//   3. подозрительные производные — английская форма, чей перевод взят
//      отрезанием окончания там, где у формы своё значение (daily → «день»).
//
// Запуск: npm run check:gloss

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Node умеет исполнять .ts сам, но только с явными расширениями в импортах, а
// внутри src их нет (там разрешение берёт на себя Vite). Поэтому собираем то,
// что нужно скрипту, тем же esbuild, которым собирается приложение.
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'gloss-'))
const out = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { WORD_GLOSS } from './src/data/wordGloss'
      export { buildLexicon } from './src/lib/lexicon'
      export { READING_LIBRARY } from './src/data/readingLibrary'
      export { EN_SCENES } from './src/data/scenes/scenesEn'
      export { KO_SCENES } from './src/data/scenes/scenesKo'
      export { JA_SCENES } from './src/data/scenes/scenesJa'
      export { PT_SCENES } from './src/data/scenes/scenesPt'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const {
  WORD_GLOSS, buildLexicon, READING_LIBRARY, EN_SCENES, KO_SCENES, JA_SCENES, PT_SCENES,
} = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

let bad = 0

// ─── 1. Покрытие ─────────────────────────────────────────────────────────────

const docs = []
for (const s of [...EN_SCENES, ...KO_SCENES, ...JA_SCENES, ...PT_SCENES]) {
  docs.push({ id: s.id, lang: s.lang, body: s.body, extra: s.glossary ?? [], kind: 'сцена' })
}
for (const t of READING_LIBRARY) {
  docs.push({ id: t.id, lang: t.lang, body: t.body, extra: t.glossary ?? [], kind: 'текст' })
}

const perLang = {}
for (const d of docs) {
  const lex = buildLexicon(d.lang, d.extra)
  const segments = lex.segment(d.body)
  const words = segments.filter(s => s.word)
  const holes = words.filter(s => !s.gloss)

  const st = (perLang[d.lang] ??= { words: 0, holes: 0, docs: 0 })
  st.words += words.length
  st.holes += holes.length
  st.docs += 1
  if (!holes.length) continue

  bad++
  // Уникальные пропуски с частотой: список из ста повторов одного слова
  // читать невозможно, а решение принимается по слову, а не по вхождению.
  const freq = new Map()
  for (const h of holes) freq.set(h.text, (freq.get(h.text) ?? 0) + 1)
  const list = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => (n > 1 ? `${t}×${n}` : t))
  console.log(`❌ ${d.lang} ${d.id} (${d.kind}): без перевода ${holes.length} из ${words.length}`)
  console.log(`   ${list.join(' ')}\n`)
}

// ─── 2. Дубли ключей ─────────────────────────────────────────────────────────

for (const [lang, list] of Object.entries(WORD_GLOSS)) {
  const seen = new Map()
  for (const g of list) {
    const k = g.term.trim().toLowerCase().replace(/[’‘`]/g, "'")
    if (seen.has(k)) {
      bad++
      console.log(`❌ ${lang}: «${g.term}» записан дважды — «${seen.get(k)}» и «${g.ru}»`)
      console.log('   Вторая запись затирает первую; оставить нужно одну.\n')
    } else seen.set(k, g.ru)
  }
}

// ─── 3. Производные формы английского ────────────────────────────────────────
//
// Отрезание окончаний (см. lib/lexicon.ts) выручает на регулярных формах, но
// врёт там, где форма зажила своей жизнью. Полный список решать нельзя — это
// вопрос смысла, — поэтому скрипт не запрещает, а показывает: сверь глазами.

const RISKY = /(ly|er|est|ies)$/
const derived = new Map()
for (const d of docs) {
  if (d.lang !== 'en') continue
  const lex = buildLexicon('en', d.extra)
  for (const seg of lex.segment(d.body)) {
    const note = seg.gloss?.note
    if (!note?.startsWith('форма слова')) continue
    if (!RISKY.test(seg.text.toLowerCase())) continue
    derived.set(seg.text.toLowerCase(), `${seg.gloss.ru} · ${note}`)
  }
}
if (derived.size) {
  console.log(`⚠️  формы, чей перевод получен отрезанием окончания (${derived.size}) — проверить глазами:`)
  for (const [k, v] of [...derived].sort()) console.log(`   ${k.padEnd(16)} ${v}`)
  console.log('   Если смысл разошёлся — добавить слово в wordGloss.ts целой записью.\n')
}

// ─── Итог ────────────────────────────────────────────────────────────────────

console.log('Словарь:', Object.entries(WORD_GLOSS).map(([l, v]) => `${l} ${v.length}`).join(', '))
for (const [lang, st] of Object.entries(perLang)) {
  const pct = ((1 - st.holes / st.words) * 100).toFixed(1)
  console.log(`${lang.padEnd(6)} текстов ${String(st.docs).padStart(3)}  слов ${String(st.words).padStart(6)}  покрытие ${pct}%`)
}

if (bad) {
  console.log(`\n❌ проблем: ${bad}`)
  console.log('Новый текст добавляют вместе со словарём к нему: слово без перевода —')
  console.log('это тупик на странице, а не мелочь. Записи класть в src/data/wordGloss.ts.')
  process.exit(1)
}
console.log('\n✅ каждое слово каждого текста переводится')
