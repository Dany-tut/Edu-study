// External replacement proposal for src/lib/courseOrdinaryDelta.ts, base8b09fe79.
import { courseContentDelta, type CourseContentSnapshot } from './courseContentDelta'
import { createWideContentDelta, WideContentPreservationError, wideJsonEqual,
  type JsonOp, type WideContentDelta } from './courseWideDelta'

type Row = Record<string, unknown>
export type OrdinaryContentDelta = {
  p_expected_status: 'draft' | 'published'
  p_course_patch: Row
  p_lesson_patches: Array<{ id: string; short_id: string; set: Row; json_ops?: JsonOp[] }>
  p_expected_modules: CourseContentSnapshot['modules']
}
export type OrdinaryContentPlan = Readonly<{
  wire: OrdinaryContentDelta
  // Keep the full immutable operation set for strict wide ACK; wire deliberately
  // strips empty scalar homework/content patches unsupported by six-arg SQL.
  delta: WideContentDelta
  hasWide: boolean
}>
const metadata = new Set(['title', 'description', 'level', 'color', 'bg'])
const record = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value)
const pathValue = (row: Row, column: string, key: string): unknown => record(row[column]) ? row[column][key] : undefined
const supportedPaths: Readonly<Record<string, readonly string[]>> = {
  homework: ['hwTasks', 'recHwTasks', 'extraHw'], content: ['paragraphs', 'selfCheck'],
  materials: ['workbook', 'notebook', 'materials'],
}
function wideChanged(before: CourseContentSnapshot, after: CourseContentSnapshot): boolean {
  const previous = new Map(before.lessons.map(row => [row.short_id, row]))
  return after.lessons.some(row => {
    const old = previous.get(row.short_id)
    return !!old && (!wideJsonEqual(old.test_tasks, row.test_tasks)
      || Object.entries(supportedPaths).some(([column, keys]) => keys.some(key => !wideJsonEqual(pathValue(old, column, key), pathValue(row, column, key)))))
  })
}
function ordinaryPath(op: JsonOp): boolean {
  return (op.column === 'homework' && op.path.length === 1 && supportedPaths.homework.includes(op.path[0]))
    || (op.column === 'content' && op.path.length === 1 && supportedPaths.content.includes(op.path[0]))
    || op.column === 'materials'
}
/** Only explicit empty access intent maps permit this lane. */
export function noCourseAccessIntents(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, changes]) => ['students', 'groups', 'modes'].includes(key)
    && changes !== null && typeof changes === 'object' && !Array.isArray(changes)
    && Object.keys(changes).length === 0)
}
/** STOP, retaining draft, on unsafe or mixed body edits. Null means the old
 * lane may still own a non-body edit; it MUST NOT mean fallback for array loss. */
export function ordinaryContentPlan(before: CourseContentSnapshot, after: CourseContentSnapshot,
  expectedModules = before.modules): OrdinaryContentPlan | null {
  const bodyChanged = wideChanged(before, after), status = before.course.status
  if ((status !== 'draft' && status !== 'published') || status !== after.course.status) {
    if (bodyChanged) throw new WideContentPreservationError('body/publication changes require separate confirmed saves')
    return null
  }
  const left = { ...before, course: { ...before.course, status: 'draft' } }
  const right = { ...after, course: { ...after.course, status: 'draft' } }
  // Keep existing metadata/description behavior for old canonical fixtures that
  // carry no raw JSON, while every new body edit requires confirmed raw source.
  const delta: WideContentDelta | null = bodyChanged
    ? createWideContentDelta(courseContentDelta)(left, right, expectedModules)
    : courseContentDelta(left, right, expectedModules)
  if (!delta || delta.p_lesson_deletes.length || delta.p_module_ops.length
    || Object.keys(delta.p_course_patch).some(key => !metadata.has(key))
    || delta.p_lesson_patches.some(patch => Object.keys(patch.set).some(key => !['description', 'test_tasks'].includes(key))
      || Object.keys(patch.homework_set).length > 0 || Object.keys(patch.content_set).length > 0
      || patch.json_ops?.some(op => !ordinaryPath(op)))) {
    if (bodyChanged) throw new WideContentPreservationError('mixed unsupported field/body changes cannot use lossy full fallback')
    return null
  }
  const hasWide = delta.p_lesson_patches.some(patch => !!patch.json_ops?.length
    || Object.prototype.hasOwnProperty.call(patch.set, 'test_tasks'))
  return structuredClone({ delta: structuredClone(delta), hasWide, wire: {
    p_expected_status: status, p_course_patch: delta.p_course_patch,
    p_lesson_patches: delta.p_lesson_patches.map(({ id, short_id, set, json_ops }) => ({ id, short_id, set,
      ...(json_ops?.length ? { json_ops } : {}) })), p_expected_modules: delta.p_expected_modules,
  } })
}
/** Existing callers consuming only the six-argument wire protocol stay valid. */
export function ordinaryContentDelta(before: CourseContentSnapshot, after: CourseContentSnapshot,
  expectedModules = before.modules): OrdinaryContentDelta | null {
  return ordinaryContentPlan(before, after, expectedModules)?.wire ?? null
}
