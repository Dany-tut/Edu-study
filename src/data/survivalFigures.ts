// ─────────────────────────────────────────────────────────────────────────────
// Схемы конспектов разговорников
//
// ЗАЧЕМ. Аудит: 118 уроков четырёх разговорников шли без единой схемы. Писать
// их руками значило бы написать 118 почти одинаковых картинок — темы у четырёх
// языков общие, разное только наполнение. Поэтому схема строится из данных.
//
// ИЗ ЧЕГО. У каждой темы уже есть `note.formula` — одна строка, в которую автор
// свёл ключевую конструкцию ситуации: «Bom dia / Boa tarde / Boa noite —
// приветствие по времени суток». Это ровно то, что стоит показать картинкой:
// не список фраз (он и так весь в уроке), а развилка, по которой фраза
// выбирается. Пересказывать таблицей те же фразы, что лежат ниже карточками,
// смысла нет — схема должна показывать то, чего в тексте не видно.
//
// ЕСЛИ ФОРМУЛА НЕ РАЗБИРАЕТСЯ (одна часть, нечего противопоставлять) — вместо
// строки-развилки собираем короткую таблицу первых фраз темы с чтением. Лучше
// скромная опора, чем пустой урок.
// ─────────────────────────────────────────────────────────────────────────────

import { formulaStrip, formTable, type FormulaChunk } from './lessonFigures'
import type { CourseFigures, UnitFigure } from './languageCourse'
import type { Phrase, SurvivalBook, SurvivalTheme, ThemeNote } from './survivalPhrases'

/** Тире, которым в формулах отделено пояснение. Только с пробелами: внутри
 *  корейских форм вроде `-아/어 주세요` дефис значит совсем другое. */
const DASH = ' — '

/**
 * Формула темы → блоки схемы.
 *
 * Разбор идёт сверху вниз: сначала `;` делит формулу на независимые части,
 * потом часть с несколькими пояснениями делится по запятой, и уже внутри
 * каждого куска отделяется пояснение. Термины через `/` («Bom dia / Boa
 * tarde») разворачиваются в отдельные блоки с общим пояснением — иначе
 * развилка выглядела бы одним блоком и перестала быть развилкой.
 */
export function parseFormula(formula: string): FormulaChunk[] {
  const chunks: FormulaChunk[] = []

  for (const part of formula.split(/\s*;\s*/).filter(Boolean)) {
    // Запятая делит на пары только там, где пар действительно несколько и нет
    // скобок: в «китайский (일, 이, 삼) — для денег» запятые принадлежат скобке.
    const many = part.split(DASH).length > 2 && !part.includes('(')
    const pieces = many ? part.split(/,\s+/) : [part]

    for (const piece of pieces) {
      const at = piece.indexOf(DASH)
      const term = (at >= 0 ? piece.slice(0, at) : piece).trim()
      const gloss = at >= 0 ? piece.slice(at + DASH.length).trim() : undefined
      if (!term) continue
      // «A / B / C — пояснение»: каждый вариант отдельным блоком, пояснение общее.
      const variants = term.includes(' / ') ? term.split(' / ') : [term]
      variants.forEach((v, i) => {
        const text = v.trim()
        if (text) chunks.push({ text, note: gloss, key: chunks.length === 0 && i === 0 })
      })
    }
  }

  return chunks
}

/** Первое предложение заметки — подпись под схемой. Целиком она слишком длинна. */
function firstSentence(text: string): string | undefined {
  const s = text.trim().split(/(?<=[.!?])\s+/)[0]
  return s && s.length > 15 ? s : undefined
}

/**
 * Запасная схема, когда формула не разложилась на развилку.
 *
 * ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ: таблицы «фраза — перевод». Ровно эти шесть строк
 * конспект уже печатает блоком «Костяк темы», и картинка, повторяющая текст
 * сразу над собой, не добавляет ничего.
 *
 * Берём то, чего в конспекте НЕТ: сначала фразу в живом предложении (`ex` есть
 * почти у всех фраз английского, корейского и японского), потом — пояснение
 * «когда так говорят» (`note`, оно реже, но у португальского примеров нет
 * вовсе). Если нет ни того, ни другого, отдаём обычную таблицу: скромная
 * опора лучше пустого урока.
 */
function fallbackTable(theme: SurvivalTheme, list: Phrase[], hasReading: boolean): string {
  const withEx = list.filter(p => p.ex?.term)
  if (withEx.length >= 2) {
    return formTable(
      theme.title,
      ['Фраза', 'В живой речи'],
      withEx.slice(0, 5).map(p => [p.term, p.ex!.ru]),
      { note: 'Отдельная фраза запоминается хуже, чем фраза внутри предложения' },
    )
  }

  const withNote = list.filter(p => p.note)
  if (withNote.length >= 2) {
    return formTable(
      theme.title,
      ['Фраза', 'Когда так говорят'],
      withNote.slice(0, 5).map(p => [p.term, p.note!]),
      { note: 'Фразы темы близки по смыслу — разводит их именно уместность' },
    )
  }

  const rows = list.slice(0, 6).map(p =>
    hasReading ? [p.term, p.reading ?? '', p.ru] : [p.term, p.ru])
  return formTable(
    theme.title,
    hasReading ? ['Фраза', 'Чтение', 'Перевод'] : ['Фраза', 'Перевод'],
    rows,
    { note: 'С этих фраз тема начинается — остальные держатся на них' },
  )
}

/**
 * Схемы всех тем одного разговорника.
 *
 * Возвращает карту по shortId — ровно в том виде, в каком её ждёт сборщик
 * курса (см. CourseFigures).
 */
export function survivalFigures(
  book: SurvivalBook,
  themes: SurvivalTheme[],
  shortIdOf: (theme: SurvivalTheme) => string,
): CourseFigures {
  const out: CourseFigures = {}

  for (const theme of themes) {
    const list = book.phrases[theme.id] ?? []
    if (!list.length) continue
    const note: ThemeNote | undefined = book.notes[theme.id]

    const chunks = note?.formula ? parseFormula(note.formula) : []
    // Один блок — это не схема, а просто фраза: показывать её картинкой незачем.
    const hasReading = list.some(p => !!p.reading)

    const figure: UnitFigure = chunks.length >= 2
      ? {
          after: 2,
          caption: 'Ключевая развилка темы',
          src: formulaStrip(theme.title, chunks.slice(0, 5), {
            note: note?.note ? firstSentence(note.note) : undefined,
          }),
        }
      : {
          after: 2,
          caption: 'Фразы темы в деле',
          src: fallbackTable(theme, list, hasReading),
        }

    out[shortIdOf(theme)] = [figure]
  }

  return out
}
