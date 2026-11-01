import assert from 'node:assert/strict'
import { recordCourseAccessEdit, accessChangesForSave, acknowledgeCourseAccess } from '../src/lib/courseAccessChanges'
const old = { dbCourseId:'course', studentIds:['mitya'], groupIds:[] }
const server = { student_ids:['mitya','matvey','katya','erik','polina'], group_ids:['new-group'] }
assert.deepEqual(accessChangesForSave(old), {students:{},groups:{},modes:{}})
// A stale draft/content-only edit adopts the server audience without revoking anyone.
assert.deepEqual(acknowledgeCourseAccess(old,{},server).studentIds, server.student_ids)
const changed = recordCourseAccessEdit(old,{...old,studentIds:['anna']})
assert.deepEqual(changed.accessChanges.students,{mitya:false,anna:true})
const pending = recordCourseAccessEdit(changed,{...changed,studentIds:['anna','boris']})
const ack = acknowledgeCourseAccess(pending,accessChangesForSave(changed),{student_ids:['anna','matvey','katya','erik','polina'],group_ids:[]})
assert.deepEqual(ack.accessChanges.students,{boris:true})
assert.ok(ack.studentIds.includes('matvey') && ack.studentIds.includes('boris'))
// A newer reversal during an in-flight save must not be cleared by the older response.
const reversed = recordCourseAccessEdit(changed,{...changed,studentIds:['mitya']})
const back = acknowledgeCourseAccess(reversed,accessChangesForSave(changed),{student_ids:['anna','matvey'],group_ids:[]})
assert.deepEqual(back.accessChanges.students,{mitya:true,anna:false})
assert.deepEqual(back.studentIds,['matvey','mitya'])
const modeEdit={...old,accessChanges:{modes:{matvey:'full'}}}
assert.deepEqual(accessChangesForSave(modeEdit).modes,{matvey:'full'})
assert.equal(acknowledgeCourseAccess(modeEdit,accessChangesForSave(modeEdit),server).accessChanges,undefined)
assert.deepEqual(accessChangesForSave({studentIds:['anna'],groupIds:['group']}),{students:{anna:true},groups:{group:true},modes:{}})
console.log('PASS: stale drafts, explicit add/remove, queued saves, in-flight reversal, modes, new-course audience')
