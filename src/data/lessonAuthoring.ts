// ─────────────────────────────────────────────────────────────────────────────
// Помощники авторинга предметных курсов
//
// Конспект урока и домашка пишутся в коде (см. bioCellLessons.ts,
// bioPreULessons.ts). Без этих обёрток каждое задание — это двадцать строк
// служебной структуры вокруг двух строк смысла, и за ними перестаёт быть видно
// сам материал. Здесь собрано по одной функции на тип задания: на входе —
// только то, что придумал автор, остальное дописывается.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ. Набор родился в bioCellLessons.ts и сразу понадобился
// второму курсу слово в слово. Две копии разъехались бы на первой же правке —
// а расхождение здесь означает, что одинаковые по виду задания в двух курсах
// решаются по-разному.
//
// ВАЖНО ПРО НЕ-ВЫБОРНЫЕ ТИПЫ. У них options пуст, а correctOptionId — пустая
// строка: решатель включается по данным (pairs, sequenceItems, columns…), а не
// по типу, см. taskBodyMissing() в HomeworkFlow.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import type { LessonParagraph, HomeworkQuizQuestion, HomeworkTeacherTask } from './lessonContent'

/** Общая форма авторского урока: конспект + база домашки + хард. */
export interface AuthoredLessonContent {
  paragraphs: LessonParagraph[]
  quiz: HomeworkQuizQuestion[]
  hardTask: HomeworkTeacherTask
}

/** Абзац конспекта. */
export const p = (id: string, text: string): LessonParagraph => ({ id, text })

/** Один верный вариант. */
export const qq = (
  id: string, prompt: string, opts: string[], correctIdx: number, explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  options: opts.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
  correctOptionId: String.fromCharCode(97 + correctIdx),
  explanation,
})

/** Несколько верных вариантов. */
export const qmulti = (
  id: string, prompt: string, opts: string[], correctIdxs: number[], explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'multi',
  options: opts.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
  correctOptionId: String.fromCharCode(97 + correctIdxs[0]),
  correctOptionIds: correctIdxs.map(i => String.fromCharCode(97 + i)),
  explanation,
})

/** Сопоставление пар. */
export const qmatch = (
  id: string, prompt: string, pairs: Array<[string, string]>, explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'matching',
  options: [],
  correctOptionId: '',
  pairs: pairs.map(([left, right]) => ({ left, right })),
  explanation,
})

/** Расставить по порядку. items задаются В ПРАВИЛЬНОМ порядке — ученику они
 *  показываются перемешанными. */
export const qseq = (
  id: string, prompt: string, items: string[], explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'sequence',
  options: [],
  correctOptionId: '',
  sequenceItems: items,
  explanation,
})

/** Разложить по именованным столбцам (много предметов к одному столбцу). */
export const qsort = (
  id: string, prompt: string, columns: string[], items: Array<[string, number]>, explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'columnSort',
  options: [],
  correctOptionId: '',
  columns,
  sortItems: items.map(([text, column]) => ({ text, column })),
  explanation,
})

/** Верно / неверно / не указано — пачка утверждений. */
export const qtf = (
  id: string, prompt: string, statements: Array<[string, 'T' | 'F' | 'NG']>, explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'trueFalse',
  options: [],
  correctOptionId: '',
  statements: statements.map(([text, verdict]) => ({ text, verdict })),
  explanation,
})

/** Вписать ответ; сверяется с эталоном по смыслу (altAnswers — принимаемые
 *  формулировки, а не синонимы ради синонимов). */
export const qfill = (
  id: string, prompt: string, reference: string, alts: string[], explanation: string,
): HomeworkQuizQuestion => ({
  id,
  prompt,
  type: 'fill',
  options: [],
  correctOptionId: '',
  referenceAnswer: reference,
  altAnswers: alts,
  explanation,
})

// ─── Схемы конспекта ─────────────────────────────────────────────────────────

/**
 * Схема, встающая в конспект после абзаца `after`.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ ТЕКСТА, А НЕ ПРЯМО В paragraphs. Схема — это вызов
 * генератора на полторы строки данных, и вставленная между абзацами она рвёт
 * текст конспекта пополам: читать подряд то, что видит ученик, становится
 * нельзя. Поэтому текст лежит сплошняком, схемы — отдельным списком, а место
 * указывается ссылкой на абзац. Тот же приём, что у языковых курсов
 * (LanguageCourseSpec.figures).
 *
 * `caption` становится подписью под схемой: в модели это `text` абзаца с
 * картинкой (см. LessonParagraph.image).
 */
export interface LessonFigure {
  /** id абзаца, ПОСЛЕ которого встаёт схема. */
  after: string
  caption: string
  /** data-URI от генератора (bioFigures.ts / lessonFigures.ts). */
  src: string
}

/**
 * Разложить схемы по урокам.
 *
 * Схема с неизвестным `after` не теряется молча, а встаёт в конец конспекта и
 * пишет в консоль: опечатка в id абзаца иначе выглядит как «картинку почему-то
 * не нарисовали», и искать её пришлось бы глазами по всем урокам.
 */
export function withFigures(
  lessons: Record<string, AuthoredLessonContent>,
  figures: Record<string, LessonFigure[]>,
): Record<string, AuthoredLessonContent> {
  const out: Record<string, AuthoredLessonContent> = {}
  for (const [id, lesson] of Object.entries(lessons)) {
    const figs = figures[id]
    if (!figs?.length) { out[id] = lesson; continue }
    const known = new Set(lesson.paragraphs.map(par => par.id))
    const lost = figs.filter(f => !known.has(f.after))
    if (lost.length > 0) {
      console.warn(`[withFigures] ${id}: нет абзаца ${lost.map(f => `«${f.after}»`).join(', ')} — схема ушла в конец`)
    }
    const paragraphs = lesson.paragraphs.flatMap(par => [
      par,
      ...figs.filter(f => f.after === par.id).map((f, i) => ({ id: `${par.id}-fig${i + 1}`, text: f.caption, image: f.src })),
    ])
    out[id] = { ...lesson, paragraphs: [...paragraphs, ...lost.map((f, i) => ({ id: `lost-fig${i + 1}`, text: f.caption, image: f.src }))] }
  }
  return out
}

/** Хард-задание: уходит преподавателю на проверку. */
export const hard = (
  topic: string, prompt: string, teacherNote: string, placeholder: string,
): HomeworkTeacherTask => ({
  topic,
  prompt,
  teacherNote,
  placeholder,
  acceptedFormats: ['Текст в поле', 'Фото рукописного решения', 'Рисунок на доске'],
})
