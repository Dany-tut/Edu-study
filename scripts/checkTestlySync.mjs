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
