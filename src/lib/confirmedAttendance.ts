import type { CourseJournalData, JournalEvent, JournalLegacyMark } from './courseJournal'

/** These patches are issued only after the write was acknowledged by the DB. */
export type ConfirmedAttendance = {
  event: JournalEvent; studentId: string; present: boolean | null; grade: number | null
  source: 'live' | 'recording' | 'transfer'
}
export type AttendanceConfirmation = { revision: number; edits: ConfirmedAttendance[] }

export function applyConfirmedAttendance(data: CourseJournalData, edits: ConfirmedAttendance[]): CourseJournalData {
  let marks = data.marks, legacy = data.legacy
  for (const edit of edits) {
    // Never inject a mark from another roster/snapshot or change schedule dates.
    if (!data.events.some(e => e.id === edit.event.id)) continue
    const old = marks.find(m => m.schedule_id === edit.event.id)
    const mark = { schedule_id: edit.event.id, attendance: { ...old?.attendance, [edit.studentId]: edit.present } }
    marks = old ? marks.map(m => m === old ? mark : m) : [...marks, mark]
    const prior = legacy.find(m => m.student_id === edit.studentId && m.lesson_date === edit.event.date)
    // The server preserves another lesson's legacy row on same-day collisions.
    if (prior && prior.lesson_title !== edit.event.lesson_title) continue
    if (edit.present === null) {
      legacy = legacy.filter(m => m !== prior)
    } else {
      const row: JournalLegacyMark = { ...prior, student_id: edit.studentId, lesson_date: edit.event.date,
        lesson_title: edit.event.lesson_title, present: edit.present, grade: edit.present ? edit.grade : null,
        source: prior?.source ?? edit.source }
      legacy = prior ? legacy.map(m => m === prior ? row : m) : [...legacy, row]
    }
  }
  return { ...data, marks, legacy }
}

/** A read started before confirmation may still contain the old cells. A read
 * started afterwards is authoritative and retires these temporary overlays. */
export function reconcileAttendanceSnapshot(data: CourseJournalData, confirmations: AttendanceConfirmation[], readRevision: number) {
  return confirmations.filter(c => c.revision > readRevision).reduce((next, c) => applyConfirmedAttendance(next, c.edits), data)
}
