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
      export { GERMAN_A1B1_SPEC } from './src/data/germanA1B1'
      export { READING_LIBRARY } from './src/data/readingLibrary'
      export { KOREAN_SURVIVAL } from './src/data/survivalKo'
      export { JAPANESE_SURVIVAL } from './src/data/survivalJa'
      export { PORTUGUESE_SURVIVAL } from './src/data/survivalPt'
      export { ENGLISH_SURVIVAL } from './src/data/survivalEn'
      export { GERMAN_SURVIVAL } from './src/data/survivalDe'
      export { exampleKey } from './src/data/vocabExamples/model'
      export { EN_VOCAB_EXAMPLES } from './src/data/vocabExamples/en'
      export { KO_VOCAB_EXAMPLES } from './src/data/vocabExamples/ko'
      export { JA_VOCAB_EXAMPLES } from './src/data/vocabExamples/ja'
      export { PT_VOCAB_EXAMPLES } from './src/data/vocabExamples/pt'
      export { DE_VOCAB_EXAMPLES } from './src/data/vocabExamples/de'
      export { EN_MINED_EXAMPLES } from './src/data/vocabExamples/enMined'
      export { KO_MINED_EXAMPLES } from './src/data/vocabExamples/koMined'
      export { JA_MINED_EXAMPLES } from './src/data/vocabExamples/jaMined'
      export { PT_MINED_EXAMPLES } from './src/data/vocabExamples/ptMined'
      export { DE_MINED_EXAMPLES } from './src/data/vocabExamples/deMined'
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
const BOOKS = { ko: M.KOREAN_SURVIVAL, ja: M.JAPANESE_SURVIVAL, pt: M.PORTUGUESE_SURVIVAL, en: M.ENGLISH_SURVIVAL, de: M.GERMAN_SURVIVAL }
const HAND = { en: M.EN_VOCAB_EXAMPLES, ko: M.KO_VOCAB_EXAMPLES, ja: M.JA_VOCAB_EXAMPLES, pt: M.PT_VOCAB_EXAMPLES, de: M.DE_VOCAB_EXAMPLES }
const MINED = { en: M.EN_MINED_EXAMPLES, ko: M.KO_MINED_EXAMPLES, ja: M.JA_MINED_EXAMPLES, pt: M.PT_MINED_EXAMPLES, de: M.DE_MINED_EXAMPLES }
const SPECS = [
  M.ENGLISH_DESIGN_CAREER_SPEC, M.ENGLISH_IELTS,
  M.JAPANESE_JLPT, M.JAPANESE_JLPT_N3,
  M.KOREAN_HANGUL_COURSE, M.KOREAN_TOPIK, M.KOREAN_TOPIK2,
  M.PORTUGUESE_CELPE, M.PORTUGUESE_INTERMEDIATE,
  M.GERMAN_A1B1_SPEC,
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
/**
 * Немецкий: слово в предложении почти никогда не стоит так, как в словаре.
 *
 * ДВЕ ПРИЧИНЫ. Первая — отделяемая приставка: «aufstehen» в предложении это
 * «ich stehe … auf», и поиск подстроки не находит ничего. Вторая — умлаут и
 * чередование в основе: «fahren → er fährt», «Buch → Bücher», «Mutter →
 * Mütter». Поэтому здесь сначала пробуется само слово, потом основа без
 * приставки, а сравнение идёт по строке с «разутыми» умлаутами.
 */
const DE_PREFIXES = [
  'zurück', 'weiter', 'zusammen', 'auseinander', 'vorbei', 'entlang', 'herunter', 'hinunter',
  'auf', 'aus', 'ein', 'ab', 'an', 'mit', 'nach', 'vor', 'zu', 'um', 'über', 'unter', 'bei',
  'durch', 'fest', 'frei', 'her', 'hin', 'los', 'statt', 'teil', 'wieder', 'weg',
]
const deFlat = s => s.toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')

/**
 * Неправильные основы, которые не выводятся отрезанием: у сильных и модальных
 * глаголов меняется корневая гласная (dürfen → darf, haben → hat, wissen →
 * weiß), и никакая длина префикса этого не поймает. Список короткий, потому что
 * частотных таких глаголов немного.
 */
const DE_IRREGULAR = {
  'durfen': ['darf'], 'konnen': ['kann'], 'mussen': ['muss'], 'mogen': ['mag', 'moch'],
  'dürfen': ['darf'], 'können': ['kann'], 'müssen': ['muss'], 'mögen': ['mag', 'moch'],
  'wissen': ['weiss', 'wuss'], 'haben': ['hat', 'has', 'hab'], 'sein': ['ist', 'bin', 'sind', 'war'],
  'werden': ['wird', 'wurd'], 'vorhaben': ['hast', 'habe', 'hat'], 'nehmen': ['nimm', 'nahm'],
  'geben': ['gib', 'gab'], 'sehen': ['sieh', 'sah'], 'lesen': ['lies', 'las'], 'sprechen': ['spr'],
  'helfen': ['half', 'hilf'], 'treffen': ['triff', 'traf'], 'essen': ['iss', 'ass'],
}

function deContains(sentence, first, key) {
  // Возвратные: значимое слово второе, «sich» стоит в предложении как mich/dich/uns.
  if (first === 'sich') {
    const second = key.split(' ')[1]
    if (second) first = second
  }
  const text = deFlat(sentence)
  const word = deFlat(first)
  if (text.includes(word)) return true
  for (const stem of DE_IRREGULAR[deFlat(first)] ?? DE_IRREGULAR[first] ?? []) if (text.includes(deFlat(stem))) return true
  // Отделяемая приставка: ищем и приставку, и остаток глагола отдельно.
  for (const p of DE_PREFIXES) {
    if (!word.startsWith(p) || word.length <= p.length + 2) continue
    const rest = word.slice(p.length)
    const stem = rest.length > 5 ? rest.slice(0, rest.length - 2) : rest.replace(/en$/, '')
    if (stem.length >= 3 && text.includes(stem) && text.includes(p)) return true
  }
  // Чередование в основе: сверяем начало слова, а не всё слово целиком.
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word.replace(/(en|e)$/, '')
  return stem.length >= 3 && text.includes(stem)
}


/**
 * Корейский: слово в предложении почти никогда не стоит так, как в словаре.
 *
 * Отрезать «다» мало — на стыке основы и окончания гласные сливаются, а
 * согласная уходит в предыдущий слог, и от словарной формы не остаётся ни
 * одной общей БУКВЫ: 마시다 → 마셔요, 바쁘다 → 바빠요, 어렵다 → 어려워요,
 * 모르다 → 몰라요, 깨닫다 → 깨달았어요. Поиск подстроки по слогам тут
 * бессилен: 몰 и 모 — разные символы.
 *
 * Поэтому сверяем не слоги, а ЖАМО: раскладываем и основу, и предложение на
 * буквы, у основы отбрасываем последнюю (именно она и меняется при спряжении)
 * и ищем остаток. «마시» → ㅁㅏㅅ, и это находится в 마셔요; «모르» → ㅁㅗㄹ,
 * и это находится в 몰라요. Проверка при этом остаётся строгой: пример,
 * приписанный вообще другому слову, общего начала не даст.
 */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

function jamo(text) {
  let out = ''
  for (const ch of text) {
    const c = ch.codePointAt(0) - 0xac00
    if (c < 0 || c > 11171) { out += ch; continue }
    out += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28]
  }
  return out
}

function koContains(sentence, term) {
  if (sentence.includes(term)) return true
  // Фраза разговорника: пример к ней — её живой вариант, а не она сама
  // («냅킨 주세요» → «냅킨 좀 주세요»). Сверяем по первому слову, как у
  // немецкого: целиком совпадать фраза не обязана, к другому предмету — не
  // должна.
  if (term.includes(' ')) return koContains(sentence, term.split(' ')[0])
  // Словарная форма глагола и прилагательного: 다 к делу не относится.
  const stem = term.replace(/(하다|되다|다)$/, '')
  if (!stem || stem === term) return jamo(sentence).includes(jamo(term))
  const s = jamo(stem)
  // ㅎ-неправильные: у них уходит не только ㅎ, но и гласная перед ним —
  // 그렇다 → 그래요, 어떻다 → 어때요. Отбрасываем обе.
  const probe = s.endsWith('ㅎ') ? s.slice(0, -2) : s.slice(0, -1)
  // Одна буква в остатке — это уже не сверка, а совпадение.
  return probe.length >= 2 && jamo(sentence).includes(probe)
}

function contains(sentence, term, key, lang) {
  if ([...term].length <= 2) return true
  if (/[~～/(]/.test(term)) return true          // грамматические модели и пары «A / B»
  if (lang === 'ko') return koContains(sentence, term)
  if (sentence.includes(term)) return true
  if (lang === 'ja') {
    const stem = term.replace(/(하다|되다|다|する|る|う|く|ぐ|す|つ|ぬ|ぶ|む|い|な)$/, '')
    return stem.length >= 1 && sentence.includes(stem)
  }
  const first = key.split(' ')[0]
  if (lang === 'de') return deContains(sentence, first, key)
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
