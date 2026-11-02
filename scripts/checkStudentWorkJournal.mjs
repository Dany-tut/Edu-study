import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

let requests = []
let response = () => ({ data: [], error: null })
globalThis.__journalClient = { from(table) {
  const request = { table }
  const query = { then: (yes, no) => Promise.resolve().then(() => response(request)).then(yes, no) }
  for (const op of ['select', 'in', 'order', 'range', 'abortSignal']) {
    query[op] = (...args) => { request[op] = args; return query }
  }
  requests.push(request)
  return query
} }
const outfile = resolve('node_modules/.cache/checkStudentWorkJournal.mjs')
await build({ stdin: { contents: `
  export * from './src/lib/studentWorkJournal';
  export { homeworkResult } from './src/lib/homeworkResult';
  export { fetchStudentJournalHistory } from './src/lib/useStudentJournalHistory';
`, resolveDir: process.cwd() }, outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
  plugins: [{ name: 'transport', setup(b) { b.onLoad({ filter: /\/lib\/supabase\.ts$/ }, () => ({ contents: 'export const supabase = globalThis.__journalClient' })) } }] })
const { buildStudentWorkJournal, studentJournalSummary, homeworkResult, fetchStudentJournalHistory } = await import(pathToFileURL(outfile))
const student = '00000000-0000-0000-0000-000000000001'
const other = '00000000-0000-0000-0000-000000000002'
const course = { id: 'chem', ownerStudentId: student }
const entry = (id, status = 'current', result) => ({ id, course, lesson: { id, status, result, number: 0, title: id }, status: 'current' })
const attempt = (ref, score, status = 'completed', owner = student, number = 1) => ({ id: `${owner}:${ref}:${number}`, student_id: owner, lesson_ref: ref, number, score, status, passing_score: 80, submitted_at: '2026-11-01T00:00:00Z', review_comment: null, reviewed_at: null })
const entries = [entry('low', 'completed', homeworkResult(null, 3, 'completed')), entry('retake', 'current', homeworkResult({ draft: true }, null, 'current')),
  entry('pass', 'completed', homeworkResult(null, 91, 'completed')), entry('unsubmitted')]
const progress = { unsubmitted: { status: 'current', score: 0 }, orphan: { status: 'completed', score: 100 } }
const history = [attempt('retake', 8), attempt('low', 0, 'returned'), attempt('low', 100, 'completed', other)]
history[1].review_comment = 'Teacher comment on the returned attempt'
let rows = buildStudentWorkJournal(entries, progress, history, student)
assert.deepEqual(rows.map(w => w.score), [3, 8, 91, null], 'Ignore unsubmitted zeros, foreign student attempts and orphan progress')
assert.equal(rows[1].state, 'draft')
assert.equal(rows[0].attempts[0].review_comment, history[1].review_comment)
assert.deepEqual(studentJournalSummary(rows), { total: 4, graded: 3, average: 34, passed: 1, improve: 2, ungraded: 1 })
const waiting = entry('waiting', 'submitted', { grading: 'teacher', percent: null, pending: true, passingScore: 80, bestPercent: 90 })
rows = buildStudentWorkJournal([waiting], {}, [attempt('waiting', 90)], student)
assert.equal(rows[0].score, 90, 'Retain the previous final result during manual review')
assert.equal(rows[0].latestScore, null)
assert.equal(rows[0].state, 'pending')
assert.equal(buildStudentWorkJournal([entry('pending', 'submitted', homeworkResult({ reviewRequired: true }, 100, 'submitted'))], {}, [], student)[0].score, null, 'Never publish a provisional manual score')
const base = entry('base'); base.lesson.hasHard = true
const extra = { ...entry('base~extra'), extraId: 'extra' }
rows = buildStudentWorkJournal([base, extra], { base: { reviewComment: 'Base comment' }, 'base-hard': { status: 'completed', score: 75, reviewComment: 'Hard comment' } }, [], student)
assert.equal(rows.length, 3)
assert.equal(rows[1].hard, true)
assert.equal(rows[1].score, 75)
assert.equal(rows[1].comment, 'Hard comment')
assert.equal(rows[2].comment, null, 'Extra homework must not inherit the base review')
rows = buildStudentWorkJournal([{ ...entry('hard-only'), hardOnly: true }], {}, [], student)
assert.equal(rows.length, 1, 'Hard-only assignments must not create a phantom basic homework')
assert.equal(rows[0].hard, true)
assert.equal(rows[0].score, null)
const archived = entry('archived', 'current', { grading: 'unknown', percent: null, passingScore: 80, draft: true, attempts: [attempt('archived', 8)], attemptCount: 1 })
rows = buildStudentWorkJournal([archived], {}, null, student)
assert.equal(rows[0].score, 8, 'Keep store history when an update fails')
assert.equal(buildStudentWorkJournal([entry('new')], {}, null, student)[0].attemptCount, null, 'Unknown history is not zero attempts')
assert.equal(studentJournalSummary([]).average, null, 'An empty journal has no average')
assert.equal(studentJournalSummary(buildStudentWorkJournal([entry('zero', 'completed', homeworkResult(null, 0, 'completed'))], {}, [], student)).average, 0, 'A genuinely graded zero is a result')
const abort = new AbortController()
requests = []
response = request => ({ data: request.range[0] === 0 ? Array.from({ length: 500 }, (_, i) => ({ id: `${i}` })) : [{ id: 'tail' }], error: null })
assert.equal((await fetchStudentJournalHistory([student, student, 'invalid'], abort.signal)).length, 501)
assert.deepEqual(requests.map(r => r.range), [[0, 499], [500, 999]], 'Read the complete attempt history, not just the API cap')
assert.ok(requests.every(r => r.table === 'homework_attempts' && r.in[0] === 'student_id' && r.in[1].length === 1 && r.in[1][0] === student))
assert.ok(requests.every(r => !/answers|attachments/.test(r.select[0])), 'Do not fetch answer bodies for the journal')
response = () => ({ data: null, error: new Error('unavailable') })
await assert.rejects(() => fetchStudentJournalHistory([student], abort.signal), /unavailable/)
console.log('PASS: journal scores, archived attempts, pending reviews, scoped comments, hard/extra independence, full pagination and query failures.')
