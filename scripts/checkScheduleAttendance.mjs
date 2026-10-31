import assert from 'node:assert/strict'
import { scheduleRowStatus } from '../src/lib/scheduleAttendance.ts'
const now = new Date('2026-10-31T18:00:00')
const opts = { dayDate: '2026-10-31', isToday: true }
const row = { id: 'event', time: '14:00', lessonTitle: 'Telegram', subject: 'Химия', lessonNumber: 1 }
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
assert.equal(scheduleRowStatus(row, opts, [], new Date('2026-10-31T14:00:01')), 'unmarked')
console.log('Calendar attendance: explicit marks, homework independence, late marking, past and future slots passed')
