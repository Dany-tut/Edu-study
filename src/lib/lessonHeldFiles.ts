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
import { courseAtomicRows } from './courseAtomicRows'
import { paragraphsToTheory } from './theoryImages'
import type { LessonParagraph } from '../data/lessonContent'

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

// ─── Остальные защищённые поля урока ─────────────────────────────────────────
// Та же схема, что у файлов: опустевшее в редакторе поле, которое у учеников
// ещё заполнено, автосохранение пишет прежним значением; стереть его у учеников
// можно только кнопкой «Убрать у учеников». Расшифровку редактор сам отбрасывает
// при смене видео — её держим флагом keepTranscript; ученику она не видна, пока
// ссылка не совпадает с видео урока (LessonPage).

export type HeldPart = 'timecodes' | 'test_tasks' | 'content.paragraphs' | 'content.transcript' | 'content.selfCheck' | 'content.cardSetId' | 'content.cardGroupId'
export const HELD_PARTS: readonly HeldPart[] = ['timecodes', 'test_tasks', 'content.paragraphs', 'content.transcript', 'content.selfCheck', 'content.cardSetId', 'content.cardGroupId']

export const partClearPair = (shortId: string, part: HeldPart) => `${shortId}:${part}`

function partValue(row: Row | undefined, part: HeldPart): unknown {
  if (!row) return undefined
  if (part.startsWith('content.')) {
    const content = row.content
    return content && typeof content === 'object' ? (content as Row)[part.slice('content.'.length)] : undefined
  }
  return row[part]
}

/** Поле есть у учеников, пусто в редакторе и учитель не разрешал его стирать. */
export function heldParts(shortId: string, editedRow: Row, confirmedRow: Row | undefined, approved: ReadonlySet<string>): HeldPart[] {
  if (!confirmedRow) return []
  return HELD_PARTS.filter(part => isEmptyLessonValue(partValue(editedRow, part))
    && !isEmptyLessonValue(partValue(confirmedRow, part))
    && !approved.has(partClearPair(shortId, part)))
}

/** Вернуть в урок редактора прежнее значение поля из подтверждённой строки. */
export function restoreLessonPart(lesson: CELesson, part: HeldPart, confirmedRow: Row, forSave = false): CELesson {
  const value = structuredClone(partValue(confirmedRow, part))
  switch (part) {
    // В копии для записи — с флагом: сериализатор иначе отбросит расшифровку чужого видео.
    case 'content.transcript': return { ...lesson, transcript: value as CELesson['transcript'], ...(forSave ? { keepTranscript: true } : {}) }
    case 'timecodes': return { ...lesson, timecodes: value as CELesson['timecodes'] }
    case 'test_tasks': return { ...lesson, testTasks: value as CELesson['testTasks'] }
    case 'content.selfCheck': return { ...lesson, selfCheck: value as CELesson['selfCheck'] }
    case 'content.cardSetId': return { ...lesson, recapCardSetId: value as string }
    case 'content.cardGroupId': return { ...lesson, recapCardGroupId: value as string }
    case 'content.paragraphs': {
      const all = Array.isArray(value) ? value as LessonParagraph[] : []
      const theory = paragraphsToTheory(all.filter(p => p?.origin !== 'recap'))
      const recap = all.filter(p => p?.origin === 'recap')
      return { ...lesson, theory: theory.theory || undefined, theoryImages: theory.images, recapParagraphs: recap.length ? recap : undefined }
    }
  }
}

/** Редакторские строки уроков для сравнения с подтверждённым снимком. */
function editorRows(c: CourseEdData): Row[] {
  if (!c.modules.length) return []
  try { return courseAtomicRows(c, '', c.modules, {}).lessonRows } catch { return [] }
}

/** Курс для записи: у удержанных уроков опустевшие поля — прежние. */
export function withHeldLessonParts(c: CourseEdData, confirmedRows: readonly Row[] | null | undefined, approved: ReadonlySet<string>): CourseEdData {
  if (!confirmedRows?.length) return c
  const confirmed = new Map(confirmedRows.map(row => [row.short_id as string, row]))
  const shortIds = lessonShortIdMap(c.dbCourseId ?? c.id, c.lessons)
  const rows = new Map(editorRows(c).map(row => [row.short_id as string, row]))
  let changed = false
  const lessons = c.lessons.map(lesson => {
    const shortId = shortIds[lesson.id]
    const row = shortId ? rows.get(shortId) : undefined
    const base = shortId ? confirmed.get(shortId) : undefined
    if (!shortId || !row || !base) return lesson
    const held = heldParts(shortId, row, base, approved)
    if (!held.length) return lesson
    changed = true
    return held.reduce((next, part) => restoreLessonPart(next, part, base, true), lesson)
  })
  return changed ? { ...c, lessons } : c
}

/** Удержанные поля каждого урока — для алертов редактора. */
export function heldPartsByLesson(c: CourseEdData, confirmedRows: readonly Row[] | null | undefined, approved: ReadonlySet<string>): Map<string, HeldPart[]> {
  const out = new Map<string, HeldPart[]>()
  if (!confirmedRows?.length) return out
  const confirmed = new Map(confirmedRows.map(row => [row.short_id as string, row]))
  const shortIds = lessonShortIdMap(c.dbCourseId ?? c.id, c.lessons)
  const rows = new Map(editorRows(c).map(row => [row.short_id as string, row]))
  for (const lesson of c.lessons) {
    const shortId = shortIds[lesson.id]
    const row = shortId ? rows.get(shortId) : undefined
    const held = shortId && row ? heldParts(shortId, row, confirmed.get(shortId), approved) : []
    if (held.length) out.set(lesson.id, held)
  }
  return out
}

/** Пары для заголовка X-Iskra-Explicit-Clear по разрешённым полям; content целиком — когда опустел весь. */
export function approvedPartClears(confirmedRows: readonly Row[], edited: readonly Row[], approved: ReadonlySet<string>): string[] {
  const confirmed = new Map(confirmedRows.map(row => [row.short_id as string, row]))
  const out: string[] = []
  for (const row of edited) {
    const shortId = row.short_id
    if (typeof shortId !== 'string') continue
    const base = confirmed.get(shortId)
    if (!base) continue
    for (const part of HELD_PARTS) {
      const pair = partClearPair(shortId, part)
      if (approved.has(pair) && isEmptyLessonValue(partValue(row, part)) && !isEmptyLessonValue(partValue(base, part))) out.push(pair)
    }
    if (Object.prototype.hasOwnProperty.call(row, 'content') && isEmptyLessonValue(row.content) && !isEmptyLessonValue(base.content)) {
      const nonEmptyKeys = Object.keys(base.content as Row).filter(key => !isEmptyLessonValue((base.content as Row)[key]))
      if (nonEmptyKeys.every(key => approved.has(`${shortId}:content.${key}`))) out.push(`${shortId}:content`)
    }
  }
  return out
}

/** Разрешения, уже дошедшие до сервера, убрать: следующий раз опять спросим. */
export function pruneApprovedPartClears(approved: Set<string>, confirmedRows: readonly Row[] | null | undefined) {
  if (!confirmedRows?.length) return
  const confirmed = new Map(confirmedRows.map(row => [row.short_id as string, row]))
  for (const pair of [...approved]) {
    const at = pair.indexOf(':')
    const shortId = pair.slice(0, at), part = pair.slice(at + 1) as HeldPart
    if (!HELD_PARTS.includes(part) || !confirmed.has(shortId)) continue
    if (isEmptyLessonValue(partValue(confirmed.get(shortId), part))) approved.delete(pair)
  }
}

/** Расшифровка на сервере сделана с той же записи, что сейчас в уроке, — её можно просто вернуть. */
export function transcriptMatchesVideo(confirmedRow: Row | undefined, videoUrl: string | undefined): boolean {
  const transcript = partValue(confirmedRow, 'content.transcript') as { source?: unknown } | undefined
  return !!transcript && transcript.source === (videoUrl?.trim() || '')
}
