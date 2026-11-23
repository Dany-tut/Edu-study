import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from 'playwright'
let source=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
if(process.env.ISKRA_MUTATE_AUTOSAVE_ACK==='1')source=source.replace('if (autosaveEditRevision.current === editRevision) return','')
const part=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end)}
// Run the production effect/ack bookkeeping, not a hand-written copy of it.
const draft=part('  const draftNs =','  // ── Сверка с сидом')
const seedComparison=part('  const [seedDiff, setSeedDiff] =','  const [seedSyncOpen, setSeedSyncOpen] =')
const autosave=part('  const chapterProjection =','  // «Сохранено!»')
const runAutosave=part('  function runAutosave(c:','  // Сбой записи:')
const sync=part('  function syncAccessToSupabase(c:','  async function syncCourseNow(')
const code=`import React,{useState,useEffect,useRef} from 'react';import {createRoot} from 'react-dom/client';import {createLatestSave} from './src/lib/latestSaveQueue';
const calls=[],pending=[],drafts=new Map();let flashes=0,errors=0;
const writeDraft=(k,v)=>drafts.set(k,v);const clearDrafts=()=>drafts.clear();const t=x=>x;const courseSaveReason=()=>"failed";
const SEED_CARDS={fixture:{stamp:'fixture-stamp'}};
const diffAgainstSeed=async()=>({seedKey:'fixture',changes:[]});
function App(){
 const [{course,editRevision},setState]=useState({course:{id:'A',dbCourseId:'A',title:'Synthetic course',value:0,metadataPending:!!window.__initialMetadata},editRevision:0});
 const reconcileCourse=apply=>setState(previous=>{const course=apply(previous.course);return course===previous.course?previous:{...previous,course}});
 const recoveredDraft=false;
 const [autosaving,setAutosaving]=useState(0);const [publishErr,setPublishErr]=useState(null);
 const publishedEditRevision=useRef(null),baselineStamp=useRef('stamp'),saveIssue=useRef(null);
 const publicationPending=false;const setCourseEdited=()=>{};const flash=()=>{flashes++};const noteSaveFailure=()=>{errors++};
 ${draft}
 ${seedComparison}
 ${autosave}
 const unsaved=useRef(false);
 const saveChain=useRef(Promise.resolve());const enqueueCourseAutosave=useRef(createLatestSave(saveChain)).current;
 const rebaseChapters=c=>c;
 ${sync}
 async function syncCourseNow(c){calls.push(c.value);const ok=await new Promise(resolve=>pending.push(resolve));
 if(ok)setState(before=>({...before,course:{...before.course,ack:(before.course.ack??0)+1}}));return ok;}
 ${runAutosave}
 window.api={metadata(pending){setState(before=>({...before,course:{...before.course,metadataPending:pending}}))},edit(value){setState(before=>({course:{...before.course,value},editRevision:before.editRevision+1}))},
 ack(){setState(before=>({...before,course:{...before.course,ack:(before.course.ack??0)+1}}))},
 complete(index,ok=true){pending[index](ok)},retry(){return runAutosave(course)},
 get(){return {calls:[...calls],autosaving,unsaved:unsaved.current,draft:[...drafts.values()].map(v=>v.value),flashes,errors,revision:editRevision,ack:course.ack??0,seedStamp:course.seedStamp}}};return null;
}createRoot(document.getElementById('root')).render(<App/>);`
const out=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});const page=await browser.newPage();const browserErrors=[];page.on('pageerror',e=>browserErrors.push(e.message))
try {
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:out.outputFiles[0].text});await page.waitForFunction(()=>!!window.api)
 await page.waitForFunction(()=>window.api.get().seedStamp==='fixture-stamp')
 await page.evaluate(()=>window.api.ack());await page.waitForTimeout(1100)
 assert.deepEqual(await page.evaluate(()=>window.api.get().calls),[],'server-only hydration must not save')
 await page.evaluate(()=>{window.api.metadata(true);window.api.edit(1)});await page.waitForTimeout(1100)
 assert.deepEqual(await page.evaluate(()=>window.api.get().calls),[],'pending metadata must wait without consuming the edit revision')
 await page.evaluate(()=>window.api.metadata(false));await page.waitForTimeout(300);await page.evaluate(()=>window.api.ack());await page.waitForFunction(()=>window.api.get().calls.length===1)
 await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().autosaving===0)
 let s=await page.evaluate(()=>window.api.get());assert.equal(s.unsaved,false);assert.deepEqual(s.draft,[])
 await page.waitForTimeout(1200);assert.deepEqual(await page.evaluate(()=>window.api.get().calls),[1],'access acknowledgement must not start a save loop')
 await page.evaluate(()=>window.api.edit(2));await page.waitForFunction(()=>window.api.get().calls.length===2)
 await page.evaluate(()=>window.api.edit(3));await page.waitForTimeout(1000)
 await page.evaluate(()=>window.api.edit(4));await page.waitForTimeout(1000)
 s=await page.evaluate(()=>window.api.get());assert.deepEqual(s.calls,[1,2]);assert.equal(s.autosaving,3)
 await page.evaluate(()=>window.api.complete(1));await page.waitForFunction(()=>window.api.get().calls.length===3)
 s=await page.evaluate(()=>window.api.get());assert.deepEqual(s.calls,[1,2,4]);assert.deepEqual(s.draft,[4]);assert.equal(s.unsaved,true)
 assert.equal(s.flashes,1,'older success cannot flash Saved while latest is pending')
 await page.evaluate(()=>window.api.complete(2,false));await page.waitForFunction(()=>window.api.get().autosaving===0)
 s=await page.evaluate(()=>window.api.get());assert.deepEqual(s.draft,[4]);assert.equal(s.unsaved,true);assert.equal(s.errors,1,'coalesced failure is reported once for the current edit')
 await page.evaluate(()=>{void window.api.retry()});await page.waitForFunction(()=>window.api.get().calls.length===4)
 await page.evaluate(()=>window.api.complete(3));await page.waitForFunction(()=>window.api.get().autosaving===0)
 s=await page.evaluate(()=>window.api.get());assert.deepEqual(s.draft,[]);assert.equal(s.unsaved,false);assert.equal(s.flashes,2)
 await page.waitForTimeout(1200);assert.equal((await page.evaluate(()=>window.api.get())).calls.length,4)
 assert.deepEqual(browserErrors,[])
 const loading=await browser.newPage();await loading.setContent('<div id="root"></div>')
 await loading.addScriptTag({content:'window.__initialMetadata=true'})
 await loading.addScriptTag({content:out.outputFiles[0].text});await loading.waitForFunction(()=>!!window.api)
 await loading.evaluate(()=>window.api.edit(9));await loading.waitForTimeout(1100)
 assert.deepEqual(await loading.evaluate(()=>window.api.get().calls),[])
 await loading.evaluate(()=>window.api.metadata(false));await loading.waitForFunction(()=>window.api.get().calls.length===1)
 assert.deepEqual(await loading.evaluate(()=>window.api.get().calls),[9],'first edit made during initial loading must save when metadata arrives')
 await loading.evaluate(()=>window.api.complete(0));await loading.waitForFunction(()=>window.api.get().autosaving===0)
 assert.deepEqual((await loading.evaluate(()=>window.api.get())).draft,[]);await loading.close()
 console.log('PASS actual production effects: server ack does not enqueue; successful save stops; active+latest; no stale Saved; current draft survives late ack/failure; one failure notification; retry clears only confirmed draft')
}finally{await browser.close()}
