// Regression checks for the real track/store functions. Only the Supabase transport
// is replaced; no account, credentials, or network access is used.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const storage = () => {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }
}
globalThis.localStorage = storage()
globalThis.sessionStorage = storage()
globalThis.window = { location: { search: '' }, addEventListener() {}, removeEventListener() {} }
let query = () => ({ data: [], error: null })
let rpc = () => ({ data: { rows: [], courses: [], progress: [] }, error: null })
globalThis.__trackTestClient = {
  from(table) {
    const request = { table, op: 'select', filters: [] }
    const chain = { then: (yes, no) => Promise.resolve().then(() => query(request)).then(yes, no) }
    for (const op of ['select', 'eq', 'in', 'or', 'is', 'gte', 'lte', 'order', 'maybeSingle', 'single', 'limit']) {
      chain[op] = (...args) => { request.filters.push([op, ...args]); return chain }
    }
    chain.upsert = (values, options) => { Object.assign(request, { op: 'upsert', values, options }); return chain }
    return chain
  },
  rpc: (...args) => Promise.resolve().then(() => rpc(...args)),
  functions: { invoke: async () => ({ data: null, error: null }) },
  auth: {
    getUser: async () => ({ data: { user: null } }),
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange() {},
  },
}
const outfile = resolve('node_modules/.cache/checkCourseTrack.bundle.mjs')
await build({
  stdin: { contents: `
    export { courseTrackWidth, courseResumeTarget } from './src/lib/courseTrackLayout';
    export { baseNodeShape } from './src/components/CourseNodeSilhouette';
    export { fetchStudentTrack, mergeSubjectsWithProgress, upsertLessonProgress, fetchScheduleDays, resolveScheduleLesson, computeStats, computeSubjectStats } from './src/lib/db';
    export { getDisplayLessonStatus, getTrackLessonStatus, getLessonScheduleState, getStudentScheduleState, lessonTrackStep, lessonScheduleDate } from './src/lib/lessonStatus';
    export { homeworkResult, homeworkDisplayScore, canRetakeHomework, gradedTrackResult } from './src/lib/homeworkResult';
    export { useStudentData, startCourseHomeworkRetake } from './src/store/studentDataStore';
    export { useDashboard } from './src/store/dashboardStore';
    export { useStudentTz } from './src/lib/studentTz';
    export { reconcileLessonAssessments, hardLevelState } from './src/lib/lessonAssessments';
    export { isCourseModuleLocked } from './src/lib/moduleAccess';
    export { buildFinalTestSubmission, saveFinalTestSubmission } from './src/lib/finalTestSubmission';
    export { parseBasicAnswers } from './src/lib/basicAnswers';
    export { homeworkStorageKey } from './src/lib/homeworkReset';
    export { lessonStudyProgress } from './src/lib/lessonStudyProgress';
    export { fetchLessonParticipation, applyLessonParticipation } from './src/lib/lessonParticipation';
  `, resolveDir: process.cwd() },
  outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
  define: { 'import.meta.env': JSON.stringify({ DEV: false }) },
  plugins: [{ name: 'fake-transport', setup(b) {
    b.onLoad({ filter: /\/lib\/supabase\.ts$/ }, () => ({ contents: `
      export const supabase = globalThis.__trackTestClient;
      export const SUPABASE_URL = 'https://stub.invalid';
      export const SUPABASE_KEY = 'stub';
    ` }))
    b.onLoad({ filter: /\/lib\/analytics\.ts$/ }, () => ({ contents: `
      export const trackEvent = () => {}; export const trackPath = () => {};
      export const trackPageView = () => {}; export const initAnalytics = () => {};
      export const trackNow = async () => {};
    ` }))
  } }],
})
const m = await import(pathToFileURL(outfile).href)
// Long courses preserve spacing and show at most fifteen lessons per viewport.
assert.equal(m.courseTrackWidth(1440, 15), 1440)
assert.equal(m.courseTrackWidth(1440, 50), 4800)
assert.ok(m.courseTrackWidth(375, 15) >= 128 + 14 * 88)
const resumeCourse = { activeModuleId: 3, modules: [
  { id: 1, lessons: [{ id: 'old-debt', status: 'returned' }] },
  { id: 3, lessons: [{ id: 'review', status: 'submitted' }, { id: 'resume', status: 'current' }] },
] }
assert.deepEqual(m.courseResumeTarget(resumeCourse), { moduleId: 3, lessonId: 'resume' })
assert.deepEqual(m.courseResumeTarget({ modules: [] }), { moduleId: undefined, lessonId: undefined })

// Shape follows the authored activity, including the two halves of a split lesson.
const attachedVideo = { kind: 'lesson', videoUrl: 'https://example.test/video', shape: 'diamond' }
assert.equal(m.baseNodeShape({ ...attachedVideo, status: 'unviewed' }), 'circle')
assert.equal(m.baseNodeShape({ ...attachedVideo, deliveryMode: 'recording', status: 'completed' }), 'screen')
assert.equal(m.baseNodeShape({ ...attachedVideo, nodeType: 'rec', deliveryMode: 'live' }), 'screen')
assert.equal(m.baseNodeShape({ ...attachedVideo, nodeType: 'lesson', deliveryMode: 'recording' }), 'circle')
assert.equal(m.baseNodeShape({ ...attachedVideo, kind: 'test', status: 'locked' }), 'token')
const student = '11111111-1111-4111-8111-111111111111'
const group = '22222222-2222-4222-8222-222222222222'
const session = { id: student, name: 'Test student', groupId: group }
localStorage.setItem('student_session', JSON.stringify(session))
m.useStudentTz.setState({ tz: 'Europe/Moscow', loaded: true })
const lesson = (id = 'lesson', status = 'locked') => ({ id, number: 0, title: id, subject: 'course', status, shape: 'circle' })
const subject = (modules, accessMode = 'custom') => ({ id: 'course', name: 'Course', progress: 0, activeModuleId: 1, accessMode, modules })
const progress = (status, score = 0) => ({ status, score, comment: '', reviewComment: '', reviewAttachments: { photos: [], board: null }, hardSubmitted: false, hardTaskBlocks: [], hardReviewBlocks: [] })
const catalog = subject([{ id: 1, label: 'One', lessons: [lesson(), { ...lesson('test'), kind: 'test' }] }])
const courseRow = { id: 'course-db', short_id: 'course', title: 'Course', subject: 'Химия', student_ids: [student], group_ids: [], course_modules: [{ position: 1, label: 'One', lessons: [{ short_id: 'lesson', title: 'lesson', lesson_number: 0 }] }] }
const payload = rows => ({ rows: [[student, group]], courses: [['course-db', 'course', 'Course', 'Химия', [student], [], [[1, 'One', [['lesson-db', 'lesson', 'lesson', 0, 'circle', false]]]]]], progress: rows })
const tuple = (status, score) => ['lesson', 'course', status, score, '', '', false]
const resetStore = () => {
  m.useStudentData.setState({ loaded: true, subjects: [catalog], progress: {}, scopeStudentIds: [] })
  m.useDashboard.setState({ lessonAssessments: {}, assessmentStudentId: student })
}
resetStore()

// Direct homework links must keep a split recording on its own assignment,
// even though extra homework links also use a tilde.
const splitId = 'direct-lesson'
const recId = splitId + '~rec'
const pair = [splitId, recId].map(id => ({
  ...lesson(id, 'current'), heavyPending: true, nodeType: id === recId ? 'rec' : 'lesson',
}))
m.useStudentData.setState({ subjects: [subject([{ id: 1, label: 'One', lessons: pair }])] })
query = () => ({ data: [{ short_id: splitId, homework: {
  hwTasks: [{ id: 'main' }], recHwTasks: [{ id: 'recording' }],
} }], error: null })
await new Promise(resolve => {
  const unsubscribe = m.useStudentData.subscribe(s => {
    if (s.subjects[0].modules[0].lessons.some(l => l.heavyPending)) return
    unsubscribe()
    resolve()
  })
  m.useStudentData.getState().ensureLessonHeavy(recId)
})
for (const [ref, id, task, extra] of [[recId, recId, 'recording', null], [splitId, splitId, 'main', null], [splitId + '~bonus', splitId, 'main', 'bonus']]) {
  m.useDashboard.getState().openHomeworkForLesson(ref, 'basic')
  const { activePage, currentLessonId, currentExtraHwId } = m.useDashboard.getState()
  assert.deepEqual([activePage, currentLessonId, currentExtraHwId], ['homework', id, extra])
  const selected = m.useStudentData.getState().subjects[0].modules[0].lessons.find(l => l.id === currentLessonId)
  assert.deepEqual(selected.homework.hwTasks.map(t => t.id), [task])
}
query = () => ({ data: [], error: null })
resetStore()

// Auto-scores must never promote pending work to accepted or unlock the test.
for (const score of [0, 45, 100]) {
  const merged = m.mergeSubjectsWithProgress([catalog], { lesson: progress('submitted', score) })[0]
  m.useDashboard.getState().setLessonAssessment('lesson', score, 0)
  assert.equal(m.getDisplayLessonStatus(merged.modules[0].lessons[0]), 'submitted_unknown')
  assert.equal(merged.progress, 0)
  assert.equal(merged.modules[0].lessons[1].status, 'locked')
}
assert.equal(m.getDisplayLessonStatus(lesson('lesson', 'returned')), 'returned')
assert.equal(m.getDisplayLessonStatus(lesson('lesson', 'completed')), 'completed')

// Understanding is explicit learner data, independent of grades and pending review.
const self = { value: 0, assessedAt: '2026-11-01T03:00:00.000Z' }
const selfSnapshot = { v: 'basic-1', selfAssessment: self, rows: [{ type: 'extended', verdict: 'review' }] }
const selfResult = m.homeworkResult(selfSnapshot, null, 'submitted')
assert.deepEqual(selfResult.selfAssessment, self)
assert.equal(selfResult.pending, true)
assert.equal(selfResult.percent, null)
assert.deepEqual(m.parseBasicAnswers(selfSnapshot).selfAssessment, self)
assert.equal(m.homeworkResult({ ...selfSnapshot, selfAssessment: { ...self, value: 5 } }, null).selfAssessment, null)
assert.equal(m.homeworkResult({ ...selfSnapshot, selfAssessment: { ...self, value: null } }, null).selfAssessment, null)
const selfProgress = { ...progress('submitted'), result: selfResult }
assert.equal(m.reconcileLessonAssessments({}, { lesson: selfProgress }, ['lesson']).lesson.emojiIndex, 0)
assert.equal(m.reconcileLessonAssessments({}, { lesson: selfProgress }, ['lesson']).lesson.score, undefined)
assert.equal(m.reconcileLessonAssessments({}, { lesson: progress('completed', 91) }, ['lesson']).lesson.emojiIndex, -1)
const previousSelf = { lesson: { emojiIndex: 4, selfAssessmentAttemptId: 'old', selfAssessedAt: self.assessedAt } }
assert.equal(m.reconcileLessonAssessments(previousSelf, { lesson: { ...progress('submitted'), result: { ...selfResult, selfAssessment: null, attemptId: 'new' } } }, ['lesson']).lesson.emojiIndex, -1)

// A finished auto-test is separate from both a recording and actual manual review.
const autoSnapshot = { v: 'basic-1', gradable: 1, correct: 0.08, rows: [
  { n: 1, type: 'testly', verdict: 'wrong', answer: 'сдал тест', testly: { testId: 'testly-2', got: 5, max: 63, pending: false } },
] }
for (const percent of [0, 8, 79, 80, 100]) {
  const result = m.homeworkResult(autoSnapshot, percent)
  assert.equal(result.grading, 'auto')
  assert.equal(result.percent, percent)
  assert.equal(m.getDisplayLessonStatus({ ...lesson('lesson', 'submitted'), result }), percent < 80 ? 'test_low' : 'test_passed')
}
assert.equal(m.getDisplayLessonStatus({ ...lesson('lesson', 'completed'), result: m.homeworkResult(autoSnapshot, 91) }), 'test_passed')
const pendingSnapshot = { ...autoSnapshot, rows: [{ ...autoSnapshot.rows[0], testly: { ...autoSnapshot.rows[0].testly, pending: true } }] }
assert.equal(m.homeworkResult(pendingSnapshot, 100).grading, 'teacher')
assert.equal(m.getDisplayLessonStatus({ ...lesson('lesson', 'submitted'), result: m.homeworkResult(pendingSnapshot, 100) }), 'submitted')
const manualSnapshot = { v: 'basic-1', reviewRequired: true, rows: [{ n: 1, type: 'extended', verdict: 'empty', answer: '' }] }
assert.equal(m.homeworkResult(manualSnapshot, 100).grading, 'teacher')
assert.equal(m.homeworkResult({ ...autoSnapshot, recommendationScore: 60 }, 70).passingScore, 60)
for (const snapshot of [null, {}, { v: 'basic-1', rows: [] }, { v: 'basic-1', rows: [null] }]) {
  assert.equal(m.homeworkResult(snapshot, 80).grading, 'unknown')
}
assert.equal(m.homeworkResult(autoSnapshot, null).grading, 'unknown')
assert.equal(m.homeworkResult({ ...autoSnapshot, rows: [{ ...autoSnapshot.rows[0], testly: { testId: 'testly-2' } }] }, 80).grading, 'unknown')
assert.equal(m.getDisplayLessonStatus({ ...lesson('lesson', 'returned'), result: m.homeworkResult(autoSnapshot, 8) }), 'returned')

// A mixed homework has ONE final score. No partial score or hard access while pending.
const pendingResult = m.homeworkResult(manualSnapshot, 100, 'submitted')
assert.equal(pendingResult.percent, null)
assert.equal(m.homeworkDisplayScore(pendingResult), null)
assert.equal(m.canRetakeHomework({...pendingResult,attemptId:'attempt'}), false)
const checkedResult = m.homeworkResult({...manualSnapshot,reviewedAt:'2026-11-01'},65,'completed')
assert.equal(checkedResult.percent,65)
assert.equal(m.canRetakeHomework({...checkedResult,attemptId:'attempt'}),true)
const history = [{id:'first',number:1,status:'completed',score:91,passing_score:80,submitted_at:'2026-10-30',review_comment:null}]
const best = m.homeworkResult(autoSnapshot,45,'completed',history)

// The card opens a server-confirmed draft under the owning enrolment, even if
// the active student has another account row. A failed request leaves the result intact.
const owner = '55555555-5555-4555-8555-555555555555'
const original = { ...history[0], score: 8 }
const originalProgress = { lesson: { ...progress('completed', 8),
  result: m.homeworkResult({ ...autoSnapshot, attemptId: original.id }, 8, 'completed', [original]),
} }
m.useStudentData.setState({
  progress: originalProgress, subjects: m.mergeSubjectsWithProgress([{ ...catalog, ownerStudentId: owner }], originalProgress),
})
const previousRpc = rpc
rpc = () => ({ data: null, error: new Error('offline') })
await assert.rejects(m.startCourseHomeworkRetake('course', 'lesson', original.id))
assert.equal(m.useStudentData.getState().progress, originalProgress)
rpc = (name, args) => {
  assert.equal(name, 'start_homework_retake')
  assert.deepEqual(args, { p_student: owner, p_ref: 'lesson', p_expected: original.id })
  return { data: { v: 'basic-1', draft: true, attemptId: 'second', testlyKey: 'iskra:second', rows: [], recommendationScore: 80 }, error: null }
}
await m.startCourseHomeworkRetake('course', 'lesson', original.id)
const retry = m.useStudentData.getState().progress.lesson
assert.equal(retry.result.attemptId, 'second')
assert.equal(retry.result.testlyKey, 'iskra:second')
assert.equal(retry.result.draft, true)
assert.equal(retry.score, null)
assert.equal(retry.result.bestPercent, 8)
assert.deepEqual(retry.result.attempts, [original])
assert.equal(m.useStudentData.getState().subjects[0].modules[0].lessons[0].result, retry.result)
assert.deepEqual(m.gradedTrackResult(retry), {status:'test_low', percent:8})
const submittedRetry = m.homeworkResult(manualSnapshot, null, 'submitted', [original])
assert.equal(submittedRetry.pending, true)
assert.deepEqual(m.gradedTrackResult({status:'submitted', result:submittedRetry}), {status:'test_low', percent:8})
assert.equal(m.gradedTrackResult({status:'submitted', result:pendingResult}), null)
const passedRetry = m.homeworkResult(autoSnapshot, 91, 'completed', [original])
assert.deepEqual(m.gradedTrackResult({status:'completed', result:passedRetry}), {status:'test_passed', percent:91})

// The same red node has a different next step before, during and after a retake.
const trackStep = (lesson, now) => m.lessonTrackStep(lesson, m.getDisplayLessonStatus(lesson, now))
assert.equal(trackStep({ ...lesson(), ...originalProgress.lesson }), 'retake')
assert.equal(trackStep({ ...lesson(), ...retry }), 'resume')
assert.equal(trackStep({ ...lesson('lesson', 'submitted'), result: submittedRetry }), 'review')
assert.equal(trackStep({ ...lesson('lesson', 'submitted'), result: pendingResult }), 'review')
assert.equal(trackStep({ ...lesson('lesson', 'completed'), result: passedRetry }), null)
assert.equal(trackStep({ ...lesson('lesson', 'completed'), result: passedRetry, videoUrl: 'https://example.test/video' }), 'watch')
assert.equal(trackStep({ ...lesson('lesson', 'completed'), result: passedRetry, videoUrl: 'https://example.test/video', attended: true }), null)
assert.equal(trackStep({ ...lesson(), ...originalProgress.lesson, kind: 'test' }), null)

// The legacy row has a grade, but no attempt id or answer snapshot. The server
// assigns its history id, and the card must use the archived grade immediately.
const legacyResult = m.homeworkResult(null, 45, 'completed')
assert.equal(m.canRetakeHomework(legacyResult), true)
assert.equal(m.canRetakeHomework(m.homeworkResult(null, 0, 'completed')), true)
assert.equal(m.canRetakeHomework(m.homeworkResult(null, 80, 'completed')), false)
assert.equal(m.canRetakeHomework(m.homeworkResult(null, 45, 'submitted')), false)
assert.equal(m.canRetakeHomework(m.homeworkResult(null, null, 'completed')), false)
const legacyProgress = { lesson: { ...progress('completed', 45), result: legacyResult } }
m.useStudentData.setState({ progress: legacyProgress, subjects: m.mergeSubjectsWithProgress([catalog], legacyProgress) })
const legacyNode = m.useStudentData.getState().subjects[0].modules[0].lessons[0]
assert.equal(m.getDisplayLessonStatus(legacyNode), 'test_low')
assert.equal(m.canRetakeHomework(legacyNode.result, legacyNode.status), true)
const archive = { ...original, id: 'archived', score: 43 } // teacher corrected the grade before the click
rpc = (name, args) => {
  assert.equal(name, 'start_legacy_homework_retake')
  assert.deepEqual(args, { p_student: student, p_ref: 'lesson' })
  return { data: { v: 'basic-1', draft: true, attemptId: 'new', archivedAttempt: archive, rows: [] }, error: null }
}
await m.startCourseHomeworkRetake('course','lesson',null)
await m.startCourseHomeworkRetake('course','lesson',null)
const legacyDraft = m.useStudentData.getState().progress.lesson.result
assert.equal(legacyDraft.draft, true)
assert.equal(legacyDraft.bestPercent, 43)
assert.equal(legacyDraft.attemptCount, 1)
assert.deepEqual(legacyDraft.attempts, [archive])
assert.deepEqual(m.gradedTrackResult({status:'current', result:legacyDraft}), {status:'test_low', percent:43})
rpc = previousRpc
resetStore()
assert.equal(m.homeworkDisplayScore(best),91)
assert.equal(best.passed,true)
assert.equal(m.canRetakeHomework({...best,attemptId:'attempt'}),false)
const pendingWithHistory = m.homeworkResult(manualSnapshot,100,'submitted',history)
assert.equal(m.homeworkDisplayScore(pendingWithHistory),null)
const pendingProgress = {...progress('submitted',100),result:pendingResult}
assert.equal(m.computeStats({lesson:pendingProgress}).avgScore,0)
assert.equal(m.reconcileLessonAssessments({}, {lesson:pendingProgress}, ['lesson']).lesson.score,undefined)
const mixedLesson = m.mergeSubjectsWithProgress([catalog],{lesson:pendingProgress})[0].modules[0].lessons[0]
assert.equal(mixedLesson.points,undefined)
const lower = m.homeworkResult(autoSnapshot,8,'completed')
const failedCourse = m.mergeSubjectsWithProgress([catalog],{lesson:{...progress('completed',8),result:lower}})[0]
assert.equal(failedCourse.progress,0)
assert.equal(failedCourse.modules[0].lessons[1].status,'locked')
const bestCourse = m.mergeSubjectsWithProgress([catalog],{lesson:{...progress('completed',45),result:best}})[0]
assert.equal(bestCourse.modules[0].lessons[0].points,91)
assert.equal(bestCourse.modules[0].lessons[1].status,'current')

// Server grades restore hard availability in a clean browser and replace stale grades.
let synced = m.reconcileLessonAssessments({}, { lesson: progress('completed', 95) }, ['lesson'])
assert.equal(m.hardLevelState(synced.lesson).available, true)
synced = m.reconcileLessonAssessments({ lesson: { score: 100, emojiIndex: 3, hardAvailable: true, hardStatus: 'completed' } }, { lesson: progress('returned', 45) }, ['lesson'])
assert.equal(synced.lesson.emojiIndex, 3)
assert.equal(synced.lesson.score, undefined)
assert.equal(m.hardLevelState(synced.lesson).status, 'locked')
assert.equal(synced.lesson.hardStatus, undefined)
for (const hardStatus of ['submitted', 'returned', 'completed']) {
  const current = m.reconcileLessonAssessments({}, { lesson: progress('completed', 45), 'lesson-hard': progress(hardStatus, 10) }, ['lesson'])
  assert.equal(m.hardLevelState(current.lesson).status, hardStatus)
  assert.equal(m.hardLevelState(current.lesson).available, true)
}
synced = m.reconcileLessonAssessments({}, { 'lesson-hard': progress('returned', 0) }, ['lesson'])
assert.equal(synced.lesson.score, undefined)
assert.equal(m.hardLevelState(synced.lesson).status, 'returned')
m.useDashboard.setState({ assessmentStudentId: 'another-student', lessonAssessments: { lesson: { score: 100, emojiIndex: 4 } } })
m.useDashboard.getState().syncLessonAssessments(student, { lesson: progress('completed', 95) }, ['lesson'])
assert.equal(m.useDashboard.getState().lessonAssessments.lesson.emojiIndex, -1)
assert.equal(m.hardLevelState({ score: 95, emojiIndex: 0, hardAvailable: false }).available, false)
assert.equal(m.hardLevelState(undefined).status, 'locked')
assert.equal(m.hardLevelState(undefined).visible, false)

const modules = [{ id: 1, label: 'One', lessons: [lesson('a', 'current')] }, { id: 2, label: 'Two', lessons: [lesson('b')] }]
assert.equal(m.isCourseModuleLocked(subject(modules, 'full'), 1), false)
assert.equal(m.isCourseModuleLocked(subject(modules), 1), true)
assert.equal(m.isCourseModuleLocked(subject([modules[0], { ...modules[1], lessons: [lesson('b', 'current')] }]), 1), false)
assert.equal(m.isCourseModuleLocked(subject(modules), 1, () => true), false)

// A lesson is not a recording while it is running or while no video exists.
const scheduled = { ...lesson(), videoUrl: 'https://example.test/video', scheduledDate: '01.11.2026', scheduledTime: '12:00' }
const scheduledSubject = subject([{ id: 1, label: 'One', lessons: [scheduled] }])
m.useStudentData.setState({ subjects: [scheduledSubject], scheduleDays: [{ date: '2026-11-01', lessons: [{ id: 'slot', subject: 'Course', lessonTitle: 'lesson', lessonNumber: 0, time: '12:00', endTime: '13:30' }] }] })
assert.equal(m.getDisplayLessonStatus(scheduled, new Date('2026-11-01T12:00:01+03:00')), 'current')
const runningNow = new Date('2026-11-01T12:01:00+03:00')
const slot = m.useStudentData.getState().scheduleDays[0].lessons[0]
assert.equal(m.getStudentScheduleState(slot, '2026-11-01', runningNow, 'Europe/Moscow', [scheduledSubject]).phase, 'scheduled_now')
assert.equal(m.getLessonScheduleState(scheduled, runningNow).phase, 'scheduled_now')
assert.equal(m.getTrackLessonStatus({ ...scheduled, status: 'unviewed' }, runningNow), 'today')
for (const status of ['live', 'completed', 'cancelled']) {
  m.useStudentData.setState({ scheduleDays: [{ date: '2026-11-01', lessons: [{ ...slot, status }] }] })
  assert.equal(m.getLessonScheduleState(scheduled, runningNow).phase, status)
  assert.equal(m.getStudentScheduleState({ ...slot, status }, '2026-11-01', runningNow, 'Europe/Moscow', [scheduledSubject]).phase, status)
}
m.useStudentData.setState({ scheduleDays: [{ date: '2026-11-01', lessons: [{ ...slot, status: 'live' }] }] })
assert.equal(m.getTrackLessonStatus({ ...scheduled, status: 'completed', result: { ...pendingResult, passed: true, pending: false } }, runningNow), 'test_passed')
assert.equal(m.getTrackLessonStatus({ ...scheduled, kind: 'test', status: 'locked' }, runningNow), 'locked')
m.useStudentData.setState({ scheduleDays: [{ date: '2026-11-01', lessons: [slot] }] })
assert.equal(m.getDisplayLessonStatus(scheduled, new Date('2026-11-01T13:31:00+03:00')), 'unviewed')
assert.equal(m.getDisplayLessonStatus({ ...scheduled, videoUrl: undefined }, new Date('2026-11-01T13:31:00+03:00')), 'current')
assert.equal(m.getDisplayLessonStatus({ ...scheduled, kind: 'test', status: 'current' }, new Date('2026-11-01T13:31:00+03:00')), 'current')
m.useStudentData.setState({ scheduleDays: [] })
assert.equal(m.getDisplayLessonStatus(scheduled, new Date('2026-11-05T12:00:00+03:00')), 'unviewed')
const dayAfter = new Date('2026-11-02T12:00:00+03:00')
const open = { ...scheduled, status: 'current', videoUrl: undefined }
assert.equal(m.getTrackLessonStatus(open, new Date('2026-11-01T23:59:59+03:00')), 'today')
assert.equal(m.getTrackLessonStatus(open, new Date('2026-11-02T00:00:00+03:00')), 'current')
assert.equal(m.getTrackLessonStatus({ ...open, scheduledDate: undefined }, dayAfter), 'current')
assert.equal(m.getTrackLessonStatus({ ...open, scheduledDate: '03.11.2026' }, dayAfter), 'current')
assert.equal(m.getTrackLessonStatus({ ...open, kind: 'test', status: 'locked' }, dayAfter), 'locked')
assert.equal(m.getTrackLessonStatus(scheduled, dayAfter), 'unviewed')
assert.equal(m.getTrackLessonStatus({ ...open, status: 'submitted', result: pendingResult }, dayAfter), 'submitted')
assert.equal(trackStep(scheduled, dayAfter), 'watch')
assert.equal(trackStep({ ...scheduled, videoUrl: undefined }, dayAfter), null)
assert.equal(m.lessonScheduleDate(scheduled, 'short'), '01.11')
assert.equal(m.lessonScheduleDate(lesson(), 'short'), null)
assert.equal(m.getDisplayLessonStatus({ ...scheduled, scheduledDate: '06.11.2026' }, new Date('2026-11-05T12:00:00+03:00')), 'locked')
m.useStudentTz.setState({ tz: 'Asia/Bangkok' })
assert.equal(m.getTrackLessonStatus({ ...open, scheduledTime: '23:00' }, new Date('2026-11-02T01:00:00+07:00')), 'today')
assert.equal(m.lessonScheduleDate({ ...scheduled, scheduledTime: '23:00' }, 'long'), '2 ноября')
assert.equal(m.getDisplayLessonStatus({ ...scheduled, scheduledDate: '2026-11-01', scheduledTime: '23:00' }, new Date('2026-11-01T21:00:00+07:00')), 'locked')
m.useStudentTz.setState({ tz: 'Europe/Moscow' })

// Presence grants lesson credit, never homework credit or fake video coverage.
const partialWatch = { position: 20, duration: 100, ranges: [[0, 20]], completed: false, updatedAt: '' }
const attendedLesson = { ...scheduled, deliveryMode: 'live', attended: true, watch: partialWatch }
assert.deepEqual(m.lessonStudyProgress(attendedLesson), { attended: true, completed: true, percent: 100 })
assert.deepEqual(partialWatch.ranges, [[0, 20]])
assert.equal(partialWatch.completed, false)
assert.equal(m.getDisplayLessonStatus({ ...attendedLesson, status: 'unviewed' }), 'current')
assert.equal(m.getDisplayLessonStatus(attendedLesson, new Date('2026-11-05T12:00:00+03:00')), 'current')
assert.deepEqual(m.lessonStudyProgress({ ...attendedLesson, deliveryMode: 'recording' }), { attended: false, completed: false, percent: 20 })
assert.deepEqual(m.lessonStudyProgress({ ...attendedLesson, attended: false }), { attended: false, completed: false, percent: 20 })
assert.equal(m.lessonStudyProgress({ ...attendedLesson, attended: false, watch: { ...partialWatch, completed: true, ranges: [[0, 90]] } }).completed, true)
assert.equal(m.getDisplayLessonStatus({ ...attendedLesson, status: 'submitted', result: lower }), 'test_low')
const participationCatalog = [{ ...scheduledSubject, ownerStudentId: student }]
rpc = (name, args) => {
  assert.equal(name, 'student_lesson_participation')
  assert.equal(args.p_student, student)
  return { data: [{ lesson_ref: 'lesson', delivery_mode: 'live', attended: true }], error: null }
}
const participation = await m.fetchLessonParticipation(participationCatalog)
const credited = m.applyLessonParticipation(participationCatalog, participation)
assert.equal(credited[0].modules[0].lessons[0].attended, true)
assert.equal(m.applyLessonParticipation(credited, new Map())[0].modules[0].lessons[0].attended, true)
assert.equal(m.applyLessonParticipation(credited, new Map([[`${student}:lesson`, { lesson_ref: 'lesson', delivery_mode: 'live', attended: false }]]))[0].modules[0].lessons[0].attended, false)
assert.equal(m.applyLessonParticipation([{ ...scheduledSubject, ownerStudentId: 'another-student' }], participation)[0].modules[0].lessons[0].attended, undefined)
const withPresence = m.mergeSubjectsWithProgress(credited, {})[0]
assert.equal(withPresence.progress, 0)
assert.equal(withPresence.modules[0].lessons[0].attended, true)

// The real schedule projection keeps an overnight end date, including after TZ conversion.
const calendarDate = new Date()
const dateText = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = dateText(calendarDate)
const tomorrow = new Date(calendarDate); tomorrow.setDate(tomorrow.getDate() + 1)
rpc = () => ({ data: [], error: null })
query = request => ({ data: request.table === 'schedule_lessons'
  ? [{ id: 'overnight', date: today, time_start: '23:30:00', time_end: '00:30:00', status: 'live', subject: 'Course', lesson_title: 'lesson', lesson_number: 0 }]
  : [], error: null })
let days = await m.fetchScheduleDays(group, student)
let overnight = days.flatMap(d => d.lessons).find(l => l.id === 'overnight')
assert.equal(overnight.endDate, dateText(tomorrow))
assert.equal(overnight.endTime, '00:30')
assert.equal(overnight.status, 'live')
assert.equal(overnight.startsAt, `${today}T23:30:00+03:00`)
// An explicit live event stays live until the teacher completes it, even on overrun.
m.useStudentData.setState({ subjects: [scheduledSubject], scheduleDays: days })
assert.equal(m.getLessonScheduleState(scheduled, new Date(`${dateText(tomorrow)}T00:31:00+03:00`)).phase, 'live')
days = days.map(day => ({ ...day, lessons: day.lessons.map(l => ({ ...l, status: undefined })) }))
m.useStudentData.setState({ subjects: [scheduledSubject], scheduleDays: days })
assert.equal(m.getDisplayLessonStatus(scheduled, new Date(`${today}T23:45:00+03:00`)), 'current')
assert.equal(m.getDisplayLessonStatus(scheduled, new Date(`${dateText(tomorrow)}T00:31:00+03:00`)), 'unviewed')
m.useStudentTz.setState({ tz: 'Asia/Bangkok' })
days = await m.fetchScheduleDays(group, student)
overnight = days.flatMap(d => d.lessons).find(l => l.id === 'overnight')
assert.equal(overnight.time, '03:30')
assert.equal(overnight.status, 'live')
query = request => ({ data: request.table === 'schedule_lessons'
  ? [{ id: 'cancelled-slot', date: today, time_start: '12:00:00', status: 'cancelled', subject: 'Course', lesson_title: 'lesson', lesson_number: 0 }]
  : [], error: null })
assert.equal((await m.fetchScheduleDays(group, student)).flatMap(day => day.lessons).find(l => l.id === 'cancelled-slot')?.status, 'cancelled')
assert.equal(overnight.endTime, '04:30')
assert.equal(overnight.endDate, dateText(tomorrow))
m.useStudentTz.setState({ tz: 'Europe/Moscow' })

// Save the raw answers AND the existing readable teacher snapshot, including zero-index choice.
const tasks = [{ id: 'choice', type: 'single', label: 'Choose', choices: ['Yes', 'No'], correctChoices: [0] }, { id: 'essay', type: 'extended', label: 'Explain' }]
const answers = { choice: 0, essay: 'My full answer' }
const built = m.buildFinalTestSubmission(tasks, answers)
assert.equal(built.score, 100)
assert.deepEqual(built.attachments.test, { tasks, answers })
assert.equal(m.parseBasicAnswers(built.attachments).rows[0].answer, 'Yes')
assert.equal(built.attachments.rows[1].verdict, 'review')
assert.equal(built.attachments.reviewRequired, true)
assert.equal(m.buildFinalTestSubmission(tasks.slice(0, 1), answers).attachments.reviewRequired, false)
let stored
query = request => { stored = request; return { data: null, error: null } }
await m.saveFinalTestSubmission(student, { ...lesson('test'), testTasks: tasks }, answers)
assert.deepEqual(stored.values.attachments.test.answers, answers)
assert.equal(stored.values.status, 'submitted')
assert.equal(stored.options.onConflict, 'student_id,lesson_ref')
const denied = { message: 'simulated RLS failure', code: '42501' }
query = () => ({ data: null, error: denied })
await assert.rejects(m.saveFinalTestSubmission(student, { ...lesson('test'), testTasks: tasks }, answers), error => error === denied)
query = () => { throw new Error('simulated disconnect') }
await assert.rejects(m.saveFinalTestSubmission(student, { ...lesson('test'), testTasks: tasks }, answers), /disconnect/)

rpc = () => ({ data: { rows: [[student, group]], courses: [] }, error: null })
assert.equal((await m.fetchStudentTrack(session)).progress, null)

// Exercise the actual lightweight metadata query and merge, not just the classifier.
rpc = () => ({ data: payload([tuple('submitted', 8)]), error: null })
query = request => ({ data: request.table === 'lesson_progress' ? [{
  lesson_ref: 'lesson', status: 'submitted', score: 8, snapshot: 'basic-1',
  answer_rows: autoSnapshot.rows, review_required: false, passing_score: 80,
}] : [], error: null })
let resultTrack = await m.fetchStudentTrack(session)
let resultLesson = m.mergeSubjectsWithProgress(resultTrack.subjects, resultTrack.progress)[0].modules[0].lessons[0]
assert.equal(m.getDisplayLessonStatus(resultLesson), 'test_low')
assert.equal(resultLesson.result.percent, 8)
query = () => ({ data: null, error: { message: 'grading metadata unavailable' } })
resultTrack = await m.fetchStudentTrack(session)
resultLesson = m.mergeSubjectsWithProgress(resultTrack.subjects, resultTrack.progress)[0].modules[0].lessons[0]
assert.equal(m.getDisplayLessonStatus(resultLesson), 'submitted_unknown')

// RPC + fallback progress failures must not erase the last known grades or old drafts.
resetStore()
const draftKey = m.homeworkStorageKey('lesson')
const draft = JSON.stringify({ basicSubmitted: true, submittedAt: '2020-01-01T00:00:00Z', basicAnswers: { x: 'Do not lose me' } })
localStorage.setItem(draftKey, draft)
rpc = name => name === 'student_track' ? { data: null, error: { message: 'RPC unavailable' } } : { data: [], error: null }
query = request => request.table === 'courses' ? { data: [courseRow], error: null }
  : request.table === 'lesson_progress' ? { data: null, error: { message: 'progress unavailable' } }
    : { data: [], error: null }
assert.equal((await m.fetchStudentTrack(session)).progress, null)
m.useStudentData.setState({ progress: { lesson: progress('completed', 95) } })
await m.useStudentData.getState().load({ afterTestlySync: true })
assert.equal(localStorage.getItem(draftKey), draft)
assert.equal(m.useStudentData.getState().progress.lesson.status, 'completed')

// A successful empty progress response still reconciles an actual reset.
query = () => ({ data: [], error: null })
rpc = () => ({ data: payload([]), error: null })
await m.useStudentData.getState().load({ afterTestlySync: true })
assert.equal(localStorage.getItem(draftKey), null)
assert.deepEqual(m.useStudentData.getState().progress, {})

// Reverse completion order: an older empty snapshot cannot wipe a newer submission.
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const old = deferred(), fresh = deferred(), started = deferred()
let reads = 0
rpc = name => {
  if (name !== 'student_track') return { data: [], error: null }
  reads++
  if (reads === 1) { started.resolve(); return old.promise }
  return fresh.promise
}
localStorage.setItem(draftKey, draft)
const oldLoad = m.useStudentData.getState().load({ afterTestlySync: true })
await started.promise
const freshLoad = m.useStudentData.getState().load({ afterTestlySync: true })
fresh.resolve({ data: payload([tuple('completed', 95)]), error: null })
await freshLoad
old.resolve({ data: payload([]), error: null })
await oldLoad
assert.equal(m.useStudentData.getState().progress.lesson.status, 'completed')
assert.equal(m.useDashboard.getState().lessonAssessments.lesson.score, 95)
assert.equal(localStorage.getItem(draftKey), draft)
assert.deepEqual(m.useStudentData.getState().scopeStudentIds, [student])
console.log('PASS: track status, module access, recording timing, server grades, test answers/write errors, failed sync/reset, out-of-order loads')

// A slow external service cannot hold the initial cabinet, and the confirmed
// second read must still apply its result before reconciling local answers.
resetStore()
localStorage.setItem('student_session', JSON.stringify(session))
localStorage.setItem(draftKey,draft)
const external = deferred()
globalThis.__trackTestClient.functions.invoke = () => external.promise
rpc = name => ({data:name === 'student_track' ? payload([]) : [],error:null})
query = () => ({data:[],error:null})
await m.useStudentData.getState().load()
assert.equal(m.useStudentData.getState().loaded,true,'Cabinet must open before external sync')
assert.equal(localStorage.getItem(draftKey),draft,'Unreconciled external answers must be retained')
rpc = name => ({data:name === 'student_track' ? payload([tuple('completed',95)]) : [],error:null})
external.resolve({data:{ok:true},error:null})
for(let i=0;i<50 && m.useStudentData.getState().progress.lesson?.score !== 95;i++) await new Promise(r=>setTimeout(r,0))
assert.equal(m.useStudentData.getState().progress.lesson.score,95,'External sync must trigger a fresh database read')
assert.equal(localStorage.getItem(draftKey),draft)
const switched = deferred()
globalThis.__trackTestClient.functions.invoke = () => switched.promise
await m.useStudentData.getState().load()
localStorage.setItem('student_session',JSON.stringify({...session,id:owner}))
const beforeSwitch = m.useStudentData.getState().progress
switched.resolve({data:{ok:true},error:null})
await new Promise(r=>setTimeout(r,0))
assert.equal(m.useStudentData.getState().progress,beforeSwitch,'Old external response must not refresh another account')
console.log('PASS: nonblocking external sync, preserved drafts, confirmed grade refresh and account isolation')

// Stable schedule links win over duplicate titles/numbers and stale display names.
{
  const first = { ...scheduledSubject, id: 'first', modules: [{ id: 1, label: 'One', lessons: [{ ...scheduled, dbId: 'uuid-first' }] }] }
  const target = { ...scheduledSubject, id: 'second', modules: [{ id: 1, label: 'One', lessons: [{ ...scheduled, id: 'second-node', dbId: 'uuid-second' }] }] }
  const event = { ...slot, lessonId: 'uuid-second' }
  assert.equal(m.resolveScheduleLesson(event, [first, target]).lesson.id, 'second-node')
  assert.equal(m.resolveScheduleLesson({ ...event, lessonId: 'deleted-uuid' }, [first, target]).lesson, null)
  const split = { ...target, modules: [{ id: 1, label: 'One', lessons: [
    { ...target.modules[0].lessons[0], nodeType: 'lesson' },
    { ...target.modules[0].lessons[0], id: 'second-node~rec', nodeType: 'rec' },
  ] }] }
  assert.equal(m.resolveScheduleLesson({ ...event, kind: 'rec' }, [split]).lesson.id, 'second-node~rec')
  assert.equal(m.resolveScheduleLesson({ ...event, kind: 'lesson' }, [split]).lesson.id, 'second-node')
  assert.equal(m.resolveScheduleLesson({ ...event, kind: 'rec' }, [target]).lesson.id, 'second-node')
  assert.equal(m.resolveScheduleLesson(slot, [first]).lesson.id, scheduled.id)
}
// Deduplicate group/direct copies, retaining distinct linked lessons and node kinds.
{
  const base = { date: today, time_start: '12:00', subject: 'Course', lesson_title: 'same', lesson_number: 1 }
  query = request => ({ data: request.table === 'schedule_lessons' ? [
    { ...base, id: 'one', lesson_id: 'uuid-one', node_type: 'lesson' },
    { ...base, id: 'copy', lesson_id: 'uuid-one', node_type: 'lesson' },
    { ...base, id: 'two', lesson_id: 'uuid-two', node_type: 'lesson' },
    { ...base, id: 'rec', lesson_id: 'uuid-one', node_type: 'rec' },
  ] : [], error: null })
  const rows = (await m.fetchScheduleDays(group, student)).flatMap(day => day.lessons)
  assert.deepEqual(rows.map(row => row.id), ['one', 'two', 'rec'])
  assert.equal(rows[0].lessonId, 'uuid-one')
}

// A failed calendar request must not erase the last confirmed schedule.
{
  const saved = m.useStudentData.getState().scheduleDays
  rpc = name => ({ data: name === 'student_track' ? payload([]) : [], error: null })
  query = request => request.table === 'schedule_lessons'
    ? { data: null, error: { message: 'calendar disconnected' } }
    : { data: [], error: null }
  await assert.rejects(m.fetchScheduleDays(group, student))
  await m.useStudentData.getState().load({ afterTestlySync: true })
  assert.deepEqual(m.useStudentData.getState().scheduleDays, saved)
}
console.log('PASS: stable calendar links, distinct same-title events and failed-calendar preservation')

// Screenshot regression: a course date without a time still appears on its day.
{
  rpc = () => ({ data: [], error: null })
  query = request => ({ data: request.table === 'courses' ? [{
    id: 'course-uuid', short_id: 'dated-course', title: 'Chemistry', subject: 'Chemistry', student_ids: [student], group_ids: [],
    course_modules: [{ position: 1, label: 'Module', lessons: [{
      id: 'dated-uuid', short_id: 'dated', title: 'Task 31', lesson_number: 5,
      scheduled_date: today.split('-').reverse().join('.'), scheduled_time: null,
    }] }],
  }] : [], error: null })
  const days = await m.fetchScheduleDays(group, student)
  const row = days.find(day => day.date === today).lessons[0]
  assert.equal(row.lessonId, 'dated-uuid')
  assert.equal(row.time, '')
  assert.equal(row.startsAt, undefined)
}
console.log('PASS: dated material without a time is visible in the calendar')

// A failed course calendar projection must not claim that dated materials are absent.
{
  query = request => request.table === 'courses'
    ? { data: null, error: { message: 'course calendar projection disconnected' } }
    : { data: [], error: null }
  await assert.rejects(m.fetchScheduleDays(group, student))
}

// The reported lesson must resolve to the same November 2 date in track and calendar.
{
  const course = { id: 'c6177343-59bf-4a34-a441-c1259f4ac248', short_id: '1qwsds', title: 'Тыквенный спас', subject: 'Химия', student_ids: [student], group_ids: [],
    course_modules: [{ position: 1, label: 'Уроки', lessons: [{ id: '12af15db-21cd-42b6-aa06-ded9f7e789f3', short_id: '1qwsds-5', title: 'Задания №31', lesson_number: 5, scheduled_date: '02.11.2026', scheduled_time: null }] }] }
  query = request => ({ data: request.table === 'courses' ? [course] : [], error: null })
  for (const tz of ['Europe/Moscow', 'Asia/Bangkok', 'America/New_York']) {
    m.useStudentTz.setState({ tz })
    const days = await m.fetchScheduleDays(group, student, { from: '2026-11-01', to: '2026-11-03' })
    const item = days.find(day => day.date === '2026-11-02').lessons[0]
    const node = { id: '1qwsds-5', dbId: item.lessonId, title: item.lessonTitle, number: 5, scheduledDate: '02.11.2026', status: 'current' }
    const subjects = [{ id: '1qwsds', name: 'Тыквенный спас', modules: [{ id: 1, label: 'Уроки', lessons: [node] }] }]
    m.useStudentData.setState({ subjects, scheduleDays: days })
    assert.equal(m.resolveScheduleLesson(item, subjects).lesson.id, node.id)
    assert.equal(m.lessonScheduleDate(node, 'long'), '2 ноября')
    assert.equal(m.getLessonScheduleState(node, new Date('2026-11-02T12:00:00Z')).isToday, true)
    assert.equal(m.getTrackLessonStatus(node, new Date('2026-11-02T12:00:00Z')), 'today')
  }
}
console.log('PASS: reported November 2 lesson shares its calendar and track date in Moscow, Bangkok and New York')
