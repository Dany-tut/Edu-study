// Actual source React effects in an isolated fixture. No user browser/session or live server.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const repo = resolve(process.argv[2] || process.cwd())
const require = createRequire(resolve(repo,'package.json'))
const { build } = require('esbuild')
const { chromium } = require('playwright')
const source = readFileSync(resolve(repo,'src/pages/teacher/TeacherCourseEditorPage.tsx'),'utf8')
const part=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,`${a} ... ${b}`);return source.slice(start,end)}
const init=part('  const [{ course, editRevision, recoveredDraft }','  const metadataRead =')
const draft=part('  const draftNs =','  // ── Сверка с сидом')
const autosave=part('  const chapterProjection =','  // «Сохранено!»')
const runAutosave=part('  function runAutosave(c:','  // Сбой записи:')
const sync=part('  function syncAccessToSupabase(c:','  async function syncCourseNow(')
const onlineRetry=part('  const latestRunAutosave =','  // Сбой — повторяем сами через 30 с')
const statusProp=part('            persisted={','\n          />').trim()
const persistedExpr=statusProp.split('\n')[0].slice('persisted={'.length,-1)
const pendingProp=part('            pendingChanges={','\n            persisted=').trim()
const pendingExpr=pendingProp.slice('pendingChanges={'.length,-1)
const statusSource=readFileSync(resolve(repo,'src/components/SaveStatusLine.tsx'),'utf8')
const statusView=statusSource.slice(statusSource.indexOf('  const displayInput ='),statusSource.indexOf('\n\n  // Строка меняется'))
const statusTimer=statusSource.slice(statusSource.indexOf('  const [, setTick]'),statusSource.indexOf('\n  let content ='))
const code=`import React,{useState,useEffect,useRef,useCallback,useSyncExternalStore} from 'react';import {createRoot} from 'react-dom/client';
import {createLatestSave} from './src/lib/latestSaveQueue';
import {courseSaveProvenance} from './src/lib/courseSaveProvenance';
import {saveStatusView,nextStatusChangeIn} from './src/lib/sync/saveStatus';
let networkOnline=window.__initial.online??true;const transportWorks=window.__initial.transportWorks??false;const listeners=new Set();
const getWriteActivity=()=>({online:networkOnline}),subscribeWriteActivity=cb=>{listeners.add(cb);return()=>listeners.delete(cb)};
const drafts=new Map(),calls=[],pending=[],views=[];let clears=0,flashes=0;
let serverStamp=window.__initial.remoteStamp??'2026-11-22T00:00:01Z',serverValue=window.__initial.remoteValue??'DATABASE BEFORE';
const readDraft=()=>window.__initial.draft??null,writeDraft=(k,v)=>drafts.set(k,v),clearDrafts=()=>{clears++;drafts.clear()},uid=()=> 'new',t=x=>x;
if(window.__initial.draft)drafts.set('coursed.A.course',window.__initial.draft);
const courseSaveReason=()=> 'request failed';
function App(){
 const editingCourseJson=JSON.stringify(window.__initial.base);
 ${init}
 const [autosaving,setAutosaving]=useState(0),[publishErr,setPublishErr]=useState(null),[lastSavedAt,setLastSavedAt]=useState(null),[saveFailures,setSaveFailures]=useState(0),[conflict,setConflict]=useState(null);
 const baselineStamp=useRef(course.serverStamp??null),saveIssue=useRef(null);
 const publicationPending=false,saving=autosaving>0;const setCourseEdited=()=>{};
 const flash=()=>{flashes++;setSaveFailures(0);setLastSavedAt(Date.now())};
 const noteSaveFailure=()=>setSaveFailures(n=>n+1);
 ${draft}
 ${autosave}
 const unsaved=useRef(recoveredDraft),latestCourse=useRef(course);latestCourse.current=course;
 const saveChain=useRef(Promise.resolve()),enqueueCourseAutosave=useRef(createLatestSave(saveChain)).current;
 const rebaseChapters=c=>c;
 ${sync}
 async function syncCourseNow(c){
  const i=calls.length,atDispatch=baselineStamp.current;
  calls.push({value:c.value,baseline:atDispatch});
  if(!online&&!transportWorks)return false;
  if(courseSaveProvenance(atDispatch,serverStamp)!=='save'){setConflict(atDispatch?'stale':'unverified');return false}
  const ok=await new Promise(resolve=>pending[i]=resolve);
  if(!ok)return false;
  // Check at commit too: a read made at dispatch cannot authorize a later
  // overwrite. This models the actual server CAS contract, not its SQL timing.
  if(courseSaveProvenance(atDispatch,serverStamp)!=='save'){setConflict('stale');return false}
  serverValue=c.value;serverStamp='2026-11-22T00:00:'+String(2+i).padStart(2,'0')+'Z';baselineStamp.current=serverStamp;
  reconcileCourse(before=>({...before,ack:(before.ack??0)+1}));return true;
 }
 ${runAutosave}
 ${onlineRetry}
 const savingSince=useRef(null);
 if(saving&&savingSince.current===null)savingSince.current=Date.now();if(!saving)savingSince.current=null;
 const requireCurrentAck=true,pendingChanges=${pendingExpr},persisted=${persistedExpr},failed=saveFailures>0;
 const input={saving,savingSince:savingSince.current,lastSavedAt,failed,online,pendingChanges,persisted,now:Date.now()};
 ${statusView}
 ${statusTimer}
 views.push({kind:view.kind,value:course.value,saving:autosaving>0,at:Date.now()});
 window.api={
  get(){return {value:course.value,calls:[...calls],view:view.kind,views:[...views],draft:[...drafts.values()].map(x=>x.value),unsaved:unsaved.current,autosaving,clears,flashes,conflict,baseline:baselineStamp.current,serverStamp,serverValue}},
  edit(value){setCourse(before=>({...before,value}))},
  complete(i,ok=true){pending[i](ok)},
  retry(){void runAutosave(course)},
  remote(value,stamp){serverValue=value;serverStamp=stamp},
  online(value){networkOnline=value;for(const listener of listeners)listener()},
  metadata(value){reconcileCourse(before=>({...before,metadataPending:value}))},
  ack(){reconcileCourse(before=>({...before,ack:(before.ack??0)+1}))},
  chapter(){setCourse(before=>{const after={...before,chapterAck:true};chapterProjection.current.add(after);return after})},
 };return <output data-save-status={view.kind}>{view.kind}</output>;
}createRoot(document.getElementById('root')).render(<App/>);`
const out=await build({stdin:{contents:code,resolveDir:repo,loader:'tsx'},bundle:true,format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})})
const errors=[]
const base={id:'A',dbCourseId:'A',title:'Restored course',status:'draft',value:'SHELF',serverStamp:'2026-11-22T00:00:01Z',modules:[],lessons:[]}
async function fixture(overrides={}){
 const page=await browser.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('fixture pageerror',e.message)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('fixture console',m.text())}});
 const initial={base,draft:{...base,value:'LOCAL UNSAVED'},...overrides};
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:'window.__initial='+JSON.stringify(initial)});
 await page.addScriptTag({content:out.outputFiles[0].text});if(errors.length)throw Error(errors.join('\n'));await page.waitForFunction(()=>!!window.api,{},{timeout:5000}).catch(async e=>{console.error(await page.evaluate(()=>({initial:window.__initial,html:document.body.innerHTML.slice(0,1500),api:typeof window.api})));throw e});return page;
}
const get=page=>page.evaluate(()=>window.api.get())
try{
 let page=await fixture();let s=await get(page);
 assert.equal(s.views.some(x=>x.kind==='saved'),false,'first restored frame cannot claim database confirmation');assert.equal(s.unsaved,true);
 await page.waitForFunction(()=>window.api.get().calls.length===1);
 s=await get(page);assert.equal(s.calls[0].value,'LOCAL UNSAVED');assert.equal(s.calls[0].baseline,base.serverStamp);assert.equal(s.serverValue,'DATABASE BEFORE');assert.equal(s.clears,0);
 await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().autosaving===0);
 s=await get(page);assert.equal(s.serverValue,'LOCAL UNSAVED');assert.equal(s.unsaved,false);assert.equal(s.view,'saved');assert.deepEqual(s.draft,[]);
 await page.waitForTimeout(1100);assert.equal((await get(page)).calls.length,1,'server ACK cannot enqueue itself');await page.close();

 page=await fixture({online:false,transportWorks:true});await page.waitForFunction(()=>window.api.get().calls.length===1);await page.waitForFunction(()=>window.api.get().view==='saving');s=await get(page);assert.equal(s.views.some(x=>x.kind==='offline'),true,'pending before request may honestly use the platform offline hint');assert.equal(s.calls.length,1,'display priority must not trigger extra retries');await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().autosaving===0);s=await get(page);assert.equal(s.view,'saved');assert.equal(s.calls.length,1);await page.close();

 // A previously confirmed A timestamp must not certify B, including B's
 // first render before its passive effect or its900ms debounce fires.
 page=await fixture();await page.waitForFunction(()=>window.api.get().calls.length===1);await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().view==='saved');
 await page.evaluate(()=>window.api.edit('B AFTER SAVED A'));await page.waitForFunction(()=>window.api.get().value==='B AFTER SAVED A');s=await get(page);
 assert.equal(s.calls.length,1,'B is still before debounce');assert.notEqual(s.view,'saved');assert.ok(s.views.filter(x=>x.value==='B AFTER SAVED A').every(x=>x.kind!=='saved'),'not even first B render may reuse A timestamp');
 await page.waitForFunction(()=>window.api.get().calls.length===2);s=await get(page);assert.notEqual(s.view,'saved','first<400ms of B request must not reuse A timestamp');assert.ok(s.views.filter(x=>x.value==='B AFTER SAVED A').every(x=>x.kind!=='saved'));
 await page.evaluate(()=>window.api.edit('C WHILE B ACTIVE'));await page.waitForTimeout(1000);await page.evaluate(()=>window.api.complete(1));await page.waitForFunction(()=>window.api.get().calls.length===3);s=await get(page);assert.equal(s.value,'C WHILE B ACTIVE');assert.notEqual(s.view,'saved');assert.ok(s.views.filter(x=>x.value==='C WHILE B ACTIVE').every(x=>x.kind!=='saved'),'late B ACK cannot revive any stale timestamp');
 await page.evaluate(()=>window.api.complete(2));await page.waitForFunction(()=>window.api.get().autosaving===0);s=await get(page);assert.equal(s.view,'saved');assert.equal(s.serverValue,'C WHILE B ACTIVE');await page.close();

 page=await fixture({draft:null});await page.waitForTimeout(1100);s=await get(page);assert.equal(s.calls.length,0,'clean saved course keeps first-render skip');assert.equal(s.view,'saved');await page.close();

 page=await fixture({online:false});await page.waitForFunction(()=>window.api.get().calls.length===1&&window.api.get().autosaving===0);
 s=await get(page);assert.equal(s.view,'offline');assert.equal(s.unsaved,true);assert.deepEqual(s.draft,['LOCAL UNSAVED']);assert.equal(s.baseline,base.serverStamp);
 await page.evaluate(()=>window.api.online(true));await page.waitForFunction(()=>window.api.get().calls.length===2);await page.evaluate(()=>window.api.complete(1));await page.waitForFunction(()=>window.api.get().autosaving===0);assert.equal((await get(page)).view,'saved');await page.close();

 page=await fixture();await page.waitForFunction(()=>window.api.get().calls.length===1);await page.evaluate(()=>window.api.complete(0,false));await page.waitForFunction(()=>window.api.get().autosaving===0);s=await get(page);assert.equal(s.view,'error');assert.equal(s.clears,0);assert.equal(s.unsaved,true);assert.deepEqual(s.draft,['LOCAL UNSAVED']);await page.close();

 for(const [draftStamp,remoteStamp,expected] of [[undefined,'2026-11-22T00:00:01Z','unverified'],[base.serverStamp,'2026-11-22T00:00:09Z','stale']]){
  page=await fixture({draft:{...base,value:'LOCAL UNSAVED',serverStamp:draftStamp},remoteStamp});await page.waitForFunction(()=>window.api.get().conflict!==null);s=await get(page);assert.equal(s.conflict,expected);assert.equal(s.clears,0);assert.equal(s.unsaved,true);assert.equal(s.serverValue,'DATABASE BEFORE');assert.equal(s.baseline,draftStamp??null,'never adopt a freshly read remote stamp to certify a recovered draft');await page.close();
 }

 page=await fixture();await page.waitForFunction(()=>window.api.get().calls.length===1);await page.evaluate(()=>{window.api.remote('OTHER TEACHER','2026-11-22T00:00:09Z');window.api.complete(0)});await page.waitForFunction(()=>window.api.get().autosaving===0);s=await get(page);assert.equal(s.conflict,'stale');assert.equal(s.serverValue,'OTHER TEACHER');assert.deepEqual(s.draft,['LOCAL UNSAVED']);assert.equal(s.clears,0);await page.close();

 page=await fixture();await page.waitForFunction(()=>window.api.get().calls.length===1);await page.evaluate(()=>window.api.edit('NEWER LOCAL'));
 await page.waitForTimeout(1000);await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().calls.length===2);s=await get(page);assert.equal(s.value,'NEWER LOCAL');assert.equal(s.unsaved,true);assert.equal(s.flashes,0);assert.equal(s.clears,0);assert.deepEqual(s.draft,['NEWER LOCAL']);assert.notEqual(s.view,'saved');
 await page.evaluate(()=>window.api.complete(1));await page.waitForFunction(()=>window.api.get().autosaving===0);s=await get(page);assert.equal(s.serverValue,'NEWER LOCAL');assert.equal(s.unsaved,false);assert.equal(s.flashes,1);await page.close();
 page=await fixture();await page.waitForFunction(()=>window.api.get().calls.length===1);await page.evaluate(()=>window.api.complete(0));await page.waitForFunction(()=>window.api.get().view==='saved');await page.evaluate(()=>window.api.chapter());await page.waitForTimeout(1100);s=await get(page);assert.equal(s.calls.length,1,'confirmed chapter projection cannot trigger whole-course save');assert.equal(s.view,'saved');await page.close();
 assert.deepEqual(errors,[]);console.log('PASS actual React effects: restored dirty initial frame/autosave, clean skip, offline/reconnect, failed request, unverified/stale provenance, concurrent remote commit, old ACK/newer draft and no self-save loop')
}finally{await browser.close()}
