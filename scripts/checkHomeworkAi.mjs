import assert from 'node:assert/strict'
import { aiCommentHtml, homeworkAiIssue, homeworkAiForAttempt } from '../src/lib/homeworkAiState.ts'
assert.equal(aiCommentHtml('<img src=x onerror="alert(1)">\nтекст'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;<br>текст')
assert.equal(homeworkAiIssue('rate_limit').retry,true)
assert.equal(homeworkAiIssue('credentials').retry,false)
assert.equal(homeworkAiIssue('configuration').retry,false)
assert.equal(homeworkAiIssue('private-provider-stack').text.includes('private-provider-stack'),false)
const graded = {status:'graded',attemptId:'first',submittedAt:'2026-11-01T10:00:00Z',comment:'Старый разбор'}
assert.equal(homeworkAiForAttempt(graded,'first','2026-11-01T11:00:00Z'),graded,'A saved review remains visible after teacher review changes updated_at')
assert.equal(homeworkAiForAttempt(graded,'second','2026-11-01T11:00:00Z'),undefined,'A resubmission cannot display the previous attempt’s score or comment')
assert.equal(homeworkAiForAttempt({...graded,attemptId:undefined},'second',graded.submittedAt),undefined,'A completed result without an attempt id cannot be applied to an identified new attempt')
assert.equal(homeworkAiForAttempt({...graded,status:'working',attemptId:undefined},'first',graded.submittedAt)?.status,'working','A queued job may not have result.attempt_id yet')
assert.equal(homeworkAiForAttempt({...graded,status:'working',attemptId:undefined},'second','2026-11-01T11:00:00Z'),undefined,'An old running job cannot appear on a newer submission')
assert.equal(homeworkAiForAttempt(graded,undefined,'2026-11-01T11:00:00Z'),undefined,'Legacy submissions use the submission date to fence old feedback')
assert.equal(homeworkAiForAttempt(undefined,'first',graded.submittedAt),undefined)
console.log('Homework AI: escaped content, safe errors, matching attempts, resubmissions, legacy dates and running jobs passed.')
