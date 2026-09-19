// ─────────────────────────────────────────────────────────────────────────────
// Авторские конспекты предметных курсов — отдельным чанком
//
// Сейчас их три: AP Chemistry, «Биология клетки» и «Биология: подготовка к
// университету». Все грузятся одним заказом и ложатся в одну карту по short_id
// урока — ключи не пересекаются (apchem-*, biocell-*, bioprep-*), поэтому
// разводить их по разным чанкам незачем: урок всё равно открывается по одному
// ключу.
//
// ЗАЧЕМ. Это ЗАПАСНОЙ конспект для уроков, которым его не написали в
// Конструкторе: девяносто три килобайта текста про моль и стехиометрию, нужные
// одному курсу и только внутри открытого урока. Статическим импортом они ехали
// во входной чанк всем — включая того, у кого химии нет вовсе.
//
// ЧИТАЕТСЯ СИНХРОННО, ГРУЗИТСЯ ЗАРАНЕЕ. getLessonDetail() зовут из рендера,
// сделать его async нельзя. Поэтому чанк заказывается там же, где урок ждёт
// свою тяжёлую половину из БД (см. ensureLessonsHeavy в studentDataStore):
// к моменту, когда конспект есть чем рисовать, таблица уже на месте.
//
// ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ ФУНКЦИЯ В lessonContent.ts: тот импортирует
// studentDataStore, и заказ загрузки из стора замкнул бы их в кольцо.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApLessonContent } from './apChemistryLessons'

let CONTENT: Record<string, ApLessonContent> = {}
let promise: Promise<unknown> | null = null

/** Запасной конспект урока. undefined — чанк ещё не доехал или урок не из
 *  курсов с авторским конспектом. */
export const apLessonContent = (id: string): ApLessonContent | undefined => CONTENT[id]

/** Заказать чанк. Повторные вызовы бесплатны, ошибка не роняет урок. */
export function loadApLessons(): Promise<unknown> {
  promise ??= Promise.all([
    import('./apChemistryLessons'), import('./bioCellLessons'), import('./bioPreULessons'),
  ])
    .then(([chem, cell, prep]) => {
      CONTENT = {
        ...chem.AP_LESSON_CONTENT,
        ...cell.BIO_CELL_LESSON_CONTENT,
        ...prep.BIO_PREU_LESSON_CONTENT,
      }
    })
    // Без запасного конспекта урок покажет описание из БД, как любой другой:
    // ронять из-за не доехавшего чанка нечего.
    .catch(e => { console.error('[apLessonChunk]', e); promise = null })
  return promise
}
