import assert from 'node:assert/strict'
import { setCourseItemHidden, flushCourseVisibility, loadCourseVisibility } from '../../src/lib/courseVisibility'
import { client } from './request-client'
const storage=new Map()
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
await setCourseItemHidden('existing','lesson','a-1',true,false)
assert.equal(client.calls.length,1)
assert.equal(client.rows.get('existing:lesson:a-1'),true)
client.fail=true
await assert.rejects(setCourseItemHidden('existing','lesson','a-1',false,false))
assert.equal(client.rows.get('existing:lesson:a-1'),true,'failed save retains hidden state')
client.fail=false;client.exists=false
await setCourseItemHidden('new-course','module','local-module',true,true)
assert.ok(storage.has('iskra:course-visibility-draft:new-course'))
client.exists=true
await flushCourseVisibility('new-course',{'local-module':'db-module'})
assert.equal(client.rows.get('new-course:module:db-module'),true,'prehide written before content publication')
assert.ok(!storage.has('iskra:course-visibility-draft:new-course'))
await Promise.all([setCourseItemHidden('existing','lesson','rapid',true,false),setCourseItemHidden('existing','lesson','rapid',false,false)])
assert.equal(client.rows.get('existing:lesson:rapid'),false,'same-item requests retain click order')
await setCourseItemHidden('late-read','module','local',false,false)
const read=loadCourseVisibility('late-read')
await setCourseItemHidden('late-read','module','local',true,false)
client.holdRead();await read
await flushCourseVisibility('late-read',{local:'persisted'})
assert.equal(client.rows.get('late-read:module:persisted'),true,'late old read cannot undo confirmed hidden flag')
console.log('PASS narrow request; denied write; durable new-course pending + ID reconciliation; same-item ordering; late-read protection')
