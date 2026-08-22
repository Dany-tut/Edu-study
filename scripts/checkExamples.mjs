// Проверка примеров к словам: у КАЖДОГО слова, которое может попасть в карточку,
// есть предложение.
//
// ЗАЧЕМ. Пример подбирается на чтении, по слову (см. src/lib/cardExamples.ts), и
// дыра в подборе тихая: карточка просто показывает голую пару «слово —
// перевод», и заметит это только тот, кто дошёл до неё в стопке. Слова при этом
// приходят из трёх мест — словари юнитов, глоссарии текстов, разговорник, — и
// между ними нет никакой связи, кроме этого скрипта.
//
// ЧТО ПРОВЕРЯЕМ:
//   1. покрытие — у каждого слова есть пример хоть из какого-то источника;
//   2. пример содержит само слово (иначе он не про него);
//   3. перевод — сколько примеров показывается без второй строки.
//
// Запуск: npm run check:examples

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'checkex-'))
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
      export { exampleKey } from './src/data/vocabExamples/model'
      export { EN_VOCAB_EXAMPLES } from './src/data/vocabExamples/en'
      export { KO_VOCAB_EXAMPLES } from './src/data/vocabExamples/ko'
      export { JA_VOCAB_EXAMPLES } from './src/data/vocabExamples/ja'
      export { PT_VOCAB_EXAMPLES } from './src/data/vocabExamples/pt'
      export { EN_MINED_EXAMPLES } from './src/data/vocabExamples/enMined'
      export { KO_MINED_EXAMPLES } from './src/data/vocabExamples/koMined'
      export { JA_MINED_EXAMPLES } from './src/data/vocabExamples/jaMined'
      export { PT_MINED_EXAMPLES } from './src/data/vocabExamples/ptMined'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const M = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

const { exampleKey } = M
const base = l => l.split('-')[0].toLowerCase()
const BOOKS = { ko: M.KOREAN_SURVIVAL, ja: M.JAPANESE_SURVIVAL, pt: M.PORTUGUESE_SURVIVAL, en: M.ENGLISH_SURVIVAL }
const HAND = { en: M.EN_VOCAB_EXAMPLES, ko: M.KO_VOCAB_EXAMPLES, ja: M.JA_VOCAB_EXAMPLES, pt: M.PT_VOCAB_EXAMPLES }
const MINED = { en: M.EN_MINED_EXAMPLES, ko: M.KO_MINED_EXAMPLES, ja: M.JA_MINED_EXAMPLES, pt: M.PT_MINED_EXAMPLES }
const SPECS = [
  M.ENGLISH_DESIGN_CAREER_SPEC, M.ENGLISH_IELTS,
  M.JAPANESE_JLPT, M.JAPANESE_JLPT_N3,
  M.KOREAN_HANGUL_COURSE, M.KOREAN_TOPIK, M.KOREAN_TOPIK2,
  M.PORTUGUESE_CELPE, M.PORTUGUESE_INTERMEDIATE,
]

// Индекс — ровно тот же, что собирает приложение: ручное сильнее разговорника,
// разговорник сильнее добытого.
const index = {}
for (const lang of Object.keys(HAND)) {
  const fromBook = {}
  for (const list of Object.values(BOOKS[lang].phrases)) {
    for (const ph of list) if (ph.ex) fromBook[exampleKey(ph.term)] = ph.ex
  }
  index[lang] = { ...MINED[lang], ...fromBook, ...HAND[lang] }
}

// Все слова, которые могут стать карточкой.
const terms = {}
const add = (lang, term) => ((terms[lang] ??= new Map()).set(exampleKey(term), term))
for (const spec of SPECS) for (const u of spec.units) for (const v of u.vocab) add(base(spec.lang), v.term)
for (const t of M.READING_LIBRARY) for (const g of t.glossary ?? []) if (BOOKS[base(t.lang)]) add(base(t.lang), g.term)
for (const [lang, book] of Object.entries(BOOKS)) {
  for (const list of Object.values(book.phrases)) for (const ph of list) add(lang, ph.term)
}


/**
 * Стоит ли слово в примере.
 *
 * СЛОВО В ПРЕДЛОЖЕНИИ СТОИТ НЕ В СЛОВАРНОЙ ФОРМЕ, и это норма: «먹다» в живой
 * речи это «먹어요», «morar» — «moro», «to imply» — «implies». Поэтому сверяем
 * не строку целиком, а основу: у корейского и японского отрезаем окончание
 * словарной формы, у латиницы берём первые буквы первого слова. Проверка ловит
 * не опечатку в окончании, а пример, приписанный вообще другому слову.
 *
 * Однобуквенные термы (чамо, гласные) пропускаем: буква стоит внутри слога, а
 * не отдельной строкой, и посимвольная сверка тут ничего не значит.
 */
function contains(sentence, term, key, lang) {
  if ([...term].length <= 2) return true
  if (/[~～/(]/.test(term)) return true          // грамматические модели и пары «A / B»
  if (sentence.includes(term)) return true
  if (lang === 'ko' || lang === 'ja') {
    const stem = term.replace(/(하다|되다|다|する|る|う|く|ぐ|す|つ|ぬ|ぶ|む|い|な)$/, '')
    return stem.length >= 1 && sentence.includes(stem)
  }
  const first = key.split(' ')[0]
  const stem = first.length > 5 ? first.slice(0, first.length - 2) : first
  return sentence.toLowerCase().includes(stem)
}

let bad = 0
for (const [lang, map] of Object.entries(terms)) {
  const ix = index[lang]
  const holes = []
  const offTerm = []
  let noRu = 0
  for (const [key, term] of map) {
    const ex = ix[key]
    if (!ex) { holes.push(term); continue }
    if (!ex.ru) noRu++
    if (!contains(ex.term, term, key, lang)) offTerm.push(`${term} → ${ex.term}`)
  }
  const total = map.size
  const covered = total - holes.length
  console.log(`\n${lang}: ${covered}/${total} слов с примером (${Math.round(covered / total * 100)}%) · без перевода ${noRu}`)
  if (holes.length) {
    bad++
    console.log(`  НЕТ ПРИМЕРА (${holes.length}): ${holes.slice(0, 40).join(', ')}${holes.length > 40 ? ' …' : ''}`)
  }
  if (offTerm.length) {
    console.log(`  пример без самого слова (${offTerm.length}): ${offTerm.slice(0, 10).join(' · ')}${offTerm.length > 10 ? ' …' : ''}`)
  }
}

if (bad) {
  console.log('\nПропуски закрываются руками в src/data/vocabExamples/<lang>.ts (см. npm run build:examples).')
  process.exit(1)
}
console.log('\nПримеры на месте.')

// Список примеров без перевода — ТЗ на дописывание второй строки руками.
if (process.argv.includes('--no-ru')) {
  for (const [lang, map] of Object.entries(terms)) {
    const ix = index[lang]
    console.log(`\n# ${lang}`)
    for (const [key, term] of map) {
      const ex = ix[key]
      if (ex && !ex.ru) console.log([term, ex.term].join('\t'))
    }
  }
}
