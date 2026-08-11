// ─────────────────────────────────────────────────────────────────────────────
// Разбор текста на слова с переводом
//
// ЗАДАЧА. Ученик должен иметь возможность ткнуть в ЛЮБОЕ место текста и увидеть
// перевод именно того, во что ткнул. Наивное «разбить по пробелам» этого не даёт
// ни в одном из четырёх языков библиотеки:
//
//  • японский пишется без пробелов вовсе — «リナ：からいものは» это одна «строка»
//    из имени, знака препинания, существительного и частицы;
//  • корейский пишется с пробелами, но склеивает слово с частицей: 내일은;
//  • английский и португальский, наоборот, разносят одно значение по нескольким
//    словам: «is a plus», «a gente», «looking forward to».
//
// РЕШЕНИЕ — жадный поиск самого длинного совпадения по позиции. Идём по строке
// слева направо; в каждой позиции пробуем подстроки от самой длинной записи
// словаря к самой короткой. Нашли — отдаём кусок с переводом и продолжаем сразу
// за ним; не нашли — отдаём один символ (для иероглифов) или одно слово (для
// латиницы) без перевода. Морфологии нет и не будет: 내일은 разбирается на
// «내일» + «은» просто потому, что обе записи есть в словаре, а не потому, что мы
// угадали границу окончания. Угадывание здесь врёт чаще, чем помогает.
//
// ПОЧЕМУ РАЗБОР ЗДЕСЬ, А НЕ В КОМПОНЕНТЕ. Тем же разбором пользуются и текст, и
// формулировки вопросов, и (в перспективе) расшифровка аудио. Разбор — чистая
// функция от строки и словаря, ей нечего делать в React.
// ─────────────────────────────────────────────────────────────────────────────

import { WORD_GLOSS, type WordGloss } from '../data/wordGloss'
import { transcribe } from './translit'

/** Кусок разобранного текста. `gloss` есть только у того, что нашлось в словаре. */
export interface Segment {
  text: string
  gloss?: WordGloss
  /** true — по куску можно кликнуть (слово, а не пробел и не запятая). */
  word: boolean
}

export interface Lexicon {
  lookup: (term: string) => WordGloss | undefined
  segment: (text: string) => Segment[]
  size: number
}

// Иероглифы, кана и хангыль. Для них единица «не нашлось» — один символ:
// пробелов внутри слова нет, откусывать больше нечего.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯々ー]/
// Латиница с цифрами: слово может содержать апостроф (I'd) и дефис (mid-level).
const WORD_CHAR = /[\p{L}\p{N}]/u
const DIGIT = /\p{N}/u
const LETTER = /\p{L}/u

/**
 * Класс символа для проверки границ: 'd' — цифра, 'l' — буква (апостроф и дефис
 * считаются частью слова, иначе «I'd» распалось бы на «I» и «d»), 'x' — всё
 * остальное. Совпадение со словарём допускается, только если по краям стоит
 * символ ДРУГОГО класса: так «a» не находится внутри «academia», а «h» из «6h»
 * находится — цифра и буква разные единицы, «6» это число, «h» это «часов».
 */
function cls(c: string | undefined): 'd' | 'l' | 'x' {
  if (!c) return 'x'
  if (DIGIT.test(c)) return 'd'
  if (c === "'" || c === '’' || c === '-') return 'l'
  return LETTER.test(c) && !CJK.test(c) ? 'l' : 'x'
}

/** Ключ словаря: регистр для латиницы не значим, для остального нейтрален. */
const key = (s: string) => s.toLowerCase()

// ─── Английские формы ────────────────────────────────────────────────────────
//
// ПОЧЕМУ ЗДЕСЬ МОРФОЛОГИЯ ЕСТЬ, А ВЫШЕ НАПИСАНО, ЧТО ЕЁ НЕТ. Выше речь о
// корейском и японском: там окончание приклеено к слову без пробела, вариантов
// разреза много, и угадывание границы врёт. Английское словоизменение устроено
// иначе — окончаний ровно четыре (-s, -ed, -ing, -er/-est/-ly), и проверка
// здесь не «угадать», а «отрезать и посмотреть, есть ли ТАКАЯ основа в
// словаре». Нет основы — ничего не показываем, поэтому ложных срабатываний
// почти не бывает: sauntered находит saunter, а bring не находит br.
//
// Зачем вообще: держать в словаре face, faces, facing и faced четырьмя записями
// — это вчетверо больше работы ради одного и того же перевода, и всё равно не
// покрывает текст, которого мы не видели. Форма помечается («форма слова…»),
// чтобы ученик видел, что перевод дан для основы, а не для того, во что он ткнул.

/** Минимальная длина основы: короче — почти всегда мусор (his → hi, as → a). */
const MIN_STEM = 3

/** Двойная согласная на конце: stopped → stop, running → run. */
const undouble = (s: string) =>
  s.length > 3 && s[s.length - 1] === s[s.length - 2] && !'aeiou'.includes(s[s.length - 1])
    ? s.slice(0, -1)
    : null

/**
 * Возможные основы английской словоформы — от самой вероятной к менее.
 *
 * Список кандидатов, а не ответ: какой из них настоящий, решает наличие записи
 * в словаре (см. buildLexicon).
 */
function enStems(k: string): string[] {
  const out: string[] = []
  const add = (s: string | null | undefined) => { if (s && s.length >= MIN_STEM) out.push(s) }
  // Притяжательное и стяжения с апострофом: men's → men.
  const apos = k.match(/^(.+?)['’](s|d|ll|ve|re|m)$/)
  if (apos) add(apos[1])
  if (k.endsWith('ies') && k.length > 4) add(k.slice(0, -3) + 'y')
  if (k.endsWith('es') && k.length > 3) { add(k.slice(0, -2)); add(k.slice(0, -1)) }
  else if (k.endsWith('s') && !k.endsWith('ss') && k.length > 3) add(k.slice(0, -1))
  if (k.endsWith('ied') && k.length > 4) add(k.slice(0, -3) + 'y')
  if (k.endsWith('ed') && k.length > 3) {
    add(k.slice(0, -1))          // liked → like
    add(k.slice(0, -2))          // walked → walk
    add(undouble(k.slice(0, -2))) // stopped → stop
  }
  if (k.endsWith('ing') && k.length > 4) {
    add(k.slice(0, -3))              // walking → walk
    add(k.slice(0, -3) + 'e')        // making → make
    add(undouble(k.slice(0, -3)))    // running → run
  }
  if (k.endsWith('ily') && k.length > 4) add(k.slice(0, -3) + 'y')
  if (k.endsWith('ly') && k.length > 3) { add(k.slice(0, -2)); add(k.slice(0, -2) + 'e') }
  if (k.endsWith('ier') || k.endsWith('iest')) add(k.replace(/i(er|est)$/, 'y'))
  if (k.endsWith('er') && k.length > 4) { add(k.slice(0, -2)); add(k.slice(0, -1)) }
  if (k.endsWith('est') && k.length > 5) { add(k.slice(0, -3)); add(k.slice(0, -2)) }
  return out
}

/**
 * Собрать словарь для языка.
 *
 * `extra` — глоссарий конкретного текста; он кладётся ПОСЛЕ общего словаря и
 * потому побеждает: автор текста лучше знает, в каком значении слово стоит
 * именно здесь.
 */
export function buildLexicon(lang: string, extra: WordGloss[] = []): Lexicon {
  const map = new Map<string, WordGloss>()
  let maxLen = 1
  const put = (g: WordGloss) => {
    const k = key(g.term.trim())
    if (!k) return
    map.set(k, g)
    if (k.length > maxLen) maxLen = k.length
  }
  for (const g of WORD_GLOSS[lang] ?? []) put(g)
  for (const g of extra) put(g)

  /**
   * Перевод для словоформы, которой нет в словаре как отдельной записи.
   *
   * Только для английского: остальные три языка либо не режутся по окончаниям
   * (корейский, японский), либо режутся, но с чередованиями в основе
   * (португальский: durmo/dormir), и там отрезание врало бы.
   */
  const derived = (word: string): WordGloss | undefined => {
    if (lang !== 'en') return undefined
    for (const stem of enStems(key(word))) {
      const g = map.get(stem)
      if (!g) continue
      // reading основы для формы не годится — его считает translit.
      return {
        term: word,
        ru: g.ru,
        note: g.note ? `форма слова «${g.term}» · ${g.note}` : `форма слова «${g.term}»`,
      }
    }
    return undefined
  }

  const lookup = (term: string) => map.get(key(term.trim())) ?? derived(term.trim())

  function segment(text: string): Segment[] {
    const out: Segment[] = []
    // Соседние куски без перевода склеиваются в один — иначе на каждый пробел и
    // каждую запятую пришлось бы по span'у, и в тексте на 900 символов их стало
    // бы под тысячу.
    const pushPlain = (s: string) => {
      const last = out[out.length - 1]
      if (last && !last.gloss && !last.word) last.text += s
      else out.push({ text: s, word: false })
    }

    let i = 0
    while (i < text.length) {
      // 1. Самое длинное совпадение со словарём начиная с этой позиции.
      const limit = Math.min(maxLen, text.length - i)
      let hit: { len: number; gloss: WordGloss } | null = null
      for (let len = limit; len > 0; len--) {
        const chunk = text.slice(i, i + len)
        // Совпадение не должно начинаться и кончаться на пробеле: иначе « on »
        // внутри слова даёт мусорные попадания.
        if (/^\s|\s$/.test(chunk)) continue
        const g = map.get(key(chunk))
        if (!g) continue
        // Для латиницы и цифр совпадение обязано лежать на границе слова.
        const head = cls(chunk[0])
        const tail = cls(chunk[chunk.length - 1])
        if (head !== 'x' && cls(text[i - 1]) === head) continue
        if (tail !== 'x' && cls(text[i + len]) === tail) continue
        hit = { len, gloss: g }
        break
      }
      if (hit) {
        out.push({ text: text.slice(i, i + hit.len), gloss: hit.gloss, word: true })
        i += hit.len
        continue
      }

      const ch = text[i]
      // 2. Иероглиф или слог хангыля без перевода — отдаём символом, чтобы по
      // нему всё равно можно было кликнуть и услышать чтение.
      if (CJK.test(ch)) {
        out.push({ text: ch, word: true })
        i += 1
        continue
      }
      // 3. Латинское слово целиком — даже без перевода это кликабельная единица.
      // Слово кончается там, где меняется класс символа: «6h» это «6» и «h»,
      // «2しゅうかん» — «2» и счётное слово.
      if (WORD_CHAR.test(ch)) {
        const k = cls(ch)
        let j = i + 1
        while (j < text.length && cls(text[j]) === k) j++
        const run = text.slice(i, j)
        // Голое число переводить нечего — оно и так понятно, поэтому не делаем
        // его кликабельным: подсказка «нет в словаре» на каждой цифре только
        // мешает.
        // Слово целиком в словаре не нашлось — пробуем его основу (walking →
        // walk). Проверка тут, а не в жадном поиске выше: там перебираются
        // куски строки, и отрезать окончание у куска значило бы искать основу
        // внутри соседнего слова.
        out.push({ text: run, gloss: LETTER.test(run) ? derived(run) : undefined, word: LETTER.test(run) })
        i = j
        continue
      }
      // 4. Всё остальное — пробелы, переносы, знаки препинания.
      pushPlain(ch)
      i += 1
    }
    return out
  }

  return { lookup, segment, size: map.size }
}

/** Есть ли для языка пословный словарь вообще. */
export const hasLexicon = (lang: string) => (WORD_GLOSS[lang]?.length ?? 0) > 0

/** Язык → чтения, записанные руками. Считается один раз на язык (см. wordReading). */
const readings = new Map<string, Map<string, string>>()

/**
 * Как звучит слово: записанное в словаре чтение, иначе посчитанное по буквам.
 *
 * Порядок именно такой — выверенное человеком чтение бьёт послоговый счёт,
 * который не знает ассимиляций на стыках (감사합니다 — «камсамнида», а не
 * «камсахапнида»). Пустая строка значит «транскрибировать нечего»: латиница
 * читается сама.
 */
export function wordReading(term: string, lang: string): string {
  let m = readings.get(lang)
  if (!m) {
    m = new Map()
    for (const g of WORD_GLOSS[lang] ?? []) if (g.reading) m.set(key(g.term.trim()), g.reading)
    readings.set(lang, m)
  }
  return m.get(key(term.trim())) || transcribe(term, lang)
}
