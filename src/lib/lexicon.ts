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

  const lookup = (term: string) => map.get(key(term.trim()))

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
        out.push({ text: run, word: LETTER.test(run) })
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
