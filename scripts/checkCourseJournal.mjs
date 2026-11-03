import assert from 'node:assert/strict'
import { buildJournalIndex, courseRoster, journalCell, journalColumns, journalSummary, journalCsv, journalDate, OUTSIDE_COURSES } from '../src/lib/courseJournal.ts'
import { journalDemo } from '../src/data/courseJournalDemo.ts'

const data = journalDemo()
const chem = journalColumns(data, 'demo-chem')
const bio = journalColumns(data, 'demo-bio')
const student = data.students[0]
const today = '2099-12-31'
const cell = (d, s = student, column = chem[0], day = today) => journalCell(d, buildJournalIndex(d), s, column, day)
assert.equal(courseRoster(data, 'demo-chem').length, 7)
assert.equal(courseRoster(data, 'demo-bio').length, 6)
assert.equal(courseRoster(data, 'demo-intensive').length, 7)
assert.equal(chem.length, 8)
assert.equal(bio.length, 8)
assert.ok(chem.every(c => c.lesson.course_id === 'demo-chem'))
assert.ok(bio.every(c => c.lesson.course_id === 'demo-bio'))
const before = cell(data).score
const unrelated = { ...data, work: data.work.map(w => w.lesson_ref.startsWith('demo-bio') ? { ...w, score: 0 } : w) }
assert.equal(cell(unrelated).score, before, 'Changing biology must not change chemistry')

const mark = data.marks.find(m => m.schedule_id === chem[0].events[0].id)
const unknown = { ...data, marks: data.marks.map(m => m === mark ? { ...m, attendance: { [student.id]: null } } : m) }
assert.equal(cell(unknown).present, null, 'Explicit null must not fall back to an old daily presence')
const absent = { ...data, marks: data.marks.map(m => m === mark ? { ...m, attendance: { [student.id]: false } } : m) }
assert.equal(cell(absent).present, false, 'False must remain an absence')
const watched = { ...absent, work: [...absent.work, { id: 'watch', student_id: student.id, lesson_ref: `video-${chem[0].id}`, status: 'completed', score: null, updated_at: '', attachments: { video: { completed: true } } }] }
assert.equal(cell(watched).studied, true)
assert.equal(cell(watched).present, false, 'Watching a recording must not erase absence')
const recording = { ...chem[0], lesson: { ...chem[0].lesson, delivery_mode: 'recording' } }
assert.equal(cell(data, student, recording).studied, false, 'Attendance cannot invent a video credit for a recording-only lesson')

const current = data.work.find(w => w.student_id === student.id && w.lesson_ref === chem[0].id)
const retake = { ...data, work: data.work.map(w => w === current ? { ...w, score: 35 } : w), attempts: [...data.attempts, {
  id: 'best-attempt', student_id: student.id, lesson_ref: chem[0].id, number: 2, status: 'completed', score: 98, passing_score: 80, submitted_at: '', review_comment: null,
}] }
assert.equal(cell(retake).score, 98)
assert.equal(cell(retake).latestScore, 35)
assert.equal(cell(retake).state, 'passed')
assert.equal(cell(retake).attempts.length, 2)
const pending = { ...data, attempts: [], work: data.work.map(w => w === current ? { ...w, status: 'submitted', score: 100,
  attachments: { v: 'basic-1', reviewRequired: true, rows: [{ type: 'text', verdict: 'review' }] } } : w) }
assert.equal(cell(pending).score, null)
assert.equal(cell(pending).state, 'pending')
assert.equal(journalSummary([cell(pending)], today).score, null, 'Pending manual marks must not inflate averages')
const zero = { ...data, attempts: [], work: data.work.map(w => w === current ? { ...w, score: 0 } : w) }
assert.equal(cell(zero).score, 0)
assert.equal(cell(zero).state, 'low')
const empty = { ...data, work: [], attempts: [], legacy: [] }
assert.equal(cell(empty).score, null)
assert.equal(cell(empty).state, 'overdue')
assert.equal(cell(empty, student, chem[0], '1900-01-01').state, 'future')
assert.equal(journalSummary([cell(empty, student, chem[0], '1900-01-01')], '1900-01-01').required, 0)
const optional = { ...chem[0], required: false, lesson: { ...chem[0].lesson, hwTask: [{ isHard: true }] } }
assert.equal(journalSummary([cell(empty, student, optional)], today).required, 0, 'Optional hard work must not create a debt')
const seeded = { ...empty, work: [{ ...current, status: 'current', score: 0, attachments: null }] }
assert.equal(cell(seeded, student, optional).required, false, 'Seeded lesson access state must not invent mandatory homework')
assert.equal(cell(seeded, student, optional).state, 'none')
const onlyHard = { ...empty, lessons: empty.lessons.map(l => l.id === chem[0].lesson.id ? { ...l, hwTask: [{ isHard: true }] } : l) }
assert.equal(journalColumns(onlyHard, 'demo-chem')[0].required, false)

const cancelledColumn = { ...chem[0], events: chem[0].events.map(e => ({ ...e, status: 'cancelled' })) }
const cancelled = cell(data, student, cancelledColumn)
assert.equal(cancelled.cancelled, true)
assert.equal(cancelled.attention, false)
assert.equal(journalSummary([cancelled], today).required, 0)
const overnightColumn = { ...optional, events: [{ ...chem[0].events[0], date: '2026-11-01', time_start: '23:00', time_end: '01:00', status: 'upcoming' }] }
const noMarks = { ...empty, marks: [] }
assert.equal(journalCell(noMarks, buildJournalIndex(noMarks), student, overnightColumn, '2026-11-02', '00:30').needsAttendance, false)
assert.equal(journalCell(noMarks, buildJournalIndex(noMarks), student, overnightColumn, '2026-11-02', '01:01').needsAttendance, true)

const groupEvent = chem[0].events[0]
const personal = { ...groupEvent, id: 'personal-same-lesson', student_id: student.id, group_id: null }
const personalData = { ...data, events: [...data.events, personal], marks: [...data.marks, { schedule_id: personal.id, attendance: { [student.id]: null } }] }
const personalColumn = { ...chem[0], events: [...chem[0].events, personal] }
assert.equal(cell(personalData, student, personalColumn).present, null, 'A personal event explicit null wins over a group mark')

const secondLesson = { ...groupEvent, id: 'another-course-same-day', lesson_id: bio[0].lesson.id, time_start: '20:00' }
const collisionData = { ...data, events: [...data.events, secondLesson], marks: [] }
assert.equal(cell(collisionData).present, null, 'Ambiguous old daily marks must not be attributed to either course')
assert.equal(cell(collisionData).grade, null)

const split = { ...empty, lessons: empty.lessons.map(l => l.id === chem[0].lesson.id ? { ...l, lesson_sched_manual: true, rec_date: '2026-11-20', rec_time: '12:00', recTask: [{}] } : l) }
const splitColumns = journalColumns(split, 'demo-chem')
assert.equal(splitColumns.filter(c => c.lesson.id === chem[0].lesson.id).length, 2)
assert.ok(splitColumns.some(c => c.id === `${chem[0].id}~rec`))

const standalone = { ...data, assignments: [{ id: 'outside-hw', lesson_id: null, group_id: student.groupId, title: 'Разовое ДЗ', due_date: '2026-01-01', status: 'active' }] }
const outside = journalColumns(standalone, OUTSIDE_COURSES)
assert.ok(outside.some(c => c.id === 'hw-outside-hw'))
assert.equal(cell(standalone, student, outside.find(c => c.id === 'hw-outside-hw')).state, 'overdue')
assert.equal(journalSummary([cell(standalone, student, outside.find(c => c.id === 'hw-outside-hw'))], today).studyTotal, 0)
const otherGroup = { ...student, id: 'other-group', groupId: 'other' }
assert.equal(cell(standalone, otherGroup, outside.find(c => c.id === 'hw-outside-hw')).applicable, false)

assert.equal(journalDate('01.11.2026'), '2026-11-01')
assert.equal(journalDate('bad'), null)
assert.ok(journalCsv([['=SUM(A1)', '+cmd', '@name', '-formula', 'Иван "Иванов"', 0]]).includes('"\'=SUM(A1)"'))
assert.ok(journalCsv([['Иван "Иванов"']]).includes('Иван ""Иванов""'))
console.log('Course journal: course isolation, direct enrolment, exact event marks, same-day collisions, recording credit, best attempts, pending review, zero scores, future work, optional hard work, cancellation, standalone assignments and safe CSV passed.')

// The local stand serves both teacher entry points from this rollup. Two enrollments of
// one learner and a reused external test must keep the same three independent works.
const { buildStandIndex, studentWorks, scopeSlots, workStats } = await import('../src/components/teacher/journalStand/studentWorks')
const person = { ...data.students[0], personId: 'stand-person' }
const otherCard = { ...person, id: 'another-enrollment', groupId: '' }
const standLesson = { ...data.lessons[0], hwTask: [{ type: 'testly' }], extraHw: [{ id: 'mixed', tasks: [{ type: 'testly' }, { type: 'single' }] }] }
const nativeWork = { id: 'native', title: 'Обычная домашка', status: 'active', lesson_id: null, group_id: person.groupId, basicTask: { type: 'single' } }
const snap = rows => ({ v: 'basic-1', rows, recommendationScore: 80 })
const external = { type: 'testly', testly: { testId: 'same-test', got: 0, max: 8 } }
const submission = (ref, owner, score, rows) => ({
  id: ref, student_id: owner.id, lesson_ref: ref, status: 'completed', score, updated_at: '2026-10-11T12:00:00Z', attachments: snap(rows),
})
const lab = {
  ...data, students: [person, otherCard], lessons: [standLesson], assignments: [nativeWork], attempts: [],
  work: [
    submission(standLesson.short_id, person, 0, [external]),
    submission('hw-native', otherCard, 75, [{ type: 'single' }]),
    submission(standLesson.short_id + '~mixed', person, 88, [{ type: 'single' }, { ...external, testly: { testId: 'same-test', got: 6, max: 8 } }]),
  ],
}
const rollup = (input, learner) => {
  const index = buildStandIndex(input)
  return studentWorks(input, index, learner, scopeSlots(index, { course: '*', module: '' }), '2026-11-01')
}
const combined = rollup(lab, person)
const attendanceWork = input => rollup(input, student).find(w => w.slot.ref === chem[0].id)
assert.equal(attendanceWork(personalData).attendanceCell.event.id, personal.id)
assert.equal(attendanceWork(personalData).attendanceCell.student.id, student.id)
const unscheduled = attendanceWork({ ...data, events: [] })
assert.equal(unscheduled.attendanceCell, undefined)
assert.equal(unscheduled.attendanceReason, 'Нет занятия в расписании')
assert.deepEqual(combined, rollup(lab, otherCard))
assert.deepEqual(combined.filter(w => w.submitted).map(w => w.source).sort(), ['Искра', 'Искра + Тестли', 'Тестли'].sort())
assert.equal(workStats(combined, '2026-11-01').average, 54)
assert.equal(workStats(combined, '2026-11-01').graded, 3)
const prior = { student_id: person.id, lesson_ref: standLesson.short_id, number: 1, status: 'completed', score: 8, submitted_at: '2026-10-11T12:00:00Z' }
const retry = rollup({ ...lab, work: [{...lab.work[0], status:'current', score:null, attachments:{...snap([external]),draft:true}}], attempts:[prior] }, person)
const opened = retry.find(w=>w.slot.ref===standLesson.short_id)
assert.equal(opened.score, 8)
assert.equal(opened.status, 'Пересдача')
const awaitingReview = rollup({...lab,work:[{...lab.work[0],status:'submitted',attachments:snap([{...external,testly:{...external.testly,pending:true}}])}]},person)
assert.equal(workStats(awaitingReview, '2026-11-01').graded, 0)
console.log('Journal stand: stable learner across enrollments, native and mixed assignments, reused Testly, zero, pending review and retake passed.')

// Four-week comparisons use distinct assignments and respect missing grades and timestamps.
const { studentOverview, groupOverview } = await import('../src/components/teacher/journalStand/overviewStats')
const end = '2026-11-01'
const assessments = [
  ['first',  '2026-10-05', 0,   'atom'],
  ['second', '2026-10-18', 70,  'atom'],
  ['third',  '2026-10-19', 80,  'ions'],
  ['fourth', '2026-11-01', 100, 'ions'],
  ['older',  '2026-10-04', 100, 'atom'],
  ['future', '2026-11-02', 100, 'ions'],
].map(([ref, day, score, topic]) => ({
  ...combined[0], slot: {...combined[0].slot, ref, date:day, due:day, topic:{id:topic, title:topic}, required:true},
  submitted:true, dates: ref === 'fourth' ? [] : [day], score, threshold:80, status:'Зачтено',
}))
const debt = {...assessments[0], submitted:false, dates:[], score:null, status:'Просрочено'}
const report = studentOverview([...assessments, {...debt, slot:{...debt.slot, ref:'missing'}}], end)
assert.deepEqual([report.before, report.after, report.delta], [35, 90, 55])
assert.equal(report.graded.length, 4)
assert.equal(report.focus.id,'atom')
assert.deepEqual(report.mastered.map(t => t.id), ['ions'])
assert.deepEqual([report.stats.timely,report.stats.due,report.debts.length], [3,4,1])
const partial = studentOverview([assessments[3]], end)
assert.equal(partial.delta,null)
assert.equal(partial.topics.length,0)
assert.equal(partial.hasDue,true)
assert.deepEqual([partial.stats.timely,partial.stats.due],[0,0])
const group = groupOverview([report, partial, studentOverview([],end)])
assert.deepEqual([group.average, group.checked, group.ungraded, group.debtors, group.focus.known], [70,5,1,1,1])
console.log('Stand overview: period boundaries, weighted class result, zero vs missing scores, topic pairs and unknown submission dates passed.')

// A lesson-linked assignment can lack assignedAt and retain a DD.MM.YYYY date.
// Rendering one such legacy row must not crash the entire teacher workspace.
const legacyDates = buildStandIndex({ ...lab,
  lessons: [{ ...standLesson, scheduled_date: '01.01.2020' }],
  assignments: [{ ...nativeWork, lesson_id: standLesson.id, assignedAt: null }],
})
assert.equal(legacyDates.slots.get('hw-' + nativeWork.id).date, '2020-01-01')
const malformedDateWork = { ...combined[0], submitted: false, score: null, dates: [], status: 'Не сдано',
  slot: { ...combined[0].slot, required: true, date: '2026-99-99', due: null } }
assert.equal(workStats([malformedDateWork], '2027-01-01').weeks, 0)
assert.equal(workStats([{ ...malformedDateWork, slot: { ...malformedDateWork.slot, date: '2026-02-31' } }], '2027-01-01').weeks, 0)
assert.equal(workStats([{ ...malformedDateWork, slot: { ...malformedDateWork.slot, date: '2026-02-28' } }], '2027-01-01').weeks, 1)
console.log('Journal dates: legacy lesson assignment date, invalid month/day and valid week aggregation passed.')
