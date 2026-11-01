import assert from 'node:assert/strict'
import { testlyPresentation } from '../src/lib/testlyPresentation.ts'
import { testlyAnswer } from '../src/data/taskTypes.ts'
const at = '2026-10-31T15:00:00Z'
const saved = testlyAnswer(at, { got: 48, max: 63, pending: false, review: 'review-token' })
const done = { state: 'submitted', got: 48, max: 63, pending: false, total: 35, answered: 34, submittedAt: at }
const result = testlyPresentation(done, saved)
assert.equal(result.percent, 76)
assert.equal(result.progress.percent, 97)
assert.equal(result.score.got, 48)
assert.equal(testlyPresentation({ ...done, got: 0 }, saved).percent, 0)
assert.equal(testlyPresentation({ ...done, got: 0 }, saved).score.got, 0)
assert.equal(testlyPresentation({ ...done, pending: true }, saved).pending, true)
const missingScore = testlyPresentation({ state: 'submitted', pending: true }, undefined)
assert.equal(missingScore.pending, true)
assert.equal(missingScore.score, null)
assert.equal(missingScore.percent, null)
assert.equal(missingScore.progress, null)
const cached = testlyPresentation({ state: 'submitted' }, saved)
assert.equal(cached.score.got, 48)
assert.equal(cached.percent, 76)
assert.equal(testlyPresentation(null, saved).score.got, 48)
const reopened = testlyPresentation({ state: 'started', total: 35, answered: 5 }, saved)
assert.equal(reopened.score, null)
assert.equal(reopened.doneAt, null)
assert.equal(reopened.started, true)
assert.equal(reopened.progress.answered, 5)
assert.equal(testlyPresentation({ state: 'started', total: 35 }, undefined).progress, null)
assert.equal(testlyPresentation({ state: 'started', total: 35, answered: 0 }, undefined).progress.percent, 0)
assert.equal(testlyPresentation({ ...done, max: 0 }, undefined).score, null)
assert.equal(testlyPresentation({ ...done, total: 0 }, saved).progress, null)
assert.equal(testlyPresentation({ ...done, answered: 99 }, saved).progress.answered, 35)
assert.equal(testlyPresentation({ ...done, answered: -5 }, saved).progress.answered, 0)
assert.equal(testlyPresentation({ ...done, answered: NaN }, saved).progress, null)
console.log('PASS: points vs completion, zero score, pending grading, missing/retained score, reopened attempt, unknown/invalid progress')

// Completion notifications are independent of the student keeping the page open.
const { applyTestlyResult } = await import('../supabase/functions/_shared/testlyProgress.ts')
const retryDraft = {v:'basic-1',draft:true,attemptId:'second',testlyKey:'iskra:second',gradable:1,correct:0,
 rows:[{n:1,type:'testly',answer:'',verdict:'empty',testly:{testId:'test'}}]}
const completedRetry = applyTestlyResult(retryDraft,'test',{...done,got:54,updatedAt:'2026-11-01T01:00:00Z'},'current')
assert.equal(completedRetry.attachments.draft,false)
assert.equal(completedRetry.score,86)
assert.equal(completedRetry.status,'submitted')
assert.equal(completedRetry.attachments.attemptId,'second')
const mixedDraft = {...retryDraft,reviewRequired:true,rows:[...retryDraft.rows,{n:2,type:'extended',answer:'',verdict:'empty'}]}
assert.equal(applyTestlyResult(mixedDraft,'test',done,'current').attachments.draft,true)
assert.equal(applyTestlyResult({...completedRetry.attachments,reviewedAt:at},'test',{...done,got:0},'completed'),null)
assert.equal(applyTestlyResult(completedRetry.attachments,'test',{...done,got:0,updatedAt:'2026-10-31T01:00:00Z'},'completed'),null)
console.log('PASS: independent retry, closed-tab completion, mixed draft not auto-submitted, final grade protected, stale notification ignored')
