import assert from 'node:assert/strict'
import { scheduleRowStatus } from '../src/lib/scheduleAttendance.ts'
import { planCourseSchedule } from '../src/lib/courseScheduleSync.ts'
const now = new Date('2026-10-31T18:00:00+03:00')
const opts = { dayDate: '2026-10-31', isToday: true }
const row = { id: 'event', time: '14:00', endTime: '15:00', lessonTitle: 'Telegram', subject: 'Химия', lessonNumber: 1 }
for (const attendance of [undefined, null]) {
  assert.equal(scheduleRowStatus({ ...row, attendance }, opts, [], now), 'unmarked')
  assert.equal(scheduleRowStatus({ ...row, attendance, time: '19:00' }, opts, [], now), 'pending')
}
assert.equal(scheduleRowStatus({ ...row, attendance: false }, opts, [], now), 'missed')
assert.equal(scheduleRowStatus({ ...row, attendance: true }, opts, [], now), 'present')
// Homework completion must neither erase absence nor invent presence.
for (const status of ['locked', 'current', 'completed', 'submitted', 'returned', 'unviewed']) {
  const subjects = [{ modules: [{ lessons: [{ id: row.id, status }] }] }]
  assert.equal(scheduleRowStatus({ ...row, attendance: false }, opts, subjects, now), 'missed')
  assert.equal(scheduleRowStatus(row, opts, subjects, now), 'unmarked')
}
const past = { dayDate: '2026-10-30', isToday: false }
assert.equal(scheduleRowStatus({ ...row, attendance: false }, past, [], now), 'missed')
assert.equal(scheduleRowStatus(row, past, [], now), 'unmarked')
assert.equal(scheduleRowStatus(row, opts, [], new Date('2026-10-31T14:00:01+03:00')), 'pending')
assert.equal(scheduleRowStatus(row, opts, [], new Date('2026-10-31T15:00:00+03:00')), 'unmarked')
assert.equal(scheduleRowStatus({ ...row, endTime: undefined }, opts, [], now), 'pending')
console.log('Calendar attendance: explicit marks, homework independence, late marking, past and future slots passed')

const slot = { lesson_id: 'course-lesson', group_id: 'group', student_id: null, node_type: 'lesson', date: '2026-11-01', time_start: '10:00', time_end: '11:00', subject: 'Химия', lesson_title: 'Тема', lesson_number: 2 }
const saved = { ...slot, id: 'event-with-marks', time_start: '10:00:00', status: 'completed' }
assert.deepEqual(planCourseSchedule([saved], [slot]), { insert: [], update: [], remove: [] })
const moved = { ...slot, date: '2026-11-02' }
assert.deepEqual(planCourseSchedule([saved], [moved]), { insert: [], update: [{ ...moved, id: saved.id }], remove: [] })
const rec = { ...slot, node_type: 'rec' }
assert.deepEqual(planCourseSchedule([saved], [slot, rec]), { insert: [rec], update: [], remove: [] })
console.log('Course save: existing journal ids and session status preserved')
