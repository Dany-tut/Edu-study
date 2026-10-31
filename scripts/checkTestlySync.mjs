import assert from 'node:assert/strict'
import { applyTestlyResult } from '../supabase/functions/_shared/testlyProgress.ts'
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
