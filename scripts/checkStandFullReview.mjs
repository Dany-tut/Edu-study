import assert from 'node:assert/strict'
import { journalDemo } from '../src/data/courseJournalDemo.ts'
import { addFullReviewExample, fullReviewExample, saveFullReviewExample, FULL_REVIEW_EXAMPLE_ID } from '../src/components/teacher/journalStand/fullReviewExample.ts'
import { homeworkEntries, nativeHomeworkReviewId, reviewQueue } from '../src/components/teacher/journalStand/homeworkStand.ts'
import { handoffHomeworkReview } from '../src/components/teacher/journalStand/homeworkReviewHandoff.ts'
import { readDraft, writeDraft } from '../src/lib/useDraft.ts'

const storage = new Map()
globalThis.sessionStorage = { getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key) }
const today = '2026-11-01'
const data = addFullReviewExample(journalDemo(), today)
const review = fullReviewExample(data)
assert.equal(review.submissions.length, 3)
assert.equal(review.submissions.filter(s=>s.verdict==='pending').length, 2)
const student = review.submitters[1]
const submission = review.submissions.find(s=>s.studentId===student.id)
const entry = homeworkEntries(data,today).find(e=>e.work.submission?.id===submission.id)
assert.equal(nativeHomeworkReviewId(data,entry),FULL_REVIEW_EXAMPLE_ID)
assert.equal(entry.student.id,student.id,'The second student, not the first submitter, owns the handoff')
const key = `hwReview:${FULL_REVIEW_EXAMPLE_ID}:${student.id}`
writeDraft(key,{score:'70',comment:'Полный редактор',taskScores:{first:'2'},photos:['data:image/png;base64,photo'],board:'data:image/png;base64,board'})
handoffHomeworkReview(FULL_REVIEW_EXAMPLE_ID,student.id,{score:'75',comment:'',edited:false})
assert.equal(readDraft(key).comment,'Полный редактор','Opening an untouched journal preview preserves the existing full draft')
handoffHomeworkReview(FULL_REVIEW_EXAMPLE_ID,student.id,{score:'83',comment:'Комментарий из журнала',edited:true})
assert.deepEqual(readDraft(key),{score:'83',comment:'Комментарий из журнала',taskScores:{first:'2'},photos:['data:image/png;base64,photo'],board:'data:image/png;base64,board'})
assert.equal(readDraft(`hwReview:${FULL_REVIEW_EXAMPLE_ID}:${review.submitters[0].id}`),null,'Drafts do not leak to another student')
const attachments={photos:['data:image/png;base64,saved-photo'],board:'data:image/png;base64,saved-board'}
const saved=saveFullReviewExample(data,today,submission.id,'accepted',83,'Хорошо',attachments,submission.answers.attemptId)
const reopened=fullReviewExample(saved).submissions.find(s=>s.id===submission.id)
assert.equal(reopened.score,83)
assert.equal(reopened.verdict,'accepted')
assert.equal(reopened.reviewComment,'Хорошо')
assert.deepEqual(reopened.reviewPhotos,attachments.photos)
assert.equal(reopened.reviewBoard,attachments.board)
sessionStorage.removeItem('draft:'+key)
handoffHomeworkReview(FULL_REVIEW_EXAMPLE_ID,student.id,{score:'83',comment:'Хорошо',edited:false})
assert.equal(readDraft(key).photos,undefined,'A fresh handoff must let the editor restore saved review photos instead of replacing them with an empty array')
assert.equal(readDraft(key).board,undefined,'Saved boards also remain available after a successful review and a fresh handoff')
assert.equal(homeworkEntries(saved,today).find(e=>e.key===entry.key).work.score,83)
assert.equal(reviewQueue(homeworkEntries(data,today)).length-reviewQueue(homeworkEntries(saved,today)).length,1)
assert.equal(submission.verdict,'pending','Saving must preserve the original snapshot')
assert.throws(()=>saveFullReviewExample(data,today,submission.id,'accepted',83,'',attachments,'stale-attempt'),/изменилась/)
console.log('Stand full review: three submissions, exact student, native mapping, draft/attachment handoff, save/reopen and shared journal/queue passed.')
