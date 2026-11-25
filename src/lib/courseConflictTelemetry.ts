import type { CourseConflict } from './courseConflictComparison'

// Окно «Курс изменили в другом месте» — штатная сверка, а не ошибка, поэтому
// раньше оно не попадало в аналитику: 25.11.2026 окно возвращалось после
// «Взять из базы» (старая копия черновика из другой вкладки), и узнали мы об
// этом только со скриншота. Здесь — без содержимого курса: только счётчики и
// названия полей, по которым разошлись версии.

/** Откуда редактор взял версию вкладки при открытии. */
export type ConflictTabSource = 'live' | 'ce_session' | 'session_draft' | 'durable_copy'

export function conflictSummary(conflict: CourseConflict) {
  const fields = new Set<string>()
  for (const lesson of conflict.lessonFields) for (const field of lesson.fields) fields.add(field.label)
  for (const field of conflict.courseFields) fields.add(field.label)
  return {
    lessons_changed: conflict.lessonFields.length,
    fields: [...fields].slice(0, 12),
    course_fields: conflict.courseFields.length,
    added: conflict.added.length,
    renamed: conflict.renamed.length,
    local_new: conflict.localNew.length,
    title_changed: !!conflict.titleChange,
    status_changed: !!conflict.statusChange,
    audience_changed: conflict.audienceChanged,
    known_intent: conflict.knownIntent,
    ...(conflict.code ? { code: conflict.code } : {}),
  }
}

// «Взять из базы» перезагружает вкладку; отметка в sessionStorage переживает
// перезагрузку и позволяет понять, что то же окно вернулось сразу после отказа.
const DISCARD_MARK = 'iskra:course-conflict-discarded:'
const REPEAT_WINDOW_MS = 30 * 60_000

export function markConflictDiscarded(courseKey: string) {
  try { sessionStorage.setItem(DISCARD_MARK + courseKey, String(Date.now())) } catch { /* blocked storage */ }
}

/** Сколько мс назад в этой вкладке нажали «Взять из базы» для курса, или null. */
export function conflictDiscardedAgo(courseKey: string): number | null {
  try {
    const at = Number(sessionStorage.getItem(DISCARD_MARK + courseKey))
    if (!at) return null
    const ago = Date.now() - at
    if (ago < 0 || ago > REPEAT_WINDOW_MS) { sessionStorage.removeItem(DISCARD_MARK + courseKey); return null }
    return ago
  } catch { return null }
}

export function clearConflictDiscarded(courseKey: string) {
  try { sessionStorage.removeItem(DISCARD_MARK + courseKey) } catch { /* blocked storage */ }
}
