import assert from 'node:assert/strict'
import { scheduleRowStatus } from '../src/lib/scheduleAttendance.ts'
import { planCourseSchedule, readGroupScheduleConflict } from '../src/lib/courseScheduleSync.ts'
import { studentScheduleScope } from '../src/lib/studentScheduleScope.ts'
const studentA = '00000000-0000-4000-8000-000000000001'
const studentB = '00000000-0000-4000-8000-000000000002'
const groupA = '00000000-0000-4000-8000-000000000003'
const groupB = '00000000-0000-4000-8000-000000000004'
assert.deepEqual(studentScheduleScope([
  { id: studentA, groupId: groupA }, { id: studentB, groupId: groupB },
  { id: studentA, groupId: groupA }, { id: 'undefined', groupId: 'bad,filter' },
]), [`group_id.eq.${groupA}`, `group_id.eq.${groupB}`, `student_id.eq.${studentA}`, `student_id.eq.${studentB}`])
assert.deepEqual(studentScheduleScope([]), [])
assert.deepEqual(studentScheduleScope([{ id: '', groupId: groupA }]), [`group_id.eq.${groupA}`])
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
assert.deepEqual(planCourseSchedule([saved], [slot]), { insert: [], update: [], removeBeforeWrite: [], remove: [] })
const moved = { ...slot, date: '2026-11-02' }
assert.deepEqual(planCourseSchedule([saved], [moved]), { insert: [], update: [{ ...moved, id: saved.id }], removeBeforeWrite: [], remove: [] })
const rec = { ...slot, node_type: 'rec' }
assert.deepEqual(planCourseSchedule([saved], [slot, rec]), { insert: [rec], update: [], removeBeforeWrite: [], remove: [] })
console.log('Course save: existing journal ids and session status preserved')

const stale = { ...saved, time_start: slot.time_start }
const replacement = { ...slot, lesson_id: 'next-lesson', lesson_title: 'Птицы' }
assert.deepEqual(planCourseSchedule([stale], [replacement]), {
  insert: [replacement], update: [], removeBeforeWrite: [stale.id], remove: [],
})
assert.deepEqual(planCourseSchedule([stale], [slot]), {
  insert: [], update: [], removeBeforeWrite: [], remove: [],
})
const groupId = '99999999-1234-4321-9123-000000000001'
assert.deepEqual(readGroupScheduleConflict({
  code: '23505',
  details: `Key (group_id, date, time_start)=(${groupId}, 2026-11-26, 18:00) already exists.`,
}), { groupId, date: '2026-11-26', time: '18:00' })
assert.equal(readGroupScheduleConflict({ code: '23505', details: 'Key (id)=(123) already exists.' }), null)

assert.deepEqual(readGroupScheduleConflict({code:'23505',message:'ISKRA_SCHEDULE_CONFLICT:{"groupId":"00000000-0000-0000-0000-000000000001","date":"2026-12-01","time":"18:00"}'}),{groupId:'00000000-0000-0000-0000-000000000001',date:'2026-12-01',time:'18:00'})
assert.equal(readGroupScheduleConflict({code:'23505',message:'ISKRA_SCHEDULE_CONFLICT:invalid'}),null)
