// Сборка примеров к словам уроков из самих уроков.
//
// ЗАЧЕМ. Карточка повторений знает только слово и перевод (review_cards), и без
// примера половина стопки — голые пары. Примеры к словам курсов пишутся руками
// (src/data/vocabExamples/<lang>.ts), но полторы тысячи слов руками не покрыть
// за один заход, а предложение с этим словом чаще всего УЖЕ написано — в теории
// юнита, в отработке конструкции или в тексте библиотеки. Этот скрипт их
// достаёт и раскладывает по языкам.
//
// ПОЧЕМУ ФАЙЛОМ, А НЕ НА ЛЕТУ. Иначе тренажёр на входе в карточки тянул бы все
// курсы языка целиком (сотни килобайт теории) ради одной строки на слово.
// Здесь это делается один раз при сборке контента, а в приложение попадает
// маленький словарь.
//
// ПОРЯДОК ИСТОЧНИКОВ (что сильнее):
//   1. `example` у слова в словаре юнита — написан к этому самому слову;
//   2. отработка конструкции (pattern) — предложение И перевод к нему;
//   3. строка теории вида «I'm blocked on the API — я застрял из-за API»;
//   4. любое предложение на изучаемом языке из теории или текста библиотеки.
// Ручные примеры и разговорник сюда не попадают: они сильнее добытого и
// склеиваются поверх уже в приложении (см. src/lib/cardExamples.ts).
//
// Запуск: npm run build:examples

import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'examples-'))
const out = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { ENGLISH_DESIGN_CAREER_SPEC } from './src/data/englishDesignCareer'
      export { ENGLISH_IELTS } from './src/data/englishIelts'
      export { JAPANESE_JLPT } from './src/data/japaneseJlpt'
      export { JAPANESE_JLPT_N3 } from './src/data/japaneseJlptN3'
      export { KOREAN_HANGUL_COURSE } from './src/data/koreanHangul'
      export { KOREAN_TOPIK } from './src/data/koreanTopik'
      export { KOREAN_TOPIK2 } from './src/data/koreanTopik2'
      export { PORTUGUESE_CELPE } from './src/data/portugueseCelpe'
      export { PORTUGUESE_INTERMEDIATE } from './src/data/portugueseIntermediate'
      export { READING_LIBRARY } from './src/data/readingLibrary'
      export { KOREAN_SURVIVAL } from './src/data/survivalKo'
      export { JAPANESE_SURVIVAL } from './src/data/survivalJa'
      export { PORTUGUESE_SURVIVAL } from './src/data/survivalPt'
      export { ENGLISH_SURVIVAL } from './src/data/survivalEn'
      export { EN_SCENES } from './src/data/scenes/scenesEn'
      export { KO_SCENES } from './src/data/scenes/scenesKo'
      export { JA_SCENES } from './src/data/scenes/scenesJa'
      export { PT_SCENES } from './src/data/scenes/scenesPt'
      export { exampleKey } from './src/data/vocabExamples/model'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const M = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

const { exampleKey, READING_LIBRARY } = M
const BOOKS = { ko: M.KOREAN_SURVIVAL, ja: M.JAPANESE_SURVIVAL, pt: M.PORTUGUESE_SURVIVAL, en: M.ENGLISH_SURVIVAL }
const SPECS = [
  M.ENGLISH_DESIGN_CAREER_SPEC, M.ENGLISH_IELTS,
  M.JAPANESE_JLPT, M.JAPANESE_JLPT_N3,
  M.KOREAN_HANGUL_COURSE, M.KOREAN_TOPIK, M.KOREAN_TOPIK2,
  M.PORTUGUESE_CELPE, M.PORTUGUESE_INTERMEDIATE,
]

const base = l => l.split('-')[0].toLowerCase()
const CYR = /[А-Яа-яЁё]/

// Строка «на изучаемом языке» — иначе примером станет русская фраза из теории,
// в которой слово стоит латиницей: «Про blocked on: конструкция именно с
// предлогом on». Это объяснение о слове, а не слово в языке.
const SCRIPT_OK = {
  en: s => /[A-Za-z]/.test(s) && !CYR.test(s),
  pt: s => /[A-Za-zÀ-ÿ]/.test(s) && !CYR.test(s),
  ko: s => /[가-힣]/.test(s) && !CYR.test(s),
  ja: s => /[ぁ-んァ-ヶ一-龯]/.test(s) && !CYR.test(s),
}

const MIN = 12
const MAX = 120

/** Предложения строки: латиница режется по .!?, японский и корейский — по 。！？ */
function sentences(text) {
  return String(text)
    .split('\n')
    .flatMap(line => line.split(/(?<=[.!?。！？])\s+/))
    .map(s => s.replace(/^[\s•·—–\-*>]+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

const has = (sentence, term, lang) =>
  lang === 'ko' || lang === 'ja'
    ? sentence.includes(term)
    : new RegExp(`(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu').test(sentence)

/** Годится ли предложение в пример: язык тот, длина человеческая, слово внутри. */
function fits(sentence, term, lang) {
  if (sentence.length < MIN || sentence.length > MAX) return false
  if (!SCRIPT_OK[lang](sentence)) return false
  if (sentence.length < term.length + 8) return false   // «apply» ≠ пример к apply
  return has(sentence, term, lang)
}

// ─── Сбор корпуса по языку ───────────────────────────────────────────────────

/** { lang: { terms, own, pattern, dashed, phrase, plain } } */
const corpora = {}
const corpus = lang => (corpora[lang] ??= { terms: new Map(), meta: new Map(), own: new Map(), pattern: [], dashed: [], phrase: [], plain: [] })

for (const spec of SPECS) {
  const lang = base(spec.lang)
  const c = corpus(lang)
  for (const u of spec.units) {
    for (const v of u.vocab) {
      c.terms.set(exampleKey(v.term), v.term)
      c.meta.set(exampleKey(v.term), { ru: v.ru, reading: v.reading, course: spec.key })
      // 1. Пример, написанный прямо у слова. Перевода у поля нет — это строка.
      if (v.example) c.own.set(exampleKey(v.term), { term: v.example.trim(), reading: v.reading ? undefined : undefined })
    }
    // 2. Отработка конструкции: ответ — предложение, gloss — его перевод.
    for (const it of u.pattern?.items ?? []) {
      if (it.answer && it.gloss) c.pattern.push({ term: String(it.answer).trim(), ru: String(it.gloss).trim() })
    }
    for (const t of u.tasks ?? []) {
      for (const it of t.patternItems ?? []) {
        if (it.answer && it.gloss) c.pattern.push({ term: String(it.answer).trim(), ru: String(it.gloss).trim() })
      }
      // Текст задания на чтение — такой же корпус, как текст библиотеки.
      if (t.passage) c.plain.push(...sentences(t.passage))
    }
    if (!u.theory) continue
    for (const line of String(u.theory).split('\n')) {
      // 3. «I'm blocked on the API — я застрял из-за API»: слева язык, справа перевод.
      const m = line.match(/^(.{6,110}?)\s+[—–]\s+(.{4,110})$/)
      if (m && SCRIPT_OK[lang](m[1]) && CYR.test(m[2]) && !CYR.test(m[1])) {
        c.dashed.push({ term: m[1].replace(/^[\s•·*>]+/, '').trim(), ru: m[2].trim().replace(/[.]$/, '') })
      }
    }
    // 4. Просто предложения теории.
    c.plain.push(...sentences(u.theory))
  }
}

// Примеры разговорника — три с половиной тысячи предложений С ПЕРЕВОДОМ. Слово
// урока часто стоит в одном из них, и это лучший источник после самого урока:
// предложение написано человеком, а не найдено по совпадению.
for (const [lang, book] of Object.entries(BOOKS)) {
  const c = corpus(lang)
  for (const list of Object.values(book.phrases)) {
    for (const ph of list) {
      if (ph.ex) c.phrase.push({ term: ph.ex.term, reading: ph.ex.reading, ru: ph.ex.ru })
    }
  }
}

// Сцены — подлинные тексты полки «Сцены»: живой язык, перевода построчно нет.
for (const sc of [...M.EN_SCENES, ...M.KO_SCENES, ...M.JA_SCENES, ...M.PT_SCENES]) {
  const lang = base(sc.lang)
  if (!SCRIPT_OK[lang]) continue
  corpus(lang).plain.push(...sentences(sc.body))
}

for (const t of READING_LIBRARY) {
  const lang = base(t.lang)
  if (!SCRIPT_OK[lang]) continue
  const c = corpus(lang)
  // Слова глоссария тоже уходят в колоду («Взять слова из текстов»).
  for (const g of t.glossary ?? []) {
    c.terms.set(exampleKey(g.term), g.term)
    if (!c.meta.has(exampleKey(g.term))) c.meta.set(exampleKey(g.term), { ru: g.ru, course: `текст ${t.id}` })
  }
  c.plain.push(...sentences(t.body))
}

// ─── Подбор ──────────────────────────────────────────────────────────────────

const HEADER = lang => `// СГЕНЕРИРОВАНО скриптом scripts/buildExamples.mjs — правки затрёт следующий прогон.
//
// Примеры к словам, добытые из самих уроков: предложение из теории юнита, из
// отработки конструкции или из текста библиотеки. Перевод стоит там, где
// источник его давал (отработка конструкции, строка «фраза — перевод»).
//
// Написать пример руками — сильнее: он попадёт в ./${lang}.ts и перекроет этот
// файл (см. src/lib/cardExamples.ts). Смысл этого файла в том, чтобы карточка
// без ручного примера не осталась совсем пустой.

import type { ExampleMap } from './model'

`

const lit = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const stats = {}
for (const [lang, c] of Object.entries(corpora)) {
  const map = {}
  let own = 0, pat = 0, dash = 0, phr = 0, plain = 0, none = 0
  const misses = []
  for (const [key, term] of [...c.terms].sort(([a], [b]) => a.localeCompare(b))) {
    // Поле `example` у слова юнита — свободная строка, и там встречается не
    // предложение, а пояснение по-русски («Читается [한구거] — ㄱ переходит в
    // следующий слог»). Такое в пример не годится: карточка показала бы
    // объяснение вместо языка. Пропускаем через ту же проверку, что и всё
    // остальное, и при отказе идём к следующему источнику.
    const fromOwn = c.own.get(key)
    if (fromOwn && SCRIPT_OK[lang](fromOwn.term)) { map[key] = { term: fromOwn.term }; own++; continue }
    const p = c.pattern.find(s => fits(s.term, term, lang))
    if (p) { map[key] = p; pat++; continue }
    const d = c.dashed.find(s => fits(s.term, term, lang))
    if (d) { map[key] = d; dash++; continue }
    const f = c.phrase.find(s => fits(s.term, term, lang))
    if (f) { map[key] = f; phr++; continue }
    // Из простых предложений берём самое короткое подходящее: чем короче
    // предложение, тем виднее в нём само слово.
    let best = null
    for (const s of c.plain) if (fits(s, term, lang) && (!best || s.length < best.length)) best = s
    if (best) { map[key] = { term: best }; plain++; continue }
    none++
    const m = c.meta.get(key) ?? {}
    misses.push([term, m.ru ?? '', m.reading ?? '', m.course ?? ''].join('\t'))
  }
  stats[lang] = { total: c.terms.size, own, pat, dash, phr, plain, none, misses }

  const body = Object.entries(map)
    .map(([k, v]) => `  ${lit(k)}: { term: ${lit(v.term)}${v.reading ? `, reading: ${lit(v.reading)}` : ''}${v.ru ? `, ru: ${lit(v.ru)}` : ''} },`)
    .join('\n')
  const name = `${lang.toUpperCase()}_MINED_EXAMPLES`
  const file = `src/data/vocabExamples/${lang}Mined.ts`
  writeFileSync(file, `${HEADER(lang)}export const ${name}: ExampleMap = {\n${body}\n}\n`)
  console.log(`${file}: ${Object.keys(map).length} из ${c.terms.size} слов · свой ${own} · конструкция ${pat} · строка «— перевод» ${dash} · разговорник ${phr} · предложение ${plain} · пусто ${none}`)
}

// Список слов, к которым пример не нашёлся, — это ТЗ на ручную работу.
const gapsFile = 'scripts/examples-gaps.txt'
const gaps = Object.entries(stats)
  .map(([lang, s]) => `# ${lang}: ${s.misses.length}\n${s.misses.join('\n')}`)
  .join('\n\n')
writeFileSync(gapsFile, `${gaps}\n`)
console.log(`\nСлова без примера выписаны в ${gapsFile}`)

// Пустые заглушки ручных файлов, если их ещё нет: реестр импортирует оба.
for (const lang of Object.keys(corpora)) {
  const f = `src/data/vocabExamples/${lang}.ts`
  if (existsSync(f)) continue
  writeFileSync(f, `import type { ExampleMap } from './model'\n\nexport const ${lang.toUpperCase()}_VOCAB_EXAMPLES: ExampleMap = {}\n`)
  console.log(`создан пустой ${f}`)
}
void readFileSync
