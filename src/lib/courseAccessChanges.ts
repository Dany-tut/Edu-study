/** Only explicit access edits belong in a content save; an editor snapshot may be stale. */
export type CourseAccessMode = 'full' | 'custom' | 'by_date'
export type CourseAccessChanges = {
  students?: Record<string, boolean>
  groups?: Record<string, boolean>
  modes?: Record<string, CourseAccessMode>
}
type Audience = { studentIds: string[]; groupIds: string[]; accessChanges?: CourseAccessChanges }

function membershipChanges(before: string[], after: string[]) {
  const a = new Set(before), b = new Set(after)
  return Object.fromEntries([...new Set([...a, ...b])].filter(id => a.has(id) !== b.has(id)).map(id => [id, b.has(id)]))
}
export function recordCourseAccessEdit<T extends Audience>(before: T, after: T): T {
  const students = membershipChanges(before.studentIds, after.studentIds)
  const groups = membershipChanges(before.groupIds, after.groupIds)
  if (!Object.keys(students).length && !Object.keys(groups).length) return after
  return { ...after, accessChanges: {
    ...after.accessChanges,
    students: { ...after.accessChanges?.students, ...students },
    groups: { ...after.accessChanges?.groups, ...groups },
  } }
}
export function accessChangesForSave(course: Audience & { dbCourseId?: string }): CourseAccessChanges {
  // A new course/handout has no persisted audience yet. Existing drafts never
  // implicitly grant or revoke access merely because their arrays differ.
  return {
    students: { ...(!course.dbCourseId ? Object.fromEntries(course.studentIds.map(id => [id, true])) : {}), ...course.accessChanges?.students },
    groups: { ...(!course.dbCourseId ? Object.fromEntries(course.groupIds.map(id => [id, true])) : {}), ...course.accessChanges?.groups },
    modes: { ...course.accessChanges?.modes },
  }
}
function applyMembership(ids: string[], changes: Record<string, boolean> = {}) {
  const next = new Set(ids)
  for (const [id, on] of Object.entries(changes)) { if (on) next.add(id); else next.delete(id) }
  return [...next]
}
export function acknowledgeCourseAccess<T extends Audience>(course: T, applied: CourseAccessChanges, server: { student_ids: string[]; group_ids: string[] }): T {
  const pending: CourseAccessChanges = {}
  for (const field of ['students', 'groups', 'modes'] as const) {
    const rest = Object.fromEntries(Object.entries(course.accessChanges?.[field] ?? {}).filter(([id, value]) => applied[field]?.[id] !== value))
    if (Object.keys(rest).length) Object.assign(pending, { [field]: rest })
  }
  const next = { ...course, studentIds: applyMembership(server.student_ids, pending.students), groupIds: applyMembership(server.group_ids, pending.groups) }
  if (Object.keys(pending).length) next.accessChanges = pending
  else delete next.accessChanges
  return JSON.stringify(next) === JSON.stringify(course) ? course : next
}
