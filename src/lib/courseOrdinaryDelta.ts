import { courseContentDelta, type CourseContentSnapshot } from './courseContentDelta'

type Row = Record<string, unknown>
export type OrdinaryContentDelta = {
  p_expected_status: 'draft' | 'published'
  p_course_patch: Row
  p_lesson_patches: Array<{ id: string; short_id: string; set: Row }>
  p_expected_modules: CourseContentSnapshot['modules']
}
const metadata = new Set(['title', 'description', 'level', 'color', 'bg'])

/** Audience arrays are never an access witness. Only explicit empty intent
 * maps permit this lane; its ACK cannot acknowledge or reconcile access. */
export function noCourseAccessIntents(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, changes]) => ['students', 'groups', 'modes'].includes(key)
    && changes !== null && typeof changes === 'object' && !Array.isArray(changes)
    && Object.keys(changes).length === 0)
}

/** First ordinary lane deliberately excludes calendar/structure/publication
 * changes. Compare the COMPLETE canonical snapshot before selecting an engine;
 * filtering a patch must never silently omit another pending teacher edit. */
export function ordinaryContentDelta(before: CourseContentSnapshot, after: CourseContentSnapshot,
  expectedModules = before.modules): OrdinaryContentDelta | null {
  const status = before.course.status
  if ((status !== 'draft' && status !== 'published') || status !== after.course.status) return null
  const delta = courseContentDelta({ ...before, course: { ...before.course, status: 'draft' } },
    { ...after, course: { ...after.course, status: 'draft' } }, expectedModules)
  if (!delta || delta.p_lesson_deletes.length || delta.p_module_ops.length
    || Object.keys(delta.p_course_patch).some(key => !metadata.has(key))
    || delta.p_lesson_patches.some(patch => Object.keys(patch.set).some(key => key !== 'description')
      || Object.keys(patch.homework_set).length > 0 || Object.keys(patch.content_set).length > 0)) return null
  return {
    p_expected_status: status, p_course_patch: delta.p_course_patch,
    p_lesson_patches: delta.p_lesson_patches.map(({ id, short_id, set }) => ({ id, short_id, set })),
    p_expected_modules: delta.p_expected_modules,
  }
}
