import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { transform } from 'esbuild'
import { courseAtomicModules as productionCourseAtomicModules, eligibleCourseAtomicModules as courseAtomicModules, courseAtomicRows } from '../../src/lib/courseAtomicRows'
import { accessChangesForSave, acknowledgeCourseAccess } from '../../src/lib/courseAccessChanges'
import { lessonShortIdMap } from '../../src/lib/lessonReferences'
import { prepareConfirmedSnapshot, advanceConfirmedContent } from '../../src/lib/courseContentAcknowledgement'
import { baselineCanDriveDelta } from '../../src/lib/courseConfirmedBaseline'
import { courseContentSnapshot, courseContentDelta, courseDeltaProbeEnabled } from '../../src/lib/courseContentDelta'
import { enqueueChapterSave } from '../../src/lib/chapterSaveQueue'
import { plainTitle } from '../../src/lib/lessonKey'
import { theoryToParagraphs } from '../../src/lib/theoryImages'
const source=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
const start=source.indexOf('  async function syncCourseNow('),end=source.indexOf('  // ── «Выдать новой группе»',start)
const actual=(await transform(source.slice(start,end),{loader:'ts',target:'es2020'})).code
assert.equal(productionCourseAtomicModules({}),null,'unaccepted production optimization stays disabled')
const uuid='aaaaaaaa-0000-4000-8000-000000000001'
globalThis.window={location:{search:'?qa_course_save=20261122'}}
assert.equal(productionCourseAtomicModules({dbCourseId:'other-course'}),null,'URL switch cannot enable another course')
assert.equal(productionCourseAtomicModules({dbCourseId:'00e3a0efbf',modules:[{id:uuid,label:'QA',lessonIds:[]}],lessons:[]})?.[0].id,uuid)
globalThis.window.location.search=''
assert.equal(productionCourseAtomicModules({dbCourseId:'00e3a0efbf'}),null,'default QA path stays off without explicit flag')
delete globalThis.window

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
function harness({response,error,delayed=false,telemetryThrows=false,typed=false,invalidAck=false,missingBase=false,chapterStamp=false,reviewed=false}={}){
 const calls=[],baselineStamp={current:'2026-01-01T00:00:00Z'},latestCourse={current:structuredClone(base)},saveIssue={current:null},savedDrafts=[]
 let resolve,conflict=null
 const rpcPromise=delayed?new Promise(r=>resolve=r):null
 const normal={_qa_profile:{function_ms:123,steps:[]},course_id:'db-course',stamp:'2026-01-02T00:00:00Z',access:{updated_at:'2026-01-02T00:00:00Z',student_ids:[],group_ids:[],access_modes:{}},lessons:[{id:'db-lesson',lesson_number:0,title:'Lesson'}]}
 const owner='aaaaaaaa-0000-4000-8000-000000000002',courseId='aaaaaaaa-0000-4000-8000-000000000003',lessonId='aaaaaaaa-0000-4000-8000-000000000004'
 const scope={authEpoch:0,ownerId:owner},token={courseShortId:'qa',scope,requestId:1}
 const witness=[{id:lessonId,shortId:'qa-0',moduleId:uuid,updatedAt:baselineStamp.current}]
 const canonical=courseContentSnapshot(base,witness)
 const confirmedContent={current:{source:'matched-load',token,courseShortId:'qa',courseId,ownerId:owner,stamp:baselineStamp.current,serialized:canonical,lessons:witness,modules:canonical.modules}}
 canonical.rawCourse=structuredClone(canonical.course)
 canonical.rawLessons=Object.fromEntries(canonical.lessons.map(row=>[row.short_id,{...structuredClone(row),homework:{...structuredClone(row.homework),recHwTime:'19:37',unownedHomework:'preserve'},content:{...structuredClone(row.content),externalSibling:{keep:true}},unownedSqlField:'never send'}]))
 if(missingBase)confirmedContent.current=null
 if(chapterStamp)baselineStamp.current='2026-01-01T00:00:01Z'
 let rpcArgs,rpcName
 const ack=()=>{
  const req=rpcArgs??{},now='2026-01-02T00:00:00Z'
  if(rpcName==='save_course_content_probe_20261122')return {...normal,course_id:courseId}
  return invalidAck?{course_id:courseId,stamp:now}:{course_id:courseId,stamp:now,full_snapshot_confirmed:true,module_witness:canonical.modules,lesson_witness:[{id:lessonId,short_id:'qa-0',module_id:uuid,updated_at:now}],...(req.p_course_patch?{applied_course_patch:req.p_course_patch,applied_lesson_patches:req.p_lesson_patches,applied_lesson_deletes:req.p_lesson_deletes,applied_module_ops:req.p_module_ops}:{})}
 }
 const env={courseDeltaProbeEnabled:()=>typed,courseContentSnapshot,courseContentDelta,prepareConfirmedSnapshot,advanceConfirmedContent,baselineCanDriveDelta,confirmedContent,reviewedContentOverwrite:{current:reviewed},readScope:{current:scope},trackEvent:()=>{if(telemetryThrows)throw Error('diagnostic delivery unavailable')},courseSaveProbeMetrics:()=>({}),courseAtomicModules,courseAtomicRows,accessChangesForSave,acknowledgeCourseAccess,baselineStamp,latestCourse,saveIssue,
 supabase:{rpc:async(name,args)=>{calls.push({name,args});rpcArgs=args;rpcName=name;return rpcPromise??{data:response??(typed?ack():normal),error:error??null}},from:()=>{throw Error('Unexpected legacy request')}},
 flushCourseVisibility:async()=>{calls.push({name:'flush'})},
 courseSaveReason:(_stage,e)=>e?.message??'failed',readGroupScheduleConflict:()=>null,t:s=>s,groups:[],allStudents:[],
 reconcileCourse:fn=>{latestCourse.current=fn(latestCourse.current)},setAccessModes:()=>{},setSelectedLessonId:()=>{},
 readDraft:()=>({}),writeDraft:(_key,draft)=>savedDrafts.push(draft),draftKey:'test',sessionStorage:{setItem:()=>{}},window:{dispatchEvent:()=>{}},
 buildConflict:async(...args)=>args,setConflict:value=>{conflict=value},readCourseStamp:async()=>{calls.push({name:'readStamp'});return null},
 getOwnerId:async()=>null,courseSaveProvenance:()=> 'unverified',
 }
 const write=Function(...Object.keys(env),`${actual};return syncCourseNow`)(...Object.values(env))
 return {write,calls,baselineStamp,latestCourse,saveIssue,savedDrafts,confirmedContent,resolve:()=>resolve({data:typed?ack():normal,error:null}),getConflict:()=>conflict}
}
let h=harness();assert.equal(await h.write(structuredClone(base)),true)
assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_probe_20261122'],'one network RPC; visibility barrier precedes it')
assert.equal(h.calls[1].args.p_baseline,'2026-01-01T00:00:00Z')
assert.equal(h.calls[1].args.p_lessons[0].homework.hwTasks[0].answer,'Answer')
assert.equal('course_id' in h.calls[1].args.p_lessons[0],false)
assert.equal(h.baselineStamp.current,'2026-01-02T00:00:00Z')
assert.equal(h.savedDrafts[0].serverStamp,h.baselineStamp.current)
h=harness();assert.equal(await h.write({...base,heavyPending:true}),false);assert.equal(h.calls.length,0)
h=harness();assert.equal(await h.write({...base,metadataPending:true}),false);assert.equal(h.calls.length,0)
h=harness({error:{code:'23514',message:'ISKRA_DATA_PRESERVATION: protected'}})
assert.equal(await h.write(structuredClone(base)),false);assert.equal(h.baselineStamp.current,'2026-01-01T00:00:00Z');assert.equal(h.savedDrafts.length,0);assert.equal(h.calls.length,2,'no unsafe legacy fallback')
for (const code of ['PT409','40001']) {
h=harness({error:{code,message:'ISKRA_COURSE_CONFLICT:2026-01-03T00:00:00Z'}})
assert.equal(await h.write(structuredClone(base)),false);assert.equal(h.getConflict()[2],'2026-01-03T00:00:00Z')
}
h=harness({delayed:true});const pending=h.write(structuredClone(base));await Promise.resolve();h.latestCourse.current={...h.latestCourse.current,description:'newer unsaved edit'};h.resolve();assert.equal(await pending,true);assert.equal(h.savedDrafts[0].description,'newer unsaved edit','late acknowledgement retains latest draft')
console.log('PASS actual editor function:1RPC+visibility barrier, server CAS payload, no fallback, incomplete-data guards, conflict, preservation error, late ACK; serializer parity baseline0/1/20lessons')

h=harness({telemetryThrows:true});assert.equal(await h.write(structuredClone(base)),true,'diagnostics must not turn committed ACK into failure');

// The actual editor dispatch branch, with the real delta/baseline/ACK helpers.
h=harness({typed:true});assert.equal(await h.write({...structuredClone(base),description:'ACTUAL DELTA'}),true);assert.equal(h.calls[1].name,'save_course_delta_probe_20261122');assert.deepEqual(h.calls[1].args.p_course_patch,{description:'ACTUAL DELTA'});assert.equal('p_lessons' in h.calls[1].args,false);assert.equal(h.confirmedContent.current.serialized.course.description,'ACTUAL DELTA');
h=harness({typed:true});const unsupported=structuredClone(base);unsupported.lessons[0].testTasks=[{id:'changed',text:'New explicit task'}];assert.equal(await h.write(unsupported),true);assert.equal(h.calls[1].name,'save_course_full_witness_probe_20261122');assert.equal(h.calls[1].args.p_lessons[0].test_tasks[0].id,'changed');assert.equal(h.calls[1].args.p_expected_modules.length,1);assert.equal(h.calls[1].args.p_lessons[0].homework.recHwTime,'19:37');assert.equal(h.calls[1].args.p_lessons[0].homework.unownedHomework,'preserve');assert.deepEqual(h.calls[1].args.p_lessons[0].content.externalSibling,{keep:true});assert.equal('unownedSqlField' in h.calls[1].args.p_lessons[0],false);
h=harness({typed:true,delayed:true});const dispatched={...structuredClone(base),description:'A IMMUTABLE'};const waitAck=h.write(dispatched);await Promise.resolve();h.latestCourse.current={...h.latestCourse.current,description:'B LATER'};h.resolve();assert.equal(await waitAck,true);assert.equal(h.confirmedContent.current.serialized.course.description,'A IMMUTABLE');assert.equal(h.savedDrafts[0].description,'B LATER');
h=harness({typed:true,error:{code:'PT409',message:'ISKRA_COURSE_CONFLICT:2026-01-03T00:00:00Z'}});assert.equal(await h.write({...structuredClone(base),description:'conflicting'}),false);assert.equal(h.calls.length,2);assert.equal(h.savedDrafts.length,0);assert.equal(h.confirmedContent.current.serialized.course.description,'marker');
h=harness({typed:true,invalidAck:true});assert.equal(await h.write({...structuredClone(base),description:'bad ACK'}),false);assert.equal(h.savedDrafts.length,0);assert.equal(h.baselineStamp.current,'2026-01-01T00:00:00Z');assert.equal(h.confirmedContent.current,null);
console.log('PASS actual typed editor dispatch: delta vs guarded FULL before dispatch, immutable A ACK/B local draft, CAS no retry, malformed ACK retains draft/source')

for(const options of [{missingBase:true},{chapterStamp:true},{reviewed:true}]){
 h=harness({typed:true,...options});assert.equal(await h.write({...structuredClone(base),description:'STABLE FALLBACK'}),true);assert.equal(h.calls[1].name,'save_course_content_probe_20261122');assert.equal(h.confirmedContent.current,null,'stable ACK cannot certify typed source');assert.equal(await h.write({...structuredClone(base),description:'NEXT EDIT STILL SAVES'}),true);assert.equal(h.calls[3].name,'save_course_content_probe_20261122');
}
console.log('PASS typed baseline loss/chapter/review routes select stable engine before dispatch; subsequent editing remains available without false fast eligibility')

const chapterStart=source.indexOf('  async function saveChaptersOnly('),chapterEnd=source.indexOf('  function syncAccessToSupabase(',chapterStart)
const actualChapter=(await transform(source.slice(chapterStart,chapterEnd),{loader:'ts',target:'es2020'})).code
for(const known of [true,false]){
 const baseline={current:known?'2026-01-01T00:00:00Z':null},live={current:structuredClone(base)},confirmed=new Map()
 const env={latestCourse:live,publicationPending:false,lessonShortIdById:{'qa-0':'qa-0'},enqueueChapterSave,saveChain:{current:Promise.resolve()},readCourseStamp:async()=> '2026-01-01T00:00:00Z',baselineStamp:baseline,saveLessonChapters:async()=> '2026-01-02T00:00:00Z',confirmedChapters:{current:confirmed},courseDeltaProbeEnabled:()=>true,setCourse:fn=>{live.current=fn(live.current)},rebaseChapters:c=>({...c}),unsaved:{current:true},chapterProjection:{current:new WeakSet()}}
 const write=Function(...Object.keys(env),`${actualChapter};return saveChaptersOnly`)(...Object.values(env))
 const pending=write('qa-0',{source:'video',items:[]});live.current={...live.current,description:'NEW INPUT DURING CHAPTER'};assert.equal(await pending,true);assert.equal(baseline.current,known?'2026-01-01T00:00:00Z':null,'one-row chapter ACK never certifies whole source');assert.equal(live.current.description,'NEW INPUT DURING CHAPTER');assert.equal(confirmed.size,1)
}
console.log('PASS actual controlled chapter ACK: known/unknown whole baseline never promoted; teacher input survives chapter completion; subsequent whole CAS must review')
