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
//      отрезанием окончания там, где у формы своё значение (daily → «день»);
//   4. слова курсов — слово, которое урок только что дал, обязано тапаться
//      ЦЕЛИКОМ. Иначе ученик тыкает в 오이 «огурец» и получает 오 «приходить»
//      плюс 이 «частица»: разбор раскладывает незнакомое слово на то, что есть
//      в словаре, и врёт увереннее, чем молчал бы.
//
// Запуск: npm run check:gloss

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { NATIVE_KEYS, SCRIPT, cardTerms } from './glossTerms.mjs'

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
      export { DE_SCENES } from './src/data/scenes/scenesDe'
      export { RU_SCENES } from './src/data/scenes/scenesRu'
      export { COURSE_SEEDS } from './src/data/courseSeeds'
      export { EN_FEED } from './src/data/feed/feedEn'
      export { KO_FEED } from './src/data/feed/feedKo'
      export { JA_FEED } from './src/data/feed/feedJa'
      export { PT_FEED } from './src/data/feed/feedPt'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const {
  WORD_GLOSS, buildLexicon, READING_LIBRARY, EN_SCENES, KO_SCENES, JA_SCENES, PT_SCENES,
  DE_SCENES, RU_SCENES, COURSE_SEEDS,
  EN_FEED, KO_FEED, JA_FEED, PT_FEED,
} = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

let bad = 0

// ─── 1. Покрытие ─────────────────────────────────────────────────────────────

// Кликается не только текст: формулировка вопроса под ним разбирается тем же
// GlossedText (LanguageTrainer). Слово, которое встретилось ТОЛЬКО в вопросе
// («What happens if the pupil misses a week with flu?»), — такой же тупик, и
// заметить его труднее: до вопросов доходит не каждый читающий.
const docs = []
const push = (d, kind) => {
  docs.push({ id: d.id, lang: d.lang, body: d.body, extra: d.glossary ?? [], kind })
  const qs = (d.questions ?? []).map(q => q.q).filter(Boolean)
  if (qs.length) docs.push({ id: `${d.id} · вопросы`, lang: d.lang, body: qs.join('\n'), extra: d.glossary ?? [], kind })
}
for (const s of [...EN_SCENES, ...KO_SCENES, ...JA_SCENES, ...PT_SCENES, ...DE_SCENES, ...RU_SCENES]) push(s, 'сцена')
for (const t of READING_LIBRARY) push(t, 'текст')
// Лента обновляется сама и приезжает чанком на язык — то есть слово в ней
// появляется без правки словаря. Заголовок кликается наравне с телом, поэтому
// в проверку идёт и он.
for (const f of [...EN_FEED, ...KO_FEED, ...JA_FEED, ...PT_FEED]) {
  push({ ...f, body: `${f.title}\n${f.body ?? ''}` }, 'лента')
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

// ─── 4. Слова курсов: одно слово — один тап ──────────────────────────────────
//
// Проверяется ровно то, что видит ученик в конспекте и в задании: слово из
// словаря урока. Разобраться оно должно в ОДИН кусок с переводом — тап по
// слову даёт слово, а не два его слога.
//
// Словарь берётся общий, без глоссария урока: слово курса лежит в
// wordGlossSeed.ts (npm run build:gloss), и проверка заодно ловит, что файл
// пересобрали после правки курса.

const lexOf = (() => {
  const cache = new Map()
  return lang => {
    if (!cache.has(lang)) cache.set(lang, buildLexicon(lang))
    return cache.get(lang)
  }
})()

const split = []
const checked = new Set()
for (const seed of COURSE_SEEDS) {
  if (NATIVE_KEYS.has(seed.key)) continue
  let course
  try {
    course = await seed.build(`gloss-${seed.key}`)
  } catch (e) {
    bad++
    console.log(`❌ ${seed.key}: курс не собрался — ${e.message}\n`)
    continue
  }
  for (const lesson of course.lessons) {
    const tasks = lesson.hwTasks ?? []
    const lang = tasks.map(t => t.lang).find(Boolean)
    if (!lang || !SCRIPT[lang]) continue
    const lex = lexOf(lang)
    for (const task of tasks) {
      if (task.type !== 'flashcard') continue
      for (const term of cardTerms(task.front, lang)) {
        const id = `${lang}\u0000${term}`
        if (checked.has(id)) continue
        checked.add(id)
        const parts = lex.segment(term).filter(s => s.word)
        if (parts.length === 1 && parts[0].gloss) continue
        split.push({
          seed: seed.key, lang, term,
          pieces: parts.map(s => `${s.text}${s.gloss ? ` «${s.gloss.ru}»` : ' (нет в словаре)'}`).join(' + '),
        })
      }
    }
  }
}
if (split.length) {
  bad++
  console.log(`❌ слова курсов, которые тап разбивает на части (${split.length}):`)
  for (const s of split.slice(0, 40)) console.log(`   ${s.seed} ${s.lang}  ${s.term}  →  ${s.pieces}`)
  if (split.length > 40) console.log(`   … и ещё ${split.length - 40}`)
  console.log('   Пересоберите словарь слов курсов: npm run build:gloss\n')
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
