import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { transform } from 'esbuild'
import { courseAtomicModules as productionCourseAtomicModules, eligibleCourseAtomicModules as courseAtomicModules, courseAtomicRows } from '../../src/lib/courseAtomicRows'
import { accessChangesForSave, acknowledgeCourseAccess } from '../../src/lib/courseAccessChanges'
import { lessonShortIdMap } from '../../src/lib/lessonReferences'
import { prepareConfirmedSnapshot, advanceConfirmedContent } from '../../src/lib/courseContentAcknowledgement'
import { isAmbiguousLegacyRecovery } from '../../src/lib/courseDraftRecovery'
import { baselineCanDriveDelta } from '../../src/lib/courseConfirmedBaseline'
import { courseContentSnapshot, courseContentDelta, courseDeltaProbeEnabled } from '../../src/lib/courseContentDelta'
import { createWideContentDelta, prepareWideConfirmedSnapshot, createWideContentAcknowledgement, WideContentPreservationError } from '../../src/lib/courseWideDelta'
import { compactFullLessons } from '../../src/lib/courseFullCompact'
import { prepareFullPreservedSnapshot } from '../../src/lib/courseFullPreservation'
import { prepareFullDispatch as prepareFullContentDispatch, advanceConfirmedFull as advanceFullContentDispatch } from '../../src/lib/courseFullAcknowledgement'
import { buildWholeWitnessPublicationArgs, prepareConfirmedPublicationDispatch, advanceConfirmedPublication } from '../../src/lib/coursePublicationConfirmed'
import { ordinaryContentDelta, ordinaryContentPlan, noCourseAccessIntents } from '../../src/lib/courseOrdinaryDelta'
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
function harness({response,error,delayed=false,telemetryThrows=false,typed=false,invalidAck=false,missingBase=false,chapterStamp=false,reviewed=false,ordinary=false,recovered=false}={}){
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
 canonical.rawLessons['qa-0'].content.paragraphs[0].rawHidden={recap:'keep',timecodes:[1,2]};canonical.rawLessons['qa-0'].materials.rawHiddenMaterials={keep:true};
 if(missingBase||(!typed&&!ordinary))confirmedContent.current=null
 if(chapterStamp)baselineStamp.current='2026-01-01T00:00:01Z'
 let rpcArgs,rpcName
 const ack=()=>{
  const req=rpcArgs??{},now='2026-01-02T00:00:00Z'
  if(rpcName==='save_course_content_probe_20261122')return {...normal,course_id:courseId}
  if(rpcName==='save_course_content_full'){if(invalidAck)return {course_id:courseId,stamp:now};const fullRows=req.p_lessons.map(r=>r.unchanged_id?canonical.rawLessons[r.short_id]:r);return {course_id:courseId,stamp:now,full_snapshot_confirmed:true,module_witness:req.p_modules,lesson_witness:fullRows.map((r,i)=>({id:lessonId,short_id:r.short_id,module_id:r.module_id,updated_at:req.p_lessons[i].unchanged_id?witness[0].updatedAt:now})),lessons:fullRows.map(r=>({id:lessonId,title:r.title,lesson_number:r.lesson_number})),access:{updated_at:now,student_ids:[],group_ids:[],access_modes:{}}}}
  if(rpcName==='save_course_publication_whole')return {course_id:courseId,stamp:'2026-01-03T00:00:00Z',course_updated_at:'2026-01-03T00:00:00Z',full_snapshot_confirmed:true,module_witness:req.p_expected_modules,lesson_witness:confirmedContent.current.lessons.map(r=>({id:r.id,short_id:r.shortId,module_id:r.moduleId,updated_at:r.updatedAt})),applied_course_patch:{status:req.p_status}}
  return invalidAck?{course_id:courseId,stamp:now}:{course_id:courseId,stamp:now,full_snapshot_confirmed:true,module_witness:canonical.modules,lesson_witness:[{id:lessonId,short_id:'qa-0',module_id:uuid,updated_at:now}],...(req.p_course_patch?{applied_course_patch:req.p_course_patch,applied_lesson_patches:req.p_lesson_patches,applied_lesson_deletes:req.p_lesson_deletes,applied_module_ops:req.p_module_ops}:{})}
 }
 const env={failureDetail:{current:{stage:'unknown'}},isAmbiguousLegacyRecovery,recovering:{current:recovered},recoveryBlocked:{current:false},draftSource:{current:null},freshEditor:{current:structuredClone(base)},
 persistedSnapshot:c=>({...c,serverStamp:baselineStamp.current}),compactFullLessons,prepareFullPreservedSnapshot,prepareFullContentDispatch,advanceFullContentDispatch,buildWholeWitnessPublicationArgs,prepareConfirmedPublicationDispatch,advanceConfirmedPublication,ordinaryContentPlan:(...args)=>ordinary?ordinaryContentPlan(...args):null,createWideContentDelta,prepareWideConfirmedSnapshot,createWideContentAcknowledgement,WideContentPreservationError,ordinaryContentDelta:(...args)=>ordinary?ordinaryContentDelta(...args):null,noCourseAccessIntents,eligibleCourseAtomicModules:courseAtomicModules,courseDeltaProbeEnabled:()=>typed,courseContentSnapshot,courseContentDelta,prepareConfirmedSnapshot,advanceConfirmedContent,baselineCanDriveDelta,confirmedContent,reviewedContentOverwrite:{current:reviewed},readScope:{current:scope},trackEvent:()=>{if(telemetryThrows)throw Error('diagnostic delivery unavailable')},courseSaveProbeMetrics:()=>({}),courseAtomicModules:c=>{const previous=globalThis.window;globalThis.window={location:{search:typed?'?qa_course_save=20261122':''}};try{return ordinary?productionCourseAtomicModules(c):courseAtomicModules(c)}finally{globalThis.window=previous}},courseAtomicRows,accessChangesForSave,acknowledgeCourseAccess,baselineStamp,latestCourse,saveIssue,
 supabase:{rpc:async(name,args)=>{calls.push({name,args});rpcArgs=args;rpcName=name;return rpcPromise??{data:response??(typed||ordinary?ack():normal),error:error??null}},from:()=>{throw Error('Unexpected legacy request')}},
 flushCourseVisibility:async()=>{calls.push({name:'flush'})},
 courseSaveReason:(_stage,e)=>e?.message??'failed',readGroupScheduleConflict:()=>null,t:s=>s,groups:[],allStudents:[],
 reconcileCourse:fn=>{latestCourse.current=fn(latestCourse.current)},setAccessModes:()=>{},setSelectedLessonId:()=>{},
 readDraft:()=>({}),writeDraft:(_key,draft)=>savedDrafts.push(draft),draftKey:'test',sessionStorage:{setItem:()=>{}},window:{dispatchEvent:()=>{}},
 buildConflict:async(...args)=>args,setConflict:value=>{conflict=value},readCourseStamp:async()=>{calls.push({name:'readStamp'});return null},
 getOwnerId:async()=>null,courseSaveProvenance:()=> 'unverified',
 }
 const write=Function(...Object.keys(env),`${actual};return syncCourseNow`)(...Object.values(env))
 return {write,calls,baselineStamp,latestCourse,saveIssue,savedDrafts,confirmedContent,resolve:()=>resolve({data:typed||ordinary?ack():normal,error:null}),getConflict:()=>conflict}
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
h=harness({typed:true});const unsupported=structuredClone(base);unsupported.lessons[0].kind='test';assert.equal(await h.write(unsupported),true);assert.equal(h.calls[1].name,'save_course_full_witness_probe_20261122');assert.equal(h.calls[1].args.p_lessons[0].kind,'test');assert.equal(h.calls[1].args.p_expected_modules.length,1);assert.equal(h.calls[1].args.p_lessons[0].homework.recHwTime,'19:37');assert.equal(h.calls[1].args.p_lessons[0].homework.unownedHomework,'preserve');assert.deepEqual(h.calls[1].args.p_lessons[0].content.externalSibling,{keep:true});assert.equal('unownedSqlField' in h.calls[1].args.p_lessons[0],false);
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
 const env={confirmedContent:{current:null},latestCourse:live,publicationPending:false,lessonShortIdById:{'qa-0':'qa-0'},enqueueChapterSave,saveChain:{current:Promise.resolve()},readCourseStamp:async()=> '2026-01-01T00:00:00Z',baselineStamp:baseline,saveLessonChapters:async()=> '2026-01-02T00:00:00Z',confirmedChapters:{current:confirmed},courseDeltaProbeEnabled:()=>true,setCourse:fn=>{live.current=fn(live.current)},rebaseChapters:c=>({...c}),unsaved:{current:true},chapterProjection:{current:new WeakSet()}}
 const write=Function(...Object.keys(env),`${actualChapter};return saveChaptersOnly`)(...Object.values(env))
 const pending=write('qa-0',{source:'video',items:[]});live.current={...live.current,description:'NEW INPUT DURING CHAPTER'};assert.equal(await pending,true);assert.equal(baseline.current,known?'2026-01-01T00:00:00Z':null,'one-row chapter ACK never certifies whole source');assert.equal(live.current.description,'NEW INPUT DURING CHAPTER');assert.equal(confirmed.size,1)
}
console.log('PASS actual controlled chapter ACK: known/unknown whole baseline never promoted; teacher input survives chapter completion; subsequent whole CAS must review')

// Content-only completion must leave a newer publication intent to its barrier.
h=harness({ordinary:true});assert.equal(await h.write({...structuredClone(base),description:'ORDINARY METADATA'}),true);assert.equal(h.calls[1].name,'save_course_content_delta');assert.equal(h.calls[1].args.p_expected_status,'draft');assert.equal('p_lessons' in h.calls[1].args,false);assert.equal(h.confirmedContent.current.serialized.course.description,'ORDINARY METADATA');
h=harness({ordinary:true,delayed:true});const ordinaryPending=h.write({...structuredClone(base),description:'A ORDINARY'});await Promise.resolve();h.latestCourse.current={...h.latestCourse.current,status:'published',description:'B WITH PUBLISH INTENT'};h.resolve();assert.equal(await ordinaryPending,true);assert.equal(h.latestCourse.current.status,'published');assert.equal(h.savedDrafts[0].description,'B WITH PUBLISH INTENT');assert.equal(h.confirmedContent.current.serialized.course.status,'draft');assert.equal(h.confirmedContent.current.serialized.course.description,'A ORDINARY');assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_delta']);
h=harness({ordinary:true,error:{code:'PT409',message:'ISKRA_COURSE_CONFLICT:2026-01-03T00:00:00Z'}});assert.equal(await h.write({...structuredClone(base),description:'CONFLICT'}),false);assert.equal(h.calls.length,2);assert.equal(h.savedDrafts.length,0);
h=harness({ordinary:true,invalidAck:true});assert.equal(await h.write({...structuredClone(base),description:'BAD ACK'}),false);assert.equal(h.savedDrafts.length,0);assert.equal(h.baselineStamp.current,'2026-01-01T00:00:00Z');
console.log('PASS actual ordinary content dispatch: no schedule/access/publication side effects, A ACK preserves B/publish intent, conflict/error no retry, malformed ACK retains draft')

h=harness({typed:true});const paragraphEdit=structuredClone(base);paragraphEdit.lessons[0].theory='One changed paragraph';assert.equal(await h.write(paragraphEdit),true);assert.equal(h.calls[1].name,'save_course_wide_delta_probe_20261122');assert.equal(h.calls[1].args.p_lesson_patches.length,1);assert.equal(h.calls[1].args.p_lesson_patches[0].json_ops[0].path[0],'paragraphs');assert.equal(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'One changed paragraph');assert.deepEqual(h.confirmedContent.current.serialized.rawLessons['qa-0'].content.externalSibling,{keep:true});
h=harness({typed:true});const unsafeArray=structuredClone(base);unsafeArray.lessons[0].hwTasks.push({id:'new',text:'New task'});assert.equal(await h.write(unsafeArray),false);assert.deepEqual(h.calls.map(c=>c.name),['flush']);assert.equal(h.savedDrafts.length,0);
h=harness({typed:true});const mixedBody=structuredClone(base);mixedBody.lessons[0].theory='Changed body';mixedBody.lessons[0].timecodes=[{time:'00:20',seconds:20,label:'Chapter changed'}];assert.equal(await h.write(mixedBody),false);assert.deepEqual(h.calls.map(c=>c.name),['flush']);
h=harness({typed:true,delayed:true});const wideA=structuredClone(base);wideA.lessons[0].theory='A dispatched paragraph';const pendingWide=h.write(wideA);await Promise.resolve();h.latestCourse.current.lessons[0].theory='B later paragraph';h.resolve();assert.equal(await pendingWide,true);assert.equal(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'A dispatched paragraph');assert.equal(h.savedDrafts[0].lessons[0].theory,'B later paragraph');
console.log('PASS actual wide dispatch: one owned array leaf, raw nested retention, preservation BLOCK never FULL, immutable A ACK/B draft')

// Candidate ordinary body lane, executing the actual proposed editor function.
h=harness({ordinary:true});const ordinaryBody=structuredClone(base);ordinaryBody.lessons[0].theory='Ordinary body';assert.equal(await h.write(ordinaryBody),true);assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_delta']);const ordinaryWire=h.calls[1].args.p_lesson_patches[0];assert.equal(ordinaryWire.homework_set,undefined);assert.equal(ordinaryWire.content_set,undefined);assert.deepEqual(ordinaryWire.json_ops[0].value[0].rawHidden,{recap:'keep',timecodes:[1,2]});assert.equal(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'Ordinary body');assert.deepEqual(h.confirmedContent.current.serialized.rawLessons['qa-0'].content.paragraphs[0].rawHidden,{recap:'keep',timecodes:[1,2]});
h=harness({ordinary:true,delayed:true});const ordinaryBodyA=structuredClone(base);ordinaryBodyA.lessons[0].theory='Ordinary A';const bodyPending=h.write(ordinaryBodyA);await Promise.resolve();h.latestCourse.current={...h.latestCourse.current,status:'published'};h.latestCourse.current.lessons[0].theory='Ordinary B';h.resolve();assert.equal(await bodyPending,true);assert.equal(h.confirmedContent.current.serialized.course.status,'draft');assert.equal(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'Ordinary A');assert.equal(h.latestCourse.current.status,'published');assert.equal(h.savedDrafts[0].lessons[0].theory,'Ordinary B');
for(const mutate of[c=>c.lessons[0].hwTasks.push({id:'new',text:'new'}),c=>c.lessons[0].hwTasks.pop()]){h=harness({ordinary:true});const draft=structuredClone(base);mutate(draft);assert.equal(await h.write(draft),true);assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_full']);assert.deepEqual(h.calls[1].args.p_lessons[0].content.paragraphs[0].rawHidden,{recap:'keep',timecodes:[1,2]});assert.equal(h.savedDrafts.length,1);}
h=harness({ordinary:true});const publishBody=structuredClone(base);publishBody.lessons[0].theory='New theory';publishBody.status='published';assert.equal(await h.write(publishBody),true);assert.equal(h.confirmedContent.current.serialized.course.status,'published');assert.equal(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'New theory');assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_delta','save_course_publication_whole']);
h=harness({ordinary:true,chapterStamp:true});const staleBody=structuredClone(base);staleBody.lessons[0].theory='Changed';assert.equal(await h.write(staleBody),false);assert.deepEqual(h.calls.map(c=>c.name),['flush'],'unmatched stamp cannot dispatch content');
h=harness({ordinary:true,invalidAck:true});const noAckBody=structuredClone(base);noAckBody.lessons[0].theory='Changed';assert.equal(await h.write(noAckBody),false);assert.equal(h.savedDrafts.length,0);
console.log('PASS actual proposed ordinary body dispatch: raw nested attrs, stripped wire, strict ACK, lateA/B/publish isolation, unsafe/stale no fallback')

h=harness({ordinary:true});const linkDraft=structuredClone(base);linkDraft.lessons[0].files={notebook:{id:'new-link',name:'QA version.json',path:'https://iskra-study.ru/version.json',url:'https://iskra-study.ru/version.json',size:0,mime:'text/uri-list'}};assert.equal(await h.write(linkDraft),true);assert.equal(h.calls[1].name,'save_course_content_delta');assert.equal(h.calls[1].args.p_lesson_patches[0].json_ops.length,6);assert.ok(h.calls[1].args.p_lesson_patches[0].json_ops.every(op=>op.column==='materials'&&op.path[0]==='notebook'&&op.path.length===2));assert.deepEqual(h.confirmedContent.current.serialized.rawLessons['qa-0'].materials.rawHiddenMaterials,{keep:true});assert.equal(h.confirmedContent.current.serialized.rawLessons['qa-0'].materials.notebook.path,'https://iskra-study.ru/version.json');console.log('PASS actual editor empty notebook link flow:6scalarops, rawhiddenroot retained, strictACK');

h=harness({ordinary:true});assert.equal(await h.write({...structuredClone(base),numberStart:2}),true);assert.equal(h.calls[1].name,'save_course_content_full');assert.deepEqual(h.calls[1].args.p_lessons,[{short_id:'qa-0',unchanged_id:'aaaaaaaa-0000-4000-8000-000000000004'}]);assert.equal(h.confirmedContent.current.serialized.course.number_start,2);
h=harness({ordinary:true,telemetryThrows:true});const fullDespiteTelemetry=structuredClone(base);fullDespiteTelemetry.lessons[0].hwTasks.push({id:'new-telemetry',text:'New'});assert.equal(await h.write(fullDespiteTelemetry),true);assert.equal(h.calls[1].name,'save_course_content_full');console.log('PASS actual compact FULL dispatch: genuine non-QA gate, strict wire refs, complete immutable ACK, diagnostic failures isolated');

h=harness({ordinary:true,delayed:true});const compactA=structuredClone(base);compactA.lessons[0].hwTasks.push({id:'compact-new-A',text:'A'});const compactPending=h.write(compactA);await Promise.resolve();h.latestCourse.current.lessons[0].theory='B while compact A is in flight';h.resolve();assert.equal(await compactPending,true);assert.equal(h.confirmedContent.current.serialized.lessons[0].homework.hwTasks.at(-1).id,'compact-new-A');assert.notEqual(h.confirmedContent.current.serialized.lessons[0].content.paragraphs[0].text,'B while compact A is in flight');assert.equal(h.savedDrafts[0].lessons[0].theory,'B while compact A is in flight');
for(const options of[{error:{code:'PT409',message:'ISKRA_COURSE_CONFLICT:2026-01-03T00:00:00Z'}},{invalidAck:true}]){h=harness({ordinary:true,...options});const c=structuredClone(base);c.lessons[0].hwTasks.push({id:'rejected-full',text:'A'});assert.equal(await h.write(c),false);assert.deepEqual(h.calls.map(c=>c.name),['flush','save_course_content_full']);assert.equal(h.savedDrafts.length,0)}console.log('PASS actual compact FULL lateACK/conflict/malformed ACK: B draft retained, no retry through legacy engine');

// Drive the real recovered-draft branch through the ordinary (non-QA) route.
const recovery = options => harness({ ordinary: true, recovered: true, ...options })
const recoveredCourse = { ...structuredClone(base), description: 'Recovered local course edit' }
h = recovery()
assert.equal(await h.write(recoveredCourse), true)
let rpc = h.calls.find(call => call.name === 'save_course_content_delta')
assert.deepEqual(rpc.args.p_course_patch, { description: recoveredCourse.description })
assert.deepEqual(rpc.args.p_lesson_patches, [])
h = recovery({ missingBase: true })
assert.equal(await h.write(recoveredCourse), false)
assert.ok(h.calls.every(call => call.name === 'flush'), 'unverified recovery cannot enter legacy writes')
h = recovery({ chapterStamp: true })
assert.equal(await h.write(recoveredCourse), false)
assert.ok(h.getConflict(), 'real stale draft is offered for review')
assert.ok(h.calls.every(call => call.name === 'flush'))
h = recovery({ chapterStamp: true })
assert.equal(await h.write(structuredClone(base)), true)
assert.equal(h.getConflict(), null, 'already committed draft may reopen after a missing ACK')
assert.ok(h.calls.every(call => call.name === 'flush'), 'lost ACK requires no duplicate save')
h = recovery()
const ambiguousLesson = structuredClone(base)
ambiguousLesson.lessons[0].description = 'Older local copy of a changed lesson'
assert.equal(await h.write(ambiguousLesson), false)
assert.ok(h.calls.every(call => call.name === 'flush'))
console.log('PASS actual F5 dispatch: 0 lesson patches for recovered metadata; unverified/ambiguous block writes, true conflict review and lost-ACK clean reopen')
