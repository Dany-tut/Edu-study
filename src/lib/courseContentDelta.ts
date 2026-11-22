import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { courseAtomicRows, eligibleCourseAtomicModules } from './courseAtomicRows'
import type { LessonWitness } from './courseConfirmedBaseline'

type Row = Record<string, unknown>
export type CourseContentSnapshot = {
  course: Row
  rawCourse?: Row
  rawLessons?: Record<string, Row>
  modules: Array<{ id: string; label: string; position: number }>
  lessons: Array<Row & { id: string; short_id: string }>
}
export type CourseContentDelta = {
  p_course_patch: Row
  p_lesson_patches: Array<{ id: string; short_id: string; set: Row; homework_set: Row; content_set: Row }>
  p_lesson_deletes: Array<{ id: string; short_id: string }>
  p_module_ops: Row[]
  p_expected_modules: CourseContentSnapshot['modules']
}
const courseFields = new Set(['title', 'subject', 'level', 'description', 'color', 'bg', 'seed_stamp', 'number_start'])
const lessonFields = new Set(['title', 'description', 'module_id', 'position', 'lesson_number', 'scheduled_date', 'scheduled_time', 'scheduled_duration', 'rec_date', 'rec_time', 'rec_duration', 'lesson_sched_manual', 'delivery_mode'])
const homeworkFields = new Set(['hwTitle', 'hwTarget', 'hwDate', 'hwTime', 'hwDateManual', 'recHwTitle', 'recHwTarget', 'recHwDate', 'recHwTime', 'recHwDateManual'])
const contentFields = new Set(['cardSetId', 'cardGroupId'])
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function courseDeltaProbeEnabled(shortId: string): boolean {
  return shortId === '00e3a0efbf' && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('qa_course_save') === '20261122'
    && new URLSearchParams(window.location.search).get('qa_course_delta') === '20261122'
}

/** The same canonical projection for the clean network snapshot and user input. */
export function courseContentSnapshot(c: CourseEdData, identities: readonly LessonWitness[]): CourseContentSnapshot | null {
  const modules = eligibleCourseAtomicModules(c)
  if (!modules) return null
  const byRef = new Map(identities.map(l => [l.shortId, l.id]))
  const ids = Object.fromEntries(modules.map(m => [m.id, m.id]))
  const { lessonRows } = courseAtomicRows(c, '', modules, ids)
  return {
    course: {
      title: c.title, subject: c.subject, level: c.level, description: c.description ?? '',
      status: c.status, color: c.color, bg: c.bg,
      ...(c.seedStamp ? { seed_stamp: c.seedStamp } : {}),
      ...(c.numberStart != null ? { number_start: c.numberStart } : {}),
    },
    modules: modules.map((m, position) => ({ id: m.id, label: m.label, position })),
    // An unknown new UUID makes the delta unsupported, but the full request
    // can still use this immutable canonical projection.
    lessons: lessonRows.map(({ course_id: _course, ...row }) => ({ ...row, id: byRef.get(row.short_id) ?? '' })),
  }
}

function leafPatch(before: unknown, after: unknown, allowed: Set<string>): Row | null {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object'
    || Array.isArray(before) || Array.isArray(after)) return null
  const a = before as Row, b = after as Row, patch: Row = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (equal(a[key], b[key])) continue
    if (!allowed.has(key)) return null
    const value = b[key] ?? null
    if (typeof value === 'object' && value !== null) return null
    patch[key] = value
  }
  return patch
}

/** Null means unsupported BEFORE dispatch; it never authorizes a retry after a write. */
export function courseContentDelta(before: CourseContentSnapshot, after: CourseContentSnapshot, expectedModules = before.modules): CourseContentDelta | null {
  if (before.course.status !== 'draft' || after.course.status !== 'draft') return null
  const patch: CourseContentDelta = {
    p_course_patch: {}, p_lesson_patches: [], p_lesson_deletes: [], p_module_ops: [],
    p_expected_modules: structuredClone(expectedModules),
  }
  for (const key of new Set([...Object.keys(before.course), ...Object.keys(after.course)])) {
    if (equal(before.course[key], after.course[key])) continue
    if (!courseFields.has(key) || !(key in after.course)
      || (typeof after.course[key] === 'object' && after.course[key] !== null)) return null
    patch.p_course_patch[key] = after.course[key]
  }
  const previousModules = new Map(before.modules.map(m => [m.id, m]))
  const expectedById = new Map(expectedModules.map(m => [m.id, m]))
  const currentModules = new Map(after.modules.map(m => [m.id, m]))
  if (currentModules.size !== after.modules.length || previousModules.size !== before.modules.length
    || expectedById.size !== expectedModules.length || expectedById.size !== previousModules.size
    || before.modules.some(m => !uuid.test(m.id) || !expectedById.has(m.id))) return null
  for (const module of after.modules) {
    const old = previousModules.get(module.id)
    const expected = expectedById.get(module.id)
    if (!old || !expected) return null
    const set: Row = {}
    if (old.label !== module.label) set.label = module.label
    if (old.position !== module.position) set.position = module.position
    if (Object.keys(set).length) patch.p_module_ops.push({ id: module.id, op: 'patch', expected: { label: expected.label, position: expected.position }, set })
  }
  for (const old of before.modules) if (!currentModules.has(old.id)) {
    const expected = expectedById.get(old.id)
    if (!expected) return null
    patch.p_module_ops.push({ id: old.id, op: 'delete', expected: { label: expected.label, position: expected.position } })
  }
  const previous = new Map(before.lessons.map(l => [l.short_id, l]))
  const current = new Map(after.lessons.map(l => [l.short_id, l]))
  if (previous.size !== before.lessons.length || current.size !== after.lessons.length) return null
  if (new Set(before.lessons.map(l => l.id)).size !== before.lessons.length
    || new Set(after.lessons.map(l => l.id)).size !== after.lessons.length
    || before.lessons.some(l => !uuid.test(l.id)) || after.lessons.some(l => !uuid.test(l.id))) return null
  for (const row of after.lessons) {
    const old = previous.get(row.short_id)
    if (!old || old.id !== row.id) return null
    const set: Row = {}, homework = leafPatch(old.homework, row.homework, homeworkFields), content = leafPatch(old.content, row.content, contentFields)
    if (!homework || !content) return null
    for (const key of new Set([...Object.keys(old), ...Object.keys(row)])) {
      if (key === 'homework' || key === 'content' || equal(old[key], row[key])) continue
      if (!lessonFields.has(key) || !(key in row)
        || (typeof row[key] === 'object' && row[key] !== null)) return null
      set[key] = row[key]
    }
    if (Object.keys(set).length || Object.keys(homework).length || Object.keys(content).length) {
      patch.p_lesson_patches.push({ id: row.id, short_id: row.short_id, set, homework_set: homework, content_set: content })
    }
  }
  for (const row of before.lessons) if (!current.has(row.short_id)) patch.p_lesson_deletes.push({ id: row.id, short_id: row.short_id })
  return patch
}
