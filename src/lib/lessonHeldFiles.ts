// Файлы урока, убранные только в редакторе (концепт: Figma «Искра», стр. 23).
//
// Защита данных (триггер lessons_preserve_nonempty) не даёт сохранению
// опустошить lessons.materials: пустой объект от клиента не доказывает, что
// учитель хотел убрать файлы. Раньше такое сохранение падало целиком
// («Не сохранился курс»), даже когда учитель просто менял файл: старый уже
// убран, новый ещё не вставлен.
//
// Теперь автосохранение у такого урока пишет прежние, подтверждённые сервером
// файлы, а редактор показывает алерт «Файлы убраны только в редакторе».
// Вставили новый файл — удержание снимается само. «Убрать у учеников» кладёт
// пару «short_id:materials» в одобренные: следующее сохранение пишет пустые
// файлы с заголовком X-Iskra-Explicit-Clear, и триггер пропускает именно её.
// Прежняя версия строки остаётся в iskra_history.row_versions.

import type { CourseEdData, CELesson } from '../pages/teacher/TeacherCourseEditorPage'
import type { LessonFiles } from './lessonFiles'
import { lessonShortIdMap } from './lessonReferences'
import { isEmptyLessonValue } from './lessonExplicitClears'

type Row = Record<string, unknown>

/** Подтверждённые сервером файлы уроков: short_id → materials. */
export function confirmedLessonFiles(rows: readonly Row[] | null | undefined): Map<string, unknown> {
  const out = new Map<string, unknown>()
  for (const row of rows ?? []) if (typeof row.short_id === 'string') out.set(row.short_id, row.materials)
  return out
}

export const filesClearPair = (shortId: string) => `${shortId}:materials`

/** Файлы, которые у учеников ещё есть, хотя в редакторе их убрали; null — держать нечего. */
export function heldLessonFiles(shortId: string | undefined, files: LessonFiles | undefined,
  confirmed: ReadonlyMap<string, unknown>, approved: ReadonlySet<string>): LessonFiles | null {
  if (!shortId || !isEmptyLessonValue(files)) return null
  const server = confirmed.get(shortId)
  if (isEmptyLessonValue(server) || typeof server !== 'object') return null
  if (approved.has(filesClearPair(shortId))) return null
  return server as LessonFiles
}

/** Курс для записи: у удержанных уроков вместо пустых файлов — прежние. */
export function withHeldLessonFiles(c: CourseEdData, confirmed: ReadonlyMap<string, unknown>, approved: ReadonlySet<string>): CourseEdData {
  if (!confirmed.size) return c
  const shortIds = lessonShortIdMap(c.dbCourseId ?? c.id, c.lessons)
  let changed = false
  const lessons = c.lessons.map((lesson: CELesson) => {
    const held = heldLessonFiles(shortIds[lesson.id], lesson.files, confirmed, approved)
    if (!held) return lesson
    changed = true
    return { ...lesson, files: structuredClone(held) }
  })
  return changed ? { ...c, lessons } : c
}

/** Одобренные очистки, которые уже дошли до сервера (там файлов нет), больше не нужны. */
export function pruneApprovedFileClears(approved: Set<string>, confirmed: ReadonlyMap<string, unknown>) {
  for (const pair of [...approved]) {
    const shortId = pair.slice(0, -':materials'.length)
    if (confirmed.has(shortId) && isEmptyLessonValue(confirmed.get(shortId))) approved.delete(pair)
  }
}

/** Пары для заголовка: файлы пусты в записи, были на сервере, и учитель сам нажал «Убрать у учеников». */
export function approvedFileClears(confirmedRows: readonly Row[], edited: readonly Row[], approved: ReadonlySet<string>): string[] {
  const confirmed = confirmedLessonFiles(confirmedRows)
  const out: string[] = []
  for (const row of edited) {
    const shortId = row.short_id
    if (typeof shortId !== 'string' || !approved.has(filesClearPair(shortId))) continue
    if (!Object.prototype.hasOwnProperty.call(row, 'materials') || !isEmptyLessonValue(row.materials)) continue
    if (!isEmptyLessonValue(confirmed.get(shortId))) out.push(filesClearPair(shortId))
  }
  return out
}
