import assert from 'node:assert/strict'
import { pendingJournalRows } from '../src/lib/journalPending.ts'
const now = Date.parse('2026-11-02T18:00:00')
const event = (id, extra = {}) => ({ id, date: '2026-11-02', time_start: '10:00', lesson_title: 'Тема', group_id: 'group', student_id: null, lesson_id: 'lesson', subject: 'Химия', node_type: 'lesson', groups: {name:'Группа'}, ...extra })
const roster = [{id:'anna',groupId:'group'},{id:'boris',groupId:'group'}]
const read = (rows, legacy=[], sessions=[]) => pendingJournalRows(rows,roster,legacy,sessions,now)
assert.equal(read([event('one')]).length,1)
assert.equal(read([event('one')],[],[{schedule_id:'one',attendance:{anna:true,boris:false}}]).length,0)
assert.equal(read([event('one')],[],[{schedule_id:'one',attendance:{anna:true,boris:null}}]).length,1)
const legacy = roster.map(s=>({student_id:s.id,lesson_date:'2026-11-02',lesson_title:'Тема',present:true}))
assert.equal(read([event('one')],legacy).length,0)
const repeated = [event('one'),event('two',{time_start:'12:00'})]
assert.equal(read(repeated,legacy).length,2,'ambiguous legacy marks must not fill two lessons')
assert.equal(read(repeated,[],[{schedule_id:'one',attendance:{anna:false,boris:true}}]).length,1)
assert.equal(read([event('one'),event('duplicate')]).length,1,'same event reminder remains deduplicated')
assert.equal(read([event('future',{time_start:'17:00'})]).length,0,'two-hour grace preserved')
const direct = event('direct',{group_id:null,groups:null,student_id:'anna',students:{name:'Анна',group_id:'group'}})
assert.equal(read([direct])[0].groupId,'group')
assert.equal(read([direct])[0].scopeName,'Анна')
assert.equal(read([direct],[],[{schedule_id:'direct',attendance:{anna:true}}]).length,0)
assert.equal(read([event('empty',{group_id:'empty'})]).length,1)
console.log('PASS: shared pending journal preserves group/direct events, complete and partial marks, ambiguous legacy marks, separate lessons and two-hour grace')
