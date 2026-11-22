import assert from 'node:assert/strict'
import { journalDemo } from '../src/data/courseJournalDemo'
import { buildStandIndex, studentWorks, scopeSlots, hasCourseTests, hasCourseTrials, hasCourseHomework, hasCourseAttendance } from '../src/components/teacher/journalStand/studentWorks'
const data = journalDemo()
const person = data.students[0]
const lesson = { ...data.lessons[0], kind: 'lesson', hwTask: [{ type: 'single' }], recTask: [], extraHw: [] }
const base = { ...data, lessons: [lesson], assignments: [], attempts: [] }
const works = input => {
  const index = buildStandIndex(input)
  return studentWorks(input, index, person, scopeSlots(index, { course: lesson.course_id, module: '' }), '2026-11-01')
}
assert.equal(hasCourseTests(works(base)), false, 'Old scores cannot invent course tests')
assert.equal(hasCourseTests(works({ ...base, lessons: [{ ...lesson, kind: 'test' }], work: [] })), true, 'Unattempted tests remain visible')
assert.equal(hasCourseTests(works({ ...base, lessons: [{ ...lesson, hwTask: [{ type: 'testly' }] }] })), true, 'Embedded Testly counts')
assert.equal(hasCourseTests(works({ ...base, lessons: [] })), false, 'Removed tests do not count')
assert.equal(hasCourseTests([{ slot: { course: '__outside__', types: ['testly'] } }]), false, 'Standalone tests do not create a course column')
assert.equal(hasCourseTests([]), false)
console.log('PASS: course test column follows current content, including unattempted/embedded tests; old results and standalone tests are isolated')

assert.equal(hasCourseTrials(works(base)), false, 'Existing trial percentages do not create course trials')
assert.equal(hasCourseTrials(works({ ...base, lessons: [{ ...lesson, kind: 'test' }] })), false, 'An ordinary test is not a trial')
assert.equal(hasCourseTrials(works({ ...base, lessons: [{ ...lesson, kind: 'trial' }], work: [] })), true, 'An unattempted course trial keeps its column')
assert.equal(hasCourseTrials(works({ ...base, lessons: [] })), false, 'Deleted course trials do not count')
assert.equal(hasCourseTrials([{ slot: { course: '__outside__', lesson: { lesson: { kind: 'trial' } } } }]), false, 'Standalone trials are not part of a course')
assert.equal(hasCourseTrials([]), false)
console.log('PASS: trial column uses current course contents, ignores stale scores, ordinary tests and standalone trials')

const emptyHomework = { ...base, lessons: [{ ...lesson, hwTask: [], recTask: [], extraHw: [] }] }
assert.equal(hasCourseHomework(works(emptyHomework)), false, 'Old submissions do not create homework')
assert.equal(hasCourseHomework(works({ ...base, work: [] })), true, 'Unattempted homework keeps its column')
assert.equal(hasCourseHomework(works({ ...base, lessons: [{ ...lesson, kind: 'test' }] })), false, 'Test tasks are not homework')
assert.equal(hasCourseHomework(works({ ...emptyHomework, lessons: [{ ...emptyHomework.lessons[0], hwTask: [{ isHard: true }] }] })), true, 'Optional legacy tasks count as homework')
assert.equal(hasCourseHomework(works({ ...emptyHomework, lessons: [{ ...emptyHomework.lessons[0], extraHw: [{ id: 'extra', tasks: [{ type: 'text' }] }] }] })), true, 'Extra homework counts')
const assigned = { id: 'bound', lesson_id: lesson.id, group_id: person.groupId, title: 'Bound homework', status: 'active', due_date: null, basicTasks: [{ type: 'text' }] }
assert.equal(hasCourseHomework(works({ ...emptyHomework, assignments: [assigned] })), true, 'Lesson-bound assignments count')
assert.equal(hasCourseHomework(works({ ...emptyHomework, assignments: [{ ...assigned, status: 'archived' }] })), false, 'Archived assignments do not create current homework')
assert.equal(hasCourseHomework(works({ ...emptyHomework, assignments: [{ ...assigned, lesson_id: null }] })), false, 'Standalone homework is not course homework')
const recording = { ...emptyHomework.lessons[0], lesson_sched_manual: true, rec_date: '2026-10-01', scheduled_date: '2026-10-02', recTask: [{ type: 'text' }] }
assert.equal(hasCourseHomework(works({ ...emptyHomework, lessons: [recording] })), true, 'Recording homework counts')
assert.equal(hasCourseHomework([]), false)
console.log('PASS: homework column follows current lesson, recording, extra and bound tasks; old results, tests and standalone/archived assignments stay isolated')

const recordedOnly = { ...base, lessons: [{ ...lesson, delivery_mode: 'recording' }], work: [], events: [], marks: [], legacy: [] }
assert.equal(hasCourseAttendance(works(recordedOnly)), false, 'Recording-only course without marks hides attendance')
assert.equal(hasCourseAttendance(works({ ...recordedOnly, work: [{ id: 'watched', student_id: person.id, lesson_ref: 'video-' + lesson.short_id, status: 'completed', score: 100, attachments: { video: { completed: true } }, updated_at: '' }] })), false, 'Watching recordings does not create attendance')
const liveLesson = { ...lesson, delivery_mode: 'online' }
assert.equal(hasCourseAttendance(works({ ...recordedOnly, lessons: [liveLesson] })), true, 'A live lesson keeps attendance before scheduling or marking')
assert.equal(hasCourseAttendance(works({ ...recordedOnly, lessons: [recordedOnly.lessons[0], { ...liveLesson, id: 'live-other', short_id: 'live-other' }] })), true, 'Mixed live/recorded course keeps attendance')
assert.equal(hasCourseAttendance(works({ ...recordedOnly, lessons: [{ ...liveLesson, kind: 'test' }] })), false, 'Tests do not create attendance')
const markedEvent = { id: 'marked-recording', lesson_id: lesson.id, node_type: 'lesson', group_id: person.groupId, student_id: null, date: '2026-10-01', time_start: '10:00', time_end: '11:00', lesson_title: lesson.title, subject: '', status: 'completed' }
for (const mark of [true, false]) assert.equal(hasCourseAttendance(works({ ...recordedOnly, events: [markedEvent], marks: [{ schedule_id: markedEvent.id, attendance: { [person.id]: mark } }] })), true, 'Explicit present/absent mark keeps attendance for a recording')
assert.equal(hasCourseAttendance([{ slot: { lesson: { recording: true, lesson: { kind: 'lesson', delivery_mode: 'online' } } }, present: null }]), false, 'The recording part of a split lesson is not a live lesson')
assert.equal(hasCourseAttendance([]), false)
console.log('PASS: recording-only attendance is hidden; live/mixed courses and actual present/absent marks remain visible; playback and old percentages are ignored')
