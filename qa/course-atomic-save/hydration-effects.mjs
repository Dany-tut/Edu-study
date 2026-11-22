// Actual editor hydration/autosave effects; isolated transport and auth, no live data.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
const repo=process.cwd(),require=createRequire(resolve(repo,'package.json'))
const {build}=require('esbuild'),{chromium}=require('playwright')
const source=readFileSync(resolve(repo,'src/pages/teacher/TeacherCourseEditorPage.tsx'),'utf8')
const part=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i,a);return source.slice(i,j)}
const init=part('  const [{ course, editRevision, recoveredDraft }','  const metadataRead =')
const hydration=part('  const metadataRead =','  // Конспект, потерянный при сохранении,')
const heavy=part('function mergeCourseHeavy','// ─── Main page')
const autosave=part('  const chapterProjection =','  // «Сохранено!»')
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const owner=id(1),cid=id(2),module=id(3),stamp='2026-11-22T01:00:01.123456Z'
const rows=Array.from({length:80},(_,i)=>({id:id(100+i),short_id:`qa-${i}`,module_id:module,updated_at:stamp,content:{paragraphs:[]},homework:{recHwTime:'19:37',hwTasks:[]},materials:{}}))
const lessons=rows.map((r,i)=>({id:r.short_id,persistedShortId:r.short_id,title:`Lesson ${i}`,number:i+1,kind:'lesson'}))
const metadata={serverStamp:stamp,title:'SERVER',subject:'qa',level:'a',status:'draft',description:'SERVER DESCRIPTION',color:'blue',bg:'white',numberStart:1,groupIds:[],studentIds:[],modules:[{id:module,label:'M',expanded:true,lessonIds:lessons.map(l=>l.id)}],lessons}
const witness={courseId:cid,courseShortId:'00e3a0efbf',ownerId:owner,courseUpdatedAt:stamp,modules:[{id:module,label:'M',position:0}],lessons:rows.map(r=>({id:r.id,shortId:r.short_id,moduleId:r.module_id,updatedAt:r.updated_at}))}
const base={id:'00e3a0efbf',dbCourseId:'00e3a0efbf',title:'SHELF',subject:'qa',level:'a',status:'draft',description:'SHELF',color:'blue',bg:'white',groupIds:[],studentIds:[],lessons:[],modules:[],metadataPending:true,heavyPending:true}
const code=`import React,{useState,useEffect,useRef,useCallback} from 'react';import{createRoot}from'react-dom/client';
import{captureConfirmedBaseline,baselineCanDriveDelta}from'./src/lib/courseConfirmedBaseline';
import{courseContentSnapshot,courseDeltaProbeEnabled}from'./src/lib/courseContentDelta';
import{createAuthDataChangeGuard}from'./src/lib/authDataChange';
let metadataResolve,heavyResolve,metadataCalls=0,heavyCalls=0,authHandler,calls=[];
const getOwnerId=async()=>window.__fixture.owner;
const supabase={auth:{onAuthStateChange(cb){authHandler=cb;queueMicrotask(()=>cb('INITIAL_SESSION',{user:{id:window.__fixture.owner,role:'authenticated',app_metadata:{}}}));return{data:{subscription:{unsubscribe(){}}}}}},from(){return{select(){return this},eq(){return this},single(){heavyCalls++;return new Promise(r=>heavyResolve=r)}}}};
const loadCourseEditorMetadata=()=>{metadataCalls++;return new Promise(r=>metadataResolve=r)};
const readDraft=()=>window.__fixture.restored?{...window.__fixture.base,metadataPending:false,heavyPending:false,title:'LOCAL'}:null,uid=()=>'',t=x=>x;
const paragraphsToTheory=()=>({theory:'',images:[]}),authoredLesson=()=>null,readTranscript=x=>x,parseLessonFiles=x=>x;
${heavy}
function App(){const editingCourseJson=JSON.stringify(window.__fixture.base);
${init}
${hydration}
const publicationPending=false,unsaved=useRef(false),setCourseEdited=()=>{};
function runAutosave(c){calls.push(structuredClone(c));return Promise.resolve(true)}
${autosave}
window.api={get(){return{course,editRevision,baseline:confirmedContent.current,scope:readScope.current,calls,metadataCalls,heavyCalls}},edit(title){setCourse(c=>({...c,title}))},
 metadata(){metadataResolve(window.__fixture.envelope)},heavy(mixed=false){const f=window.__fixture;heavyResolve({data:{id:f.witness.courseId,created_by:f.owner,updated_at:mixed?'2026-11-22T01:00:02Z':f.witness.courseUpdatedAt,course_modules:f.witness.modules,lessons:f.rows},error:null})},signout(){authHandler('SIGNED_OUT',null)}};
return null;}createRoot(document.getElementById('root')).render(<App/>);`
const out=await build({stdin:{contents:code,resolveDir:repo,loader:'tsx'},bundle:true,format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'})
const errors=[]
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<div id="root"></div>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/?qa_course_save=20261122&qa_course_delta=20261122`
async function fixture(restored=false){const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.evaluate(f=>{window.__fixture=f},{owner,base,rows,witness,restored,envelope:{metadata,witness,numberStart:{included:true,readCourseUpdatedAt:stamp},rawCourse:{...metadata},rawLessons:rows}});await page.addScriptTag({content:out.outputFiles[0].text});await page.waitForFunction(()=>!!window.api);return page}
const get=p=>p.evaluate(()=>window.api.get())
try{
 let p=await fixture();await p.waitForFunction(()=>window.api.get().metadataCalls===1);await p.evaluate(()=>window.api.metadata());await p.waitForFunction(()=>window.api.get().heavyCalls===1);await p.evaluate(()=>window.api.heavy());await p.waitForFunction(()=>!window.api.get().course.heavyPending);await p.waitForTimeout(1100);let s=await get(p);assert.equal(s.editRevision,0);assert.equal(s.calls.length,0);assert.equal(s.baseline.serialized.course.title,'SERVER');assert.equal(s.baseline.lessons.length,80);await p.close();
 p=await fixture();await p.waitForFunction(()=>window.api.get().metadataCalls===1);await p.evaluate(()=>window.api.metadata());await p.waitForFunction(()=>window.api.get().heavyCalls===1);await p.evaluate(()=>window.api.edit('TEACHER WHILE HEAVY'));await p.waitForTimeout(1000);assert.equal((await get(p)).calls.length,0);await p.evaluate(()=>window.api.heavy());await p.waitForFunction(()=>window.api.get().calls.length===1);s=await get(p);assert.equal(s.calls[0].title,'TEACHER WHILE HEAVY');assert.equal(s.calls[0].lessons.length,80);assert.equal(s.baseline.serialized.course.title,'SERVER');assert.equal(s.editRevision,1);await p.waitForTimeout(1100);assert.equal((await get(p)).calls.length,1);await p.close();
 p=await fixture();await p.waitForFunction(()=>window.api.get().metadataCalls===1);await p.evaluate(()=>window.api.edit('TEACHER WHILE METADATA'));await p.evaluate(()=>window.api.metadata());await p.waitForFunction(()=>window.api.get().heavyCalls===1);await p.evaluate(()=>window.api.heavy());await p.waitForFunction(()=>window.api.get().calls.length===1);s=await get(p);assert.equal(s.course.title,'TEACHER WHILE METADATA');assert.equal(s.baseline.serialized.course.title,'SERVER');await p.close();
 for(const mode of ['mixed','signout']){p=await fixture();await p.waitForFunction(()=>window.api.get().metadataCalls===1);await p.evaluate(()=>window.api.metadata());await p.waitForFunction(()=>window.api.get().heavyCalls===1);if(mode==='signout')await p.evaluate(()=>window.api.signout());await p.evaluate(m=>window.api.heavy(m==='mixed'),mode);await p.waitForFunction(()=>!window.api.get().course.heavyPending);assert.equal((await get(p)).baseline,null);await p.close()}
 p=await fixture(true);await p.waitForTimeout(1100);s=await get(p);assert.equal(s.baseline,null);assert.equal(s.metadataCalls,0);await p.close();assert.deepEqual(errors,[]);
 console.log('PASS actual hydration effects: passive load no save, edit during metadata/heavy retained, pristine80 baseline separate from teacher revision, exactly one queued save, mixed/auth/restored source rejected')
}finally{await browser.close();await new Promise(r=>server.close(r))}
