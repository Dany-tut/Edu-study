import assert from 'node:assert/strict'
import { average, studentJournalStats, journalResult, journalLessonRef, journalWorkKind } from '../src/lib/gradebookStats.ts'

const attendance = [
  { student_id: 'mitya', lesson_date: '2026-10-30', present: true, grade: 5 },
  { student_id: 'other', lesson_date: '2026-10-31', present: false, grade: null },
]
const progress = [
  { student_id: 'mitya', lesson_ref: 'hw-1', status: 'completed', score: 0 },
  { student_id: 'mitya', lesson_ref: 'hw-2', status: 'completed', score: 100 },
  { student_id: 'mitya', lesson_ref: 'hw-3', status: 'returned', score: 10 },
  { student_id: 'mitya', lesson_ref: 'hw-4', status: 'submitted', score: null },
  { student_id: 'mitya', lesson_ref: 'hw-1-hard', status: 'completed', score: 2 },
  { student_id: 'mitya', lesson_ref: 'course-1', status: 'completed', score: 90 },
  { student_id: 'other', lesson_ref: 'hw-1', status: 'completed', score: 100 },
]
assert.deepEqual(studentJournalStats('mitya', attendance, progress), {
  attendance: 100, grade: 5, hwScore: 50, completed: 3, pending: 1, returned: 1, lessons: 1,
  courseScore: 90, courseCompleted: 1, courseSubmitted: 1, courseTotal: 1, hardCompleted: 1, hardTotal: 1,
})
assert.deepEqual(studentJournalStats('new', attendance, progress), {
  attendance: null, grade: null, hwScore: null, completed: 0, pending: 0, returned: 0, lessons: 0,
  courseScore: null, courseCompleted: 0, courseSubmitted: 0, courseTotal: 0, hardCompleted: 0, hardTotal: 0,
})
assert.equal(average([]), null)
assert.equal(average([null, NaN]), null)
assert.equal(average([0, null]), 0)
assert.equal(average([3, 4], 1), 3.5)
// Mitya's saved course results use percentages, not Testly's raw points.
const courseRow = (ref, score, status = 'submitted', attachments = {}) => ({ student_id: 'ungrouped', lesson_ref: ref, score, status, attachments })
const first = courseRow('lesson-0', 3, 'submitted', { v: 'basic-1', rows: [{ type: 'testly', testly: { got: 1, max: 36, pending: false } }] })
const second = courseRow('lesson-1', 8, 'submitted', { v: 'basic-1', rows: [{ type: 'testly', testly: { got: 5, max: 63, pending: false } }] })
const mitya = [first, second, courseRow('lesson-2', 0, 'current'), courseRow('lesson-3', 0, 'locked'),
  courseRow('video-lesson-0', 0, 'locked', { video: { completed: false } })]
assert.equal(studentJournalStats('ungrouped', [], mitya).courseScore, 6)
assert.equal(studentJournalStats('ungrouped', [], mitya).courseSubmitted, 2)
assert.equal(studentJournalStats('ungrouped', [], mitya).courseTotal, 4)
assert.deepEqual(journalResult(first).points, [{ got: 1, max: 36, pending: false }])
assert.equal(journalResult(second).percent, 8)
const pending = courseRow('pending', 100, 'submitted', { v: 'basic-1', rows: [{ type: 'testly', testly: { got: 30, max: 30, pending: true } }] })
const manual = courseRow('oral', 100, 'submitted', { v: 'basic-1', rows: [{ type: 'oral', verdict: 'review' }] })
const noise = [courseRow('video-lesson-0', 100, 'completed'),
  courseRow('course-reset:abc', 100, 'completed'), courseRow('trainer-speaking-chem', 100, 'completed'),
  courseRow('lesson-1-hard', 5, 'completed'), courseRow('returned', 100, 'returned'), pending, manual]
assert.equal(studentJournalStats('ungrouped', [], [...mitya, ...noise]).courseScore, 6)
assert.equal(journalResult(pending).pending, true)
assert.equal(journalResult({ ...manual, status: 'completed' }).pending, false)
assert.equal(studentJournalStats('ungrouped', [], [pending, manual]).courseScore, null)
assert.equal(studentJournalStats('ungrouped', [], [courseRow('zero', 0, 'completed')]).courseScore, 0)
assert.equal(journalResult(courseRow('invalid', 150, 'completed')).percent, null)
assert.equal(journalResult(courseRow('invalid', NaN, 'completed')).percent, null)
assert.equal(journalResult(courseRow('hard-hard', 5, 'completed')).percent, null)
assert.equal(journalLessonRef('video-lesson-1~rec'), 'lesson-1')
assert.equal(journalLessonRef('lesson-1~extra-hard'), 'lesson-1')
assert.equal(journalWorkKind('lesson-1~extra'), 'course')
assert.equal(journalWorkKind('lesson-1~rec'), 'course')
assert.equal(studentJournalStats('ungrouped', [], [courseRow('lesson-1~rec', 75, 'completed')]).courseScore, 75)
assert.equal(journalResult({ ...pending, status: 'completed' }).pending, true)
assert.equal(journalWorkKind('course-reset:abc'), null)
assert.equal(journalWorkKind('trainer-speaking-chem'), null)
assert.equal(journalResult(courseRow('legacy', 45, 'completed', null)).percent, 45)
console.log('Gradebook: course results, ungrouped students, Testly points, pending review, zero scores, service rows, attendance and isolation checks passed')
