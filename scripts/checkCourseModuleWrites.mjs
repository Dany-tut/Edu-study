import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { courseModuleWrites } from '../src/lib/courseModuleWrites.ts'
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
const saved=ids.slice(0,4).map((id,position)=>({id,label:`Module ${position}`,position,hidden:position===1}))
const modules=saved.map(({id,label})=>({id,label}))
const mapping=Object.fromEntries(ids.map(id=>[id,id]))
const before=structuredClone(saved)
assert.deepEqual(courseModuleWrites(modules,mapping,saved),[],'four unchanged modules require zero writes')
const renamed=modules.map((m,i)=>i===1?{...m,label:'Renamed'}:m)
assert.deepEqual(courseModuleWrites(renamed,mapping,saved),[{kind:'update',id:ids[1],values:{label:'Renamed',position:1}}])
const reordered=[modules[1],modules[0],...modules.slice(2)]
assert.deepEqual(courseModuleWrites(reordered,mapping,saved).map(w=>[w.id,w.values.position]),[[ids[1],0],[ids[0],1]],'reorder never borrows another UUID')
assert.deepEqual(courseModuleWrites([modules[1]],mapping,saved),[{kind:'update',id:ids[1],values:{label:'Module 1',position:0}}],'removing A preserves B identity')
assert.deepEqual(courseModuleWrites([...modules,{id:ids[4],label:'New'}],mapping,saved),[{kind:'insert',id:ids[4],values:{label:'New',position:4}}])
assert.deepEqual(courseModuleWrites([{id:'local',label:'Module 0'}],{local:ids[4]},saved),[{kind:'insert',id:ids[4],values:{label:'Module 0',position:0}}],'different UUID is new even with same label/position')
assert.throws(()=>courseModuleWrites(modules,{},saved),/identity/)
assert.deepEqual(saved,before)
// Execute the real editor fragment, including its visibility barrier and failure
// path, against a controlled transport. No production API calls.
const source=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
const start=source.indexOf('    await flushCourseVisibility(shortId, moduleDbIdByLocalId)')
const end=source.indexOf('    // 2. Order lessons',start)
assert.ok(start>=0&&end>start)
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
const execute=new AsyncFunction('env',`const {flushCourseVisibility,shortId,moduleDbIdByLocalId,editorModules,existing,courseDbId,supabase,saveIssue,courseSaveReason,writeFailed,courseModuleWrites}=env;${source.slice(start,end)}return true`)
function fixture(editorModules=modules,{fail=false,flush=async()=>{}}={}){
 const calls=[];const saveIssue={current:null};let failed=false
 const supabase={from(table){assert.equal(table,'course_modules');return {
  update(values){const filters={};return {eq(k,v){filters[k]=v;return this},then(resolve,reject){calls.push({method:'PATCH',values,filters});return Promise.resolve({error:fail?{message:'synthetic failure'}:null}).then(resolve,reject)}}},
  insert(values){calls.push({method:'POST',values});return Promise.resolve({error:fail?{message:'synthetic failure'}:null})},
 }}}
 return {calls,saveIssue,get failed(){return failed},run:()=>execute({flushCourseVisibility:flush,shortId:'synthetic-course',moduleDbIdByLocalId:mapping,editorModules,existing:saved,courseDbId:'synthetic-course-db',supabase,saveIssue,courseSaveReason:()=> 'failed',writeFailed:async()=>{failed=true;return false},courseModuleWrites})}
}
const unchanged=fixture();assert.equal(await unchanged.run(),true);assert.deepEqual(unchanged.calls,[])
const rename=fixture(renamed);assert.equal(await rename.run(),true)
assert.deepEqual(rename.calls,[{method:'PATCH',values:{label:'Renamed',position:1},filters:{id:ids[1],course_id:'synthetic-course-db'}}])
const inserted=fixture([...modules,{id:ids[4],label:'New'}]);await inserted.run()
assert.deepEqual(inserted.calls,[{method:'POST',values:{id:ids[4],course_id:'synthetic-course-db',label:'New',position:4}}])
let release;const blocked=fixture(renamed,{flush:()=>new Promise(r=>{release=r})});const pending=blocked.run();await Promise.resolve();assert.deepEqual(blocked.calls,[],'no content write before visibility flush');release();await pending;assert.equal(blocked.calls.length,1)
const denied=fixture(renamed,{flush:async()=>{throw new Error('visibility failed')}});await assert.rejects(denied.run(),/visibility failed/);assert.deepEqual(denied.calls,[])
const broken=fixture(reordered,{fail:true});assert.equal(await broken.run(),false);assert.equal(broken.failed,true);assert.equal(broken.saveIssue.current,'failed');assert.equal(broken.calls.length,1,'failure stops subsequent module writes')
const retry=fixture(reordered);assert.equal(await retry.run(),true);assert.deepEqual(retry.calls.map(c=>c.filters.id),[ids[1],ids[0]])
for(const test of [rename,inserted,blocked,retry])for(const call of test.calls)assert.deepEqual(Object.keys(call.values).sort(),call.method==='POST'?['course_id','id','label','position']:['label','position'])
assert.deepEqual(saved,before,'hidden and source rows are never mutated')
console.log('PASS actual editor module loop: 4 unchanged -> 0 PATCH; exact UUID rename/reorder/removal/insert; visibility flush/failure barriers; scoped payloads without hidden; stop on failure and retry')
