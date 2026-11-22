import assert from 'node:assert/strict'
import { courseModuleIdentities } from '../../src/lib/courseModuleIdentity'
import { visibleCourseModules } from '../../src/lib/courseVisibilityModel'
const a='aaaaaaaa-0000-4000-8000-000000000001',b='aaaaaaaa-0000-4000-8000-000000000002'
const saved=[{id:a,label:'A',position:0},{id:b,label:'B',position:1}]
assert.deepEqual(courseModuleIdentities([{id:b,label:'Renamed B'},{id:a,label:'A'}],saved),{[a]:a,[b]:b})
assert.deepEqual(courseModuleIdentities([{id:b,label:'B'}],saved),{[b]:b},'removing A never borrows A UUID for B')
assert.deepEqual(courseModuleIdentities([{id:'old-b',label:'B'},{id:'new',label:'New'}],saved,()=> 'new-uuid'),{'old-b':b,new:'new-uuid'})
assert.throws(()=>courseModuleIdentities([{id:'legacy',label:'Same'}],[{id:a,label:'Same',position:0},{id:b,label:'Same',position:1}]))
assert.equal(courseModuleIdentities([{id:'legacy-a',label:'Renamed after acknowledgement'}],saved,()=> 'wrong-new-id',{'legacy-a':a})['legacy-a'],a,'queued legacy snapshot retains acknowledged UUID across renames')
const modules=[{id:a,lessons:[{short_id:'a1',status:'completed'}]},{id:b,lessons:[{short_id:'b1',status:'locked'},{short_id:'b2',status:'current'}]}]
const before=structuredClone(modules)
const hidden=[{item_kind:'module',item_key:a,hidden:true},{item_kind:'lesson',item_key:'b1',hidden:true}]
assert.deepEqual(visibleCourseModules(modules,hidden),[{id:b,lessons:[{short_id:'b2',status:'current'}]}])
assert.deepEqual(visibleCourseModules(modules,hidden.map(r=>r.item_kind==='module'?{...r,hidden:false}:r)),[modules[0],{id:b,lessons:[modules[1].lessons[1]]}])
assert.deepEqual(modules,before,'projection never mutates content/access/progress')
console.log('PASS stable module IDs across reorder/removal/legacy/new modules; hidden parent and child; independent locked/open/completed states; immutable source')
