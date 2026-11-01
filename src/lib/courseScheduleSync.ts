/** Course editor slots are stable per lesson, node and audience. Their DB ids
 * also own teacher notes and attendance, so an ordinary course save must reuse them. */
export interface CourseSlot {
  lesson_id: string; group_id: string | null; student_id: string | null; node_type: string | null
  date: string; time_start: string; time_end: string | null; subject: string; lesson_title: string; lesson_number: number
}
type SavedSlot = CourseSlot & { id: string }
const identity = (s: CourseSlot) => JSON.stringify([s.lesson_id, s.node_type ?? 'lesson', s.group_id, s.student_id])
const sameTime = (a: string | null, b: string | null) => a?.slice(0, 5) === b?.slice(0, 5)
const sameSlot = (a: CourseSlot, b: CourseSlot) => a.date === b.date && sameTime(a.time_start, b.time_start)
  && sameTime(a.time_end, b.time_end) && a.subject === b.subject && a.lesson_title === b.lesson_title && a.lesson_number === b.lesson_number

export function planCourseSchedule(existing: SavedSlot[], desired: CourseSlot[]) {
  const byKey = new Map<string, SavedSlot[]>()
  for (const row of existing) {
    const key = identity(row)
    const slots = byKey.get(key) ?? []
    slots.push(row)
    byKey.set(key, slots)
  }
  const insert: CourseSlot[] = [], update: SavedSlot[] = []
  for (const row of desired) {
    const candidates = byKey.get(identity(row))
    if (!candidates?.length) { insert.push(row); continue }
    const index = candidates.findIndex(old => sameSlot(old, row))
    const [old] = candidates.splice(Math.max(0, index), 1)
    // Never send the event's operational status, even on a reschedule.
    if (!sameSlot(old, row)) update.push({ ...row, id: old.id })
  }
  return { insert, update, remove: [...byKey.values()].flat().map(row => row.id) }
}
