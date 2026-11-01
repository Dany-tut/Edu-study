import assert from 'node:assert/strict'
import { journalDemo } from '../src/data/courseJournalDemo.ts'
import { homeworkEntries, reviewQueue, applyStandReview, nativeHomeworkReviewId } from '../src/components/teacher/journalStand/homeworkStand.ts'

const data = journalDemo()
const student = data.students[0]
const lesson = data.lessons.find(l => l.course_id === 'demo-chem')
const ref = lesson.short_id
data.work = [{ id:'submission', student_id:student.id, lesson_ref:ref, status:'submitted', score:91, updated_at:'2026-11-01T10:00:00Z',
  attachments:{v:'basic-1',attemptId:'attempt',reviewRequired:true,recommendationScore:80,rows:[{n:1,type:'write',prompt:'Вопрос',answer:'Ответ',verdict:'review'}]} }]
data.attempts = [{id:'attempt',student_id:student.id,lesson_ref:ref,number:1,status:'submitted',score:null,passing_score:80,submitted_at:'2026-11-01T09:00:00Z',review_comment:null}]
const entries = d => homeworkEntries(d, '2026-11-01')
const queue = d => reviewQueue(entries(d))
assert.equal(queue(data).length, 1, 'Only submitted work awaiting manual review belongs in the queue')
const item = queue(data)[0]
assert.ok(entries(data).some(e => e.work.slot.ref===ref && !e.work.submitted), 'The full assignment stack retains students who have not submitted')
assert.throws(() => applyStandReview(data,item,{verdict:'returned',score:0,comment:' '}), /комментарий/)
assert.throws(() => applyStandReview(data,item,{verdict:'accepted',score:101,comment:''}), /0 до 100/)
const accepted = applyStandReview(data,item,{verdict:'accepted',score:84,comment:'Хорошо'})
assert.equal(queue(accepted).length, 0, 'Saving a grade removes the task from the shared review queue')
assert.equal(entries(accepted).find(e=>e.key===item.key).work.score, 84, 'The journal uses the same saved grade')
assert.equal(accepted.attempts[0].score,84)
assert.equal(accepted.attempts[0].review_comment,'Хорошо')
assert.equal(data.work[0].status,'submitted', 'Reviewing must not mutate the previous snapshot')
const zero = applyStandReview(data,item,{verdict:'accepted',score:0,comment:''})
assert.equal(entries(zero).find(e=>e.key===item.key).work.score,0,'A valid zero result must not become an empty cell')
const returned = applyStandReview(data,item,{verdict:'returned',score:0,comment:'Добавьте объяснение'})
assert.equal(queue(returned).length,0,'A returned work waits for the student, not the teacher')
assert.equal(entries(returned).find(e=>e.key===item.key).work.status,'На доработке')
assert.throws(()=>applyStandReview(accepted,item,{verdict:'accepted',score:90,comment:''}),/изменилась/, 'A stale review cannot overwrite a saved decision')
const staleAttempt={...data,work:data.work.map(w=>({...w,attachments:{...w.attachments,attemptId:'new-attempt'}}))}
assert.throws(()=>applyStandReview(staleAttempt,item,{verdict:'accepted',score:90,comment:''}),/изменилась/)
const resubmitted={...returned,work:returned.work.map(w=>({...w,status:'submitted',updated_at:'2026-11-01T11:00:00Z',attachments:{...w.attachments,attemptId:'second',reviewedAt:null}})),attempts:[...returned.attempts,{...returned.attempts[0],id:'second',number:2,status:'submitted',score:null,submitted_at:'2026-11-01T11:00:00Z'}]}
assert.equal(queue(resubmitted).length,1,'A new submission returns to both the queue and home tasks')
const duplicate={...data,students:[...data.students,{...student,id:'other-enrollment'}]}
assert.equal(queue(duplicate).length,1,'One learner across enrollments must not create duplicate tasks')
const otherOwner={...duplicate,work:data.work.map(w=>({...w,student_id:'other-enrollment'})),attempts:data.attempts.map(a=>({...a,student_id:'other-enrollment'}))}
assert.equal(queue(otherOwner)[0].student.id,'other-enrollment','The review must open the enrollment that owns the submitted snapshot')
const linkedAssignment={id:'native-homework',lesson_id:lesson.id,group_id:student.groupId,title:'Домашка',status:'active',due_date:null}
const linkedData={...data,assignments:[linkedAssignment]}
assert.equal(nativeHomeworkReviewId(linkedData,item),'native-homework','A unique group assignment can open the existing full review editor')
assert.equal(nativeHomeworkReviewId({...linkedData,assignments:[linkedAssignment,{...linkedAssignment,id:'ambiguous'}]},item),null,'Ambiguous linked homework must remain in the stand review')
assert.equal(nativeHomeworkReviewId(linkedData,{...item,work:{...item.work,slot:{...item.work.slot,ref:ref+'~extra'}}}),null,'Extra homework cannot open the primary homework editor')
assert.equal(nativeHomeworkReviewId(linkedData,{...item,work:{...item.work,slot:{...item.work.slot,ref:'hw-native-homework'}}}),'native-homework')
console.log('Stand homework: queue, full assignment stack, grades, zero, returns, resubmissions, stale attempts and learner deduplication passed.')
