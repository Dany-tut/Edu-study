import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { transform } from 'esbuild'
import { courseAtomicModules as productionCourseAtomicModules, eligibleCourseAtomicModules as courseAtomicModules, courseAtomicRows } from '../../src/lib/courseAtomicRows'
import { accessChangesForSave, acknowledgeCourseAccess } from '../../src/lib/courseAccessChanges'
import { lessonShortIdMap } from '../../src/lib/lessonReferences'
import { plainTitle } from '../../src/lib/lessonKey'
import { theoryToParagraphs } from '../../src/lib/theoryImages'
const source=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
const start=source.indexOf('  async function syncCourseNow('),end=source.indexOf('  // ── «Выдать новой группе»',start)
const actual=(await transform(source.slice(start,end),{loader:'ts',target:'es2020'})).code
assert.equal(productionCourseAtomicModules({}),null,'unaccepted production optimization stays disabled')
const uuid='aaaaaaaa-0000-4000-8000-000000000001'
const base={id:'qa',dbCourseId:'qa',title:'QA',subject:'QA',level:'Test',description:'marker',status:'draft',color:'#abcdef',bg:'#eeeeee',groupIds:[],studentIds:[],modules:[{id:uuid,label:'Module',expanded:true,lessonIds:['qa-0']}],lessons:[{id:'qa-0',persistedShortId:'qa-0',title:'Lesson',number:1,videoUrl:'https://example.invalid/video',theory:'Preserved theory',timecodes:[{time:'00:10',seconds:10,label:' Chapter '}],chapterVariants:{source:'video',items:['one']},hwTasks:[{id:'q',text:'Question',answer:'Answer'}]}]}
// Independent parity check: run the serializer from baseline main on the same
// rich payload, so extracting it cannot silently change content representation.
const oldSource=execFileSync('git',['show','940c8856:src/pages/teacher/TeacherCourseEditorPage.tsx'],{encoding:'utf8'})
const oldStart=oldSource.indexOf('    // 2. Order lessons (module order'),oldEnd=oldSource.indexOf('    if (lessonRows.length > 0)',oldStart)
const legacyCode=(await transform(`function original(c,courseDbId,editorModules,moduleDbIdByLocalId,shortId){ const firstModuleLocalId=editorModules[0].id;${oldSource.slice(oldStart,oldEnd)}return {ordered,shortIdByLessonId,lessonRows}}`,{loader:'ts',target:'es2020'})).code
const original=Function('lessonShortIdMap','plainTitle','theoryToParagraphs',`${legacyCode};return original`)(lessonShortIdMap,plainTitle,theoryToParagraphs)
for(const count of [0,1,20]){
 const c=structuredClone(base);c.lessons=Array.from({length:count},(_,i)=>({...base.lessons[0],id:`qa-${i}`,persistedShortId:`qa-${i}`,number:i+1}));c.modules[0].lessonIds=c.lessons.map(l=>l.id)
 const expected=original(c,'db',c.modules,{[uuid]:uuid},'qa')
 assert.deepEqual(courseAtomicRows(c,'db',c.modules,{[uuid]:uuid}),expected)
}
assert.deepEqual(courseAtomicModules({...base,lessons:[],modules:[{...base.modules[0],label:'',lessonIds:[]}]}),[{...base.modules[0],label:'',lessonIds:[]}])
assert.equal(courseAtomicModules({...base,dbCourseId:undefined}),null)
assert.equal(courseAtomicModules({...base,modules:[{...base.modules[0],id:'legacy-local'}]}),null)
function harness({response,error,delayed=false}={}){
 const calls=[],baselineStamp={current:'2026-01-01T00:00:00Z'},latestCourse={current:structuredClone(base)},saveIssue={current:null},savedDrafts=[]
 let resolve,conflict=null
 const rpcPromise=delayed?new Promise(r=>resolve=r):null
 const normal={course_id:'db-course',stamp:'2026-01-02T00:00:00Z',access:{updated_at:'2026-01-02T00:00:00Z',student_ids:[],group_ids:[],access_modes:{}},lessons:[{id:'db-lesson',lesson_number:0,title:'Lesson'}]}
 const env={courseAtomicModules,courseAtomicRows,accessChangesForSave,acknowledgeCourseAccess,baselineStamp,latestCourse,saveIssue,
 supabase:{rpc:async(name,args)=>{calls.push({name,args});return rpcPromise??{data:response??normal,error:error??null}},from:()=>{throw Error('Unexpected legacy request')}},
 flushCourseVisibility:async()=>{calls.push({name:'flush'})},
 courseSaveReason:(_stage,e)=>e?.message??'failed',readGroupScheduleConflict:()=>null,t:s=>s,groups:[],allStudents:[],
 reconcileCourse:fn=>{latestCourse.current=fn(latestCourse.current)},setAccessModes:()=>{},setSelectedLessonId:()=>{},
 readDraft:()=>({}),writeDraft:(_key,draft)=>savedDrafts.push(draft),draftKey:'test',sessionStorage:{setItem:()=>{}},window:{dispatchEvent:()=>{}},
 buildConflict:async(...args)=>args,setConflict:value=>{conflict=value},readCourseStamp:async()=>{calls.push({name:'readStamp'});return null},
 getOwnerId:async()=>null,courseSaveProvenance:()=> 'unverified',
 }
 const write=Function(...Object.keys(env),`${actual};return syncCourseNow`)(...Object.values(env))
 return {write,calls,baselineStamp,latestCourse,saveIssue,savedDrafts,resolve:()=>resolve({data:normal,error:null}),getConflict:()=>conflict}
}
let h=harness();assert.equal(await h.write(structuredClone(base)),true)
assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content'],'one network RPC; visibility barrier precedes it')
assert.equal(h.calls[1].args.p_baseline,'2026-01-01T00:00:00Z')
assert.equal(h.calls[1].args.p_lessons[0].homework.hwTasks[0].answer,'Answer')
assert.equal('course_id' in h.calls[1].args.p_lessons[0],false)
assert.equal(h.baselineStamp.current,'2026-01-02T00:00:00Z')
assert.equal(h.savedDrafts[0].serverStamp,h.baselineStamp.current)
h=harness();assert.equal(await h.write({...base,heavyPending:true}),false);assert.equal(h.calls.length,0)
h=harness();assert.equal(await h.write({...base,metadataPending:true}),false);assert.equal(h.calls.length,0)
h=harness({error:{code:'23514',message:'ISKRA_DATA_PRESERVATION: protected'}})
assert.equal(await h.write(structuredClone(base)),false);assert.equal(h.baselineStamp.current,'2026-01-01T00:00:00Z');assert.equal(h.savedDrafts.length,0);assert.equal(h.calls.length,2,'no unsafe legacy fallback')
h=harness({error:{code:'40001',message:'ISKRA_COURSE_CONFLICT:2026-01-03T00:00:00Z'}})
assert.equal(await h.write(structuredClone(base)),false);assert.equal(h.getConflict()[2],'2026-01-03T00:00:00Z')
h=harness({delayed:true});const pending=h.write(structuredClone(base));await Promise.resolve();h.latestCourse.current={...h.latestCourse.current,description:'newer unsaved edit'};h.resolve();assert.equal(await pending,true);assert.equal(h.savedDrafts[0].description,'newer unsaved edit','late acknowledgement retains latest draft')
console.log('PASS actual editor function:1RPC+visibility barrier, server CAS payload, no fallback, incomplete-data guards, conflict, preservation error, late ACK; serializer parity baseline0/1/20lessons')
