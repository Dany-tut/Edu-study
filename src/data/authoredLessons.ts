// ─────────────────────────────────────────────────────────────────────────────
// Авторский конспект урока — единая точка поиска
//
// Конспекты предметных курсов написаны в коде, а не в БД: `lessons.content`
// остаётся пустым, пока урок не отредактировали руками (так же устроена
// AP-химия). Значит КАЖДОЕ место, которое показывает конспект, обязано знать
// про запасной путь — иначе урок выглядит пустым именно там, куда заглянул
// человек.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Таких мест три: страница урока у ученика
// (apLessonChunk.ts), редактор урока в Конструкторе и редактор курса. Цепочка
// «AP ?? Биология клетки ?? Биология pre-U» была написана дважды и в третьем
// месте просто забыта — редактор курса открывал биологию с пустым конспектом,
// хотя текст был. Теперь цепочка одна, и добавление курса правит один файл.
// ─────────────────────────────────────────────────────────────────────────────
import { AP_LESSON_CONTENT } from './apChemistryLessons'
import { BIO_CELL_LESSON_CONTENT } from './bioCellLessons'
import { BIO_PREU_LESSON_CONTENT } from './bioPreULessons'
import type { AuthoredLessonContent } from './lessonAuthoring'

/** Конспект и домашка урока, написанные в коде. undefined — урок не из этих курсов. */
export function authoredLesson(shortId: string | null | undefined): AuthoredLessonContent | undefined {
  if (!shortId) return undefined
  return AP_LESSON_CONTENT[shortId] ?? BIO_CELL_LESSON_CONTENT[shortId] ?? BIO_PREU_LESSON_CONTENT[shortId]
}
