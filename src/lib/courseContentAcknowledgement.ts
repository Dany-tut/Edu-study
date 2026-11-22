import type { CourseContentSnapshot } from './courseContentDelta'
import type { ConfirmedBaseline, Scope } from './courseConfirmedBaseline'
import { mergeConfirmedFields } from './courseContentPreservation'

type Row = Record<string, unknown>
export type ExpectedContentRoster = {
  modules: Array<{ id: string; label: string; position: number }>
  lessons: Array<{ id: string; shortId: string; moduleId: string | null }>
}
const courseKeys = new Set(['title', 'subject', 'level', 'description', 'status', 'color', 'bg', 'seed_stamp', 'number_start'])
const lessonKeys = new Set(['short_id', 'module_id', 'title', 'position', 'lesson_number', 'youtube_url', 'timecodes', 'chapter_variants',
  'description', 'content', 'kind', 'test_tasks', 'materials', 'scheduled_date', 'scheduled_time', 'scheduled_duration',
  'rec_date', 'rec_time', 'rec_duration', 'lesson_sched_manual', 'delivery_mode', 'homework'])
const lessonScalarKeys = new Set(['title', 'description', 'module_id', 'position', 'lesson_number', 'scheduled_date', 'scheduled_time',
  'scheduled_duration', 'rec_date', 'rec_time', 'rec_duration', 'lesson_sched_manual', 'delivery_mode'])
const homeworkKeys = new Set(['hwTitle', 'hwTarget', 'hwDate', 'hwTime', 'hwDateManual', 'recHwTitle', 'recHwTarget', 'recHwDate', 'recHwTime', 'recHwDateManual'])
const contentKeys = new Set(['cardSetId', 'cardGroupId'])
const integerKeys = new Set(['number_start', 'position', 'lesson_number', 'scheduled_duration', 'rec_duration'])
const timeKeys = new Set(['scheduled_time', 'rec_time'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const own = (row: Row, key: string) => Object.prototype.hasOwnProperty.call(row, key)
function record(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function pick(row: Row, allowed: Set<string>): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, structuredClone(value)]))
}
function stampKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/)
  if (!m) return null
  const year = +m[1], month = +m[2], day = +m[3], hour = +m[4], minute = +m[5], second = +m[6]
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${(m[7] ?? '').padEnd(6, '0')}Z`
}

/** Prepare the immutable FULL-path representation of exactly current-owned
 * writable keys. Canonical defaults never erase unhydrated confirmed values.
 * Returned identity fields are snapshot bookkeeping, not permission to upsert IDs.
 */
export function prepareConfirmedSnapshot(before: CourseContentSnapshot, current: CourseContentSnapshot): CourseContentSnapshot {
  const previous = new Map(before.lessons.map(row => [row.short_id, row]))
  return {
    course: mergeConfirmedFields(before.rawCourse ?? before.course, pick(before.course, courseKeys), pick(current.course, courseKeys)),
    modules: current.modules.map(({ id, label, position }) => ({ id, label, position })),
    lessons: current.lessons.map(row => {
      const old = previous.get(row.short_id)
      const raw = before.rawLessons?.[row.short_id] ?? old ?? {}
      return {
        ...mergeConfirmedFields(raw, pick(old ?? {}, lessonKeys), pick(row, lessonKeys)),
        id: row.id, short_id: row.short_id,
      }
    }),
  }
}

function uniqueRows<T>(rows: readonly T[], key: (row: T) => unknown): Map<string, T> | null {
  const result = new Map<string, T>()
  for (const row of rows) {
    const id = key(row)
    if (typeof id !== 'string' || !id || result.has(id)) return null
    result.set(id, row)
  }
  return result
}
function timeKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/)
  if (!match || +match[1] > 23 || +match[2] > 59 || +(match[3] ?? '0') > 59) return null
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}.${(match[4] ?? '').padEnd(6, '0')}`
}
function sameScalar(actual: unknown, requested: unknown, key: string): boolean {
  if (actual === undefined || (typeof actual === 'object' && actual !== null)) return false
  if (Object.is(actual, requested ?? null)) return true
  if (timeKeys.has(key)) {
    const normalized = timeKey(actual)
    return normalized !== null && normalized === timeKey(requested)
  }
  return integerKeys.has(key) && typeof actual === 'number' && Number.isSafeInteger(actual)
    && typeof requested === 'string' && /^-?\d+$/.test(requested) && Number(requested) === actual
}
function scalarEcho(raw: Row, canonical: Row, echo: unknown, allowed: Set<string>): boolean {
  if (!record(echo)) return false
  for (const [key, value] of Object.entries(echo)) {
    if (!allowed.has(key) || !sameScalar(value, canonical[key], key)) return false
    Object.defineProperty(raw, key, { value: structuredClone(value), writable: true, configurable: true, enumerable: true })
  }
  return true
}

/** Advance from the immutable DISPATCHED snapshots, never current editor state.
 * The explicit expected roster describes actual server effects (e.g. unchanged
 * delta modules retain RAW positions10/20, not canonical0/1). Unknown new lesson
 * UUIDs, incomplete ACKs or unsupported scalar echoes disable future deltas.
 */
export function advanceConfirmedContent(
  base: ConfirmedBaseline<CourseContentSnapshot> | null,
  requestCanonical: CourseContentSnapshot | null,
  requestPreserved: CourseContentSnapshot | null,
  acknowledgement: unknown,
  currentScope: Scope,
  expected: ExpectedContentRoster,
): ConfirmedBaseline<CourseContentSnapshot> | null {
  try {
    if (!base || !requestCanonical || !requestPreserved || !record(acknowledgement)
      || acknowledgement.full_snapshot_confirmed !== true || acknowledgement.course_id !== base.courseId
      || !uuid.test(base.courseId) || !uuid.test(base.ownerId) || base.ownerId !== currentScope.ownerId
      || base.token.scope.ownerId !== currentScope.ownerId || base.token.scope.authEpoch !== currentScope.authEpoch
      || base.token.courseShortId !== base.courseShortId) return null
    const stamp = stampKey(acknowledgement.stamp), beforeStamp = stampKey(base.stamp)
    if (!stamp || !beforeStamp || stamp < beforeStamp
      || !Array.isArray(acknowledgement.module_witness) || !Array.isArray(acknowledgement.lesson_witness)) return null
    if (acknowledgement.course_updated_at !== undefined) {
      const courseStamp = stampKey(acknowledgement.course_updated_at)
      if (!courseStamp || courseStamp > stamp) return null
    }
    const modules = uniqueRows(expected.modules, row => row.id)
    const lessons = uniqueRows(expected.lessons, row => row.id), refs = uniqueRows(expected.lessons, row => row.shortId)
    if (!modules || !lessons || !refs
      || expected.modules.some(m => !uuid.test(m.id) || typeof m.label !== 'string' || !Number.isInteger(m.position))
      || expected.lessons.some(l => !uuid.test(l.id) || (l.moduleId !== null && !modules.has(l.moduleId)))) return null
    const returnedModules = uniqueRows(acknowledgement.module_witness, row => record(row) ? row.id : null)
    const returnedLessons = uniqueRows(acknowledgement.lesson_witness, row => record(row) ? row.id : null)
    const returnedRefs = uniqueRows(acknowledgement.lesson_witness, row => record(row) ? row.short_id : null)
    if (!returnedModules || !returnedLessons || !returnedRefs || returnedModules.size !== modules.size
      || returnedLessons.size !== lessons.size || returnedRefs.size !== lessons.size) return null
    for (const [id, module] of modules) {
      const actual = returnedModules.get(id)
      if (!record(actual) || actual.label !== module.label || actual.position !== module.position) return null
    }
    for (const [id, lesson] of lessons) {
      const actual = returnedLessons.get(id)
      if (!record(actual) || actual.short_id !== lesson.shortId || actual.module_id !== lesson.moduleId) return null
      const updated = stampKey(actual.updated_at)
      if (!updated || updated > stamp) return null
    }
    for (const snapshot of [requestCanonical, requestPreserved]) {
      if (!record(snapshot.course) || Object.keys(snapshot.course).some(key => !courseKeys.has(key))) return null
      const snapshotModules = uniqueRows(snapshot.modules, row => row.id)
      const snapshotLessons = uniqueRows(snapshot.lessons, row => row.id), snapshotRefs = uniqueRows(snapshot.lessons, row => row.short_id)
      if (!snapshotModules || !snapshotLessons || !snapshotRefs || snapshotModules.size !== modules.size
        || snapshotLessons.size !== lessons.size || snapshotRefs.size !== lessons.size) return null
      for (const [id, module] of modules) {
        const actual = snapshotModules.get(id)
        if (!actual || actual.label !== module.label) return null
      }
      for (const [id, lesson] of lessons) {
        const actual = snapshotLessons.get(id)
        if (!actual || actual.short_id !== lesson.shortId || Object.keys(actual).some(key => key !== 'id' && !lessonKeys.has(key))
          || !own(actual, 'module_id') || (actual.module_id !== null && !modules.has(actual.module_id as string))) return null
        if (snapshot === requestPreserved && actual.module_id !== lesson.moduleId) return null
      }
    }
    const canonical = structuredClone(requestCanonical)
    const rawCourse = pick(requestPreserved.course, courseKeys)
    const rawLessons: Record<string, Row> = Object.fromEntries(requestPreserved.lessons.map(row => [row.short_id,
      { ...pick(row, lessonKeys), id: row.id, short_id: row.short_id }]))
    const canonicalRows = new Map(canonical.lessons.map(row => [row.short_id, row]))
    if (acknowledgement.applied_course_patch !== undefined
      && !scalarEcho(rawCourse, canonical.course, acknowledgement.applied_course_patch, courseKeys)) return null
    if (acknowledgement.applied_lesson_patches !== undefined) {
      if (!Array.isArray(acknowledgement.applied_lesson_patches)) return null
      const seen = new Set<string>()
      for (const patch of acknowledgement.applied_lesson_patches) {
        if (!record(patch) || typeof patch.id !== 'string' || typeof patch.short_id !== 'string'
          || seen.has(patch.id) || lessons.get(patch.id)?.shortId !== patch.short_id) return null
        seen.add(patch.id)
        const raw = rawLessons[patch.short_id], requested = canonicalRows.get(patch.short_id)!
        if (!scalarEcho(raw, requested, patch.set ?? {}, lessonScalarKeys)) return null
        for (const [field, allowed] of [['homework', homeworkKeys], ['content', contentKeys]] as const) {
          const echo = patch[`${field}_set`] ?? {}
          if (!record(echo) || !record(raw[field]) || !record(requested[field])
            || !scalarEcho(raw[field] as Row, requested[field] as Row, echo, allowed)) return null
        }
        if (raw.module_id !== lessons.get(patch.id)!.moduleId) return null
      }
    }
    if (acknowledgement.applied_lesson_deletes !== undefined) {
      if (!Array.isArray(acknowledgement.applied_lesson_deletes)) return null
      const deleted = uniqueRows(acknowledgement.applied_lesson_deletes, row => record(row) ? row.id : null)
      const old = new Map(base.lessons.map(row => [row.id, row]))
      if (!deleted || [...deleted].some(([id, row]) => !record(row) || lessons.has(id) || old.get(id)?.shortId !== row.short_id)) return null
    }
    // Original module ops carry expectations from dispatch; witness matching
    // above is authoritative for the final numeric positions and complete scope.
    if (acknowledgement.applied_module_ops !== undefined) {
      if (!Array.isArray(acknowledgement.applied_module_ops)) return null
      const ops = uniqueRows(acknowledgement.applied_module_ops, row => record(row) ? row.id : null)
      if (!ops) return null
      for (const [id, op] of ops) {
        if (!record(op)) return null
        if (op.op === 'delete') { if (modules.has(id) || !base.modules.some(m => m.id === id)) return null }
        else if (op.op === 'patch') {
          const actual = modules.get(id)
          if (!actual || !record(op.set) || Object.entries(op.set).some(([key, value]) =>
            !['label', 'position'].includes(key) || value !== actual[key as 'label' | 'position'])) return null
        } else return null
      }
    }
    return {
      ...structuredClone(base), stamp: acknowledgement.stamp as string,
      serialized: { ...canonical, rawCourse, rawLessons },
      modules: structuredClone(expected.modules),
      lessons: expected.lessons.map(lesson => ({ ...lesson, updatedAt: (returnedLessons.get(lesson.id) as Row).updated_at as string })),
    }
  } catch { return null }
}
