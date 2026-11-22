import assert from 'node:assert/strict'
import { journalDemo } from '../src/data/courseJournalDemo'
import { buildStandIndex, studentWorks, scopeSlots, hasCourseTests, hasCourseTrials } from '../src/components/teacher/journalStand/studentWorks'
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
