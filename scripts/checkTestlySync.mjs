import assert from 'node:assert/strict'
import { applyTestlyResult, courseOwnerRow, ensureTestlySnapshots, testlySnapshotFor } from '../supabase/functions/_shared/testlyProgress.ts'
const original = { v: 'basic-1', gradable: 2, correct: 1, rows: [
  { n: 1, type: 'single', answer: 'A', verdict: 'correct' },
  { n: 2, type: 'testly', answer: '', verdict: 'empty', testly: { testId: 'test' } },
] }
const result = { state: 'submitted', got: 0, max: 36, submittedAt: '2026-10-31T15:45:26Z', pending: false }
const zero = applyTestlyResult(original, 'test', result)
assert.equal(zero.score, 50)
assert.equal(zero.attachments.rows[1].verdict, 'wrong')
assert.equal(zero.attachments.rows[1].testly.got, 0)
assert.ok(zero.attachments.rows[1].answer)
assert.deepEqual(zero.attachments.rows[0], original.rows[0])
assert.equal(applyTestlyResult(zero.attachments, 'test', result), null)
assert.equal(applyTestlyResult(original, 'other-test', result), null)
assert.equal(applyTestlyResult(original, 'test', { ...result, state: 'started' }), null)
const partial = applyTestlyResult(zero.attachments, 'test', { ...result, got: 18, pending: true })
assert.equal(partial.score, 75)
assert.equal(partial.attachments.rows[1].verdict, 'review')
const full = applyTestlyResult(partial.attachments, 'test', { ...result, got: 36 })
assert.equal(full.score, 100)
assert.equal(full.attachments.rows[1].verdict, 'correct')
console.log('PASS: zero, mixed homework, partial score, teacher review, repeated delivery, unrelated tests')

const reopened = applyTestlyResult(full.attachments, 'test', { state: 'started', updatedAt: '2026-10-31T16:00:00Z' }, 'submitted')
assert.equal(reopened.status, 'returned')
assert.equal(reopened.score, 100) // Keep the previous grade while correcting answers.
assert.equal(reopened.attachments.rows[1].testly.returned, true)
assert.equal(reopened.attachments.rows[1].answer, '')
assert.equal(applyTestlyResult(reopened.attachments, 'test', result, 'returned'), null) // Stale response.
assert.equal(applyTestlyResult(reopened.attachments, 'test', { state: 'started' }, 'returned'), null) // Retry.
const resubmitted = applyTestlyResult(reopened.attachments, 'test', { ...result, got: 18, submittedAt: '2026-10-31T16:10:00Z' }, 'returned')
assert.equal(resubmitted.status, 'submitted')
assert.equal(resubmitted.score, 75)
assert.equal(resubmitted.attachments.rows[1].testly.returned, false)
assert.equal(applyTestlyResult(resubmitted.attachments, 'test', { ...result, got: 18, submittedAt: '2026-10-31T16:10:00Z' }, 'submitted'), null)
console.log('PASS: return, preserved previous grade, stale response, retry, resubmission')

const roundedSnapshot = { v: 'basic-1', gradable: 1, correct: 0.03, rows: [{ type: 'testly', answer: 'done', verdict: 'wrong', testly: { testId: 'test', got: 1, max: 36 } }] }
assert.equal(applyTestlyResult(roundedSnapshot, 'test', { ...result, got: 3 }).score, 8)
console.log('PASS: repeated corrections do not accumulate rounded score error')

const tasks = [{ id: 'a', type: 'testly', isHard: false, question: 'Членистоногие', testly: { id: 'kw', title: 'Членистоногие' } }]
const done = { state: 'submitted', got: 36, max: 47, pending: false, submittedAt: '2026-11-23T20:15:23Z' }
const built = testlySnapshotFor(tasks, 'kw', done)
assert.equal(built.status, 'submitted')
assert.equal(built.score, 77)
assert.equal(built.attachments.draft, false)
assert.equal(built.attachments.rows[0].testly.got, 36)
assert.equal(built.attachments.rows[0].prompt, 'Членистоногие')
assert.equal(testlySnapshotFor(tasks, 'kw', { state: 'started' }), null)
assert.equal(testlySnapshotFor(tasks, 'other', done), null)
assert.equal(testlySnapshotFor([...tasks, { type: 'single', isHard: false }], 'kw', done), null) // Mixed homework stays with the screen.
const two = testlySnapshotFor([...tasks, { type: 'testly', testly: { id: 'second' } }], 'kw', done)
assert.equal(two.attachments.draft, true)
assert.equal(two.status, 'current')
assert.equal(testlySnapshotFor(tasks, 'kw', { ...done, pending: true }).attachments.rows[0].verdict, 'review')
console.log('PASS: snapshot for Testly-only homework, started, unrelated, mixed, two tests, pending')

const personal = { id: 'personal', group_id: 'g2', auth_user_id: 'u' }
const grouped = { id: 'grouped', group_id: 'g1', auth_user_id: 'u' }
assert.equal(courseOwnerRow([grouped, personal], { student_ids: ['personal'], group_ids: ['g1'] }).id, 'personal')
assert.equal(courseOwnerRow([personal, grouped], { student_ids: [], group_ids: ['g1'] }).id, 'grouped')
assert.equal(courseOwnerRow([personal], { student_ids: [], group_ids: ['g1'] }), undefined)
console.log('PASS: course owner row')

function fakeDb(progress) {
  const writes = []
  const table = name => {
    const q = { filters: {}, op: 'select', payload: null }
    const api = {
      select: () => api, contains: () => api, in: () => api, maybeSingle: () => api,
      eq: (k, v) => { q.filters[k] = v; return api },
      update: p => { q.op = 'update'; q.payload = p; return api },
      insert: p => { q.op = 'insert'; q.payload = p; return api },
      then: (ok, bad) => {
        let out = { data: null, error: null }
        if (q.op !== 'select') writes.push({ name, ...q })
        else if (name === 'lessons') out.data = [{ short_id: 'c-37', course_id: 'c', homework: { hwTasks: tasks } }]
        else if (name === 'courses') out.data = [{ id: 'c', short_id: 'c', status: 'published', student_ids: [], group_ids: ['g1'] }]
        else if (name === 'lesson_progress') out.data = progress
        return Promise.resolve(out).then(ok, bad)
      },
    }
    return api
  }
  return { db: { from: table }, writes }
}
let f = fakeDb({ id: 'p', status: 'current', attachments: null, updated_at: 't0' })
await ensureTestlySnapshots(f.db, [personal, grouped], 'kw', 'iskra:u', done)
assert.equal(f.writes.length, 1)
assert.equal(f.writes[0].op, 'update')
assert.equal(f.writes[0].filters.updated_at, 't0')
assert.equal(f.writes[0].payload.attachments.rows[0].testly.got, 36)
f = fakeDb(null)
await ensureTestlySnapshots(f.db, [grouped], 'kw', 'iskra:u', done)
assert.equal(f.writes[0].op, 'insert')
assert.equal(f.writes[0].payload.student_id, 'grouped')
assert.equal(f.writes[0].payload.lesson_ref, 'c-37')
for (const kept of [{ id: 'p', status: 'current', attachments: { v: 'basic-1', rows: [] } }, { id: 'p', status: 'completed', attachments: null }]) {
  f = fakeDb(kept)
  await ensureTestlySnapshots(f.db, [grouped], 'kw', 'iskra:u', done)
  assert.equal(f.writes.length, 0)
}
f = fakeDb(null)
await ensureTestlySnapshots(f.db, [grouped], 'kw', 'iskra:someone-else', done)
assert.equal(f.writes.length, 0)
console.log('PASS: server snapshot fills an empty row, inserts a missing one, never replaces answers or grades, ignores other keys')
