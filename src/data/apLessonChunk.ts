// ─────────────────────────────────────────────────────────────────────────────
// Авторские конспекты предметных курсов — отдельным чанком
//
// Сейчас их три: AP Chemistry, «Биология клетки» и «Биология: подготовка к
// университету». Заказываем только нужный предмет по short_id урока:
// apchem-*, biocell-*, bioprep-*. Обычный урок не ждёт чужие конспекты.
// Ключи не пересекаются; одновременно прибывающие чанки дополняют общую карту.
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
type LessonChunk = 'apchem' | 'biocell' | 'bioprep'
const requests = new Map<LessonChunk, Promise<void>>()
const loaders: Record<LessonChunk, () => Promise<Record<string, ApLessonContent>>> = {
  apchem: () => import('./apChemistryLessons').then(m => m.AP_LESSON_CONTENT),
  biocell: () => import('./bioCellLessons').then(m => m.BIO_CELL_LESSON_CONTENT),
  bioprep: () => import('./bioPreULessons').then(m => m.BIO_PREU_LESSON_CONTENT),
}

/** Запасной конспект урока. undefined — чанк ещё не доехал или урок не из
 * курсов с авторским конспектом. */
export const apLessonContent = (id: string): ApLessonContent | undefined => CONTENT[id]

function loadChunk(chunk: LessonChunk): Promise<void> {
  const running = requests.get(chunk)
  if (running) return running
  const request = loaders[chunk]()
    .then(content => { CONTENT = { ...CONTENT, ...content } })
    // Сбой одного предмета не сбрасывает успешно загруженные другие предметы.
    // Повторное открытие урока может повторить только неудавшийся запрос.
    .catch(error => { requests.delete(chunk); console.error('[apLessonChunk]', error) })
  requests.set(chunk, request)
  return request
}

/** Только конспекты перечисленных уроков; без аргумента — прежняя загрузка всех.
 * Повторные и одновременные вызовы объединяются отдельно для каждого предмета. */
export function loadApLessons(lessonIds?: readonly string[]): Promise<void> {
  const chunks = lessonIds === undefined
    ? Object.keys(loaders) as LessonChunk[]
    : [...new Set(lessonIds.flatMap(id => {
      const prefix = id.split('-', 1)[0]
      return Object.prototype.hasOwnProperty.call(loaders, prefix) ? [prefix as LessonChunk] : []
    }))]
  return Promise.all(chunks.map(loadChunk)).then(() => undefined)
}
