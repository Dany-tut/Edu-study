import assert from 'node:assert/strict'
import { journalDemo } from '../../src/data/courseJournalDemo.ts'
import { buildJournalIndex, journalColumns, journalCell } from '../../src/lib/courseJournal.ts'
import { applyConfirmedAttendance, reconcileAttendanceSnapshot } from '../../src/lib/confirmedAttendance.ts'
const data=journalDemo(), student=data.students[0], other=data.students[1], column=journalColumns(data,data.courses[0].id)[0]
const event=column.events[0], today='2026-12-31'
const read=d=>journalCell(d,buildJournalIndex(d),student,column,today)
const base={...data,marks:[{schedule_id:event.id,attendance:{[other.id]:false}}],legacy:[]}
const edits=[{event,studentId:student.id,present:true,grade:5,source:'live'}]
const saved=applyConfirmedAttendance(base,edits)
assert.equal(read(base).present,null)
assert.equal(read(saved).present,true);assert.equal(read(saved).grade,5)
assert.equal(saved.marks[0].attendance[other.id],false)
assert.equal(saved.events,base.events,'Dates/schedule are never patched')
assert.equal(read(reconcileAttendanceSnapshot(base,[{revision:1,edits}],0)).grade,5,'Late old read must retain the confirmed mark')
assert.equal(read(reconcileAttendanceSnapshot(base,[{revision:1,edits}],1)).present,null,'A read begun after confirmation is authoritative')
const later=[{...edits[0],present:false,grade:null}]
assert.equal(read(reconcileAttendanceSnapshot(base,[{revision:1,edits},{revision:2,edits:later}],0)).present,false,'Newer confirmation wins')
const cleared=applyConfirmedAttendance(saved,[{...edits[0],present:null,grade:null}])
assert.equal(read(cleared).present,null);assert.equal(read(cleared).grade,null)
const colliding={...base,legacy:[{student_id:student.id,lesson_date:event.date,lesson_title:'Другой урок',present:false,grade:3}]}
assert.equal(applyConfirmedAttendance(colliding,edits).legacy[0].lesson_title,'Другой урок')
assert.equal(applyConfirmedAttendance({...base,events:[]},edits).marks,base.marks)
assert.equal(base.legacy.length,0)
assert.equal(base.marks[0].attendance[student.id],undefined)
console.log('PASS confirmed cell is immediate, grades/clear, peer isolation, immutable dates, same-day collision, foreign snapshot, old-read protection and newer-read authority')
