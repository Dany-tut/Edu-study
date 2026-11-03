import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

// Exercise the real loader and standalone conversion with controlled reads.
// No network, database changes, test-only production branches or UI fixtures.
const root = resolve(process.env.STANDALONE_SOURCE_ROOT || '.')
const output = resolve('node_modules/.cache/checkStandaloneHomeworkRecovery.mjs')
await mkdir(resolve('node_modules/.cache'), { recursive: true })
const mocks = {
  '../lib/db': `
    export const fetchStudentTrack=async s=>({scope:{studentIds:[s.id]},subjects:[],progress:globalThis.__progress});
    export const fetchScheduleDays=async()=>[];
    export const fetchProgressAttachments=async()=>({});
    export const fetchLessonsHeavy=async()=>({});
    export const withBankHard=x=>x;
    export const mergeSubjectsWithProgress=(subjects,progress)=>subjects.map(s=>({...s,modules:s.modules.map(m=>({...m,lessons:m.lessons.map(l=>({...l,status:'current',points:progress[l.id]?.score}))}))}));
    export const computeStats=()=>({});
    export const fetchQuizQuestions=async()=>[];
    export const fetchScienceFacts=async()=>[];
    export const fetchScienceMemes=async()=>[];
    export const fetchCourseReactions=async()=>[];`,
  '../data/personalStudentDemoData': 'export const buildPersonalStudentDemo=()=>({})',
  '../data/devStudentDemo': 'export const DEMO_SUBJECTS=[];export const DEMO_SCHEDULE=[];export const DEMO_STATS={}',
  '../lib/personalStudentDemo': 'export const personalDemoOwner=()=>null',
  '../lib/studentSession': 'export const getStudentSession=()=>globalThis.__student',
  '../lib/homeworkAttempts': 'export const startHomeworkRetake=()=>{}',
  '../lib/homeworkResult': 'export const homeworkResult=()=>{}',
  '../data/apLessonChunk': 'export const loadApLessons=()=>{}',
  '../lib/subjects': 'export const getSubject=()=>null',
  '../lib/homeworkReset': 'export const reconcileLocalHomework=()=>[];export const reconcileCourseReset=()=>[];export const courseResetRef=id=>"reset:"+id',
  './dashboardStore': 'export const useDashboard={getState:()=>({activeSubjectId:"hw-inbox",forgetLessons(){},syncLessonAssessments(){},setActiveSubject(){},setScheduleIndex(){},setHardStatus(){}})}',
  './i18n': 'export const t=x=>x',
}
await build({ entryPoints:[resolve(root,'src/store/studentDataStore.ts')],bundle:true,platform:'node',format:'esm',outfile:output,packages:'external',logLevel:'silent',define:{'import.meta.env.DEV':'false'},plugins:[{name:'controlled-local-reads',setup(b){
  b.onResolve({filter:/supabase$/},()=>({path:'client',namespace:'controlled'}))
  b.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'controlled'}:undefined)
  b.onLoad({filter:/.*/,namespace:'controlled'},args=>({contents:args.path==='client'?'export const supabase=globalThis.__client':mocks[args.path]}))
}}] })

globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}}
globalThis.window={location:{search:''}}
globalThis.__student={id:'A',groupId:'GA',name:'Learner A'}
globalThis.__auth={user:{id:'authA',role:'authenticated',app_metadata:{role:'student'},last_sign_in_at:'session1'}}
globalThis.__progress={}
let read, groupError=false, bankError=false
const success=(data)=>({data,error:null,status:200})
const failed=(status)=>({data:null,error:{message:'controlled failure'},status})
const row=(id,extra={})=>({id,title:`Homework ${id}`,task_ids:[],basic_tasks:[{id:'q',type:'fill',question:`Only ${id}`,answer:'answer'}],hard_tasks:[],...extra})
function query(table){
  const q={select(){return q},eq(){return q},is(){return q},order(){return q},in(){return q},maybeSingle(){return q},then(a,b){
    return Promise.resolve().then(()=>table==='homework'?read():table==='groups'?(groupError?failed(503):success({subject:'Chemistry'})):bankError?failed(503):success([])).then(a,b)
  }};return q
}
globalThis.__client={from:query,auth:{getSession:async()=>({data:{session:globalThis.__auth}})},functions:{invoke:()=>new Promise(()=>{})}}
const originalDebug=console.debug;console.debug=()=>{}
const {useStudentData}=await import(pathToFileURL(output).href+'?run='+Date.now())
const load=()=>useStudentData.getState().load({afterTestlySync:true})
const titles=()=>useStudentData.getState().subjects.flatMap(s=>s.modules.flatMap(m=>m.lessons.map(l=>l.title)))
const points=()=>useStudentData.getState().subjects[0]?.modules[0].lessons[0].points
read=()=>success([row('A')]);await load();assert.deepEqual(titles(),['Homework A'])
for(const status of [503,0,408,429]){read=()=>failed(status);await load();assert.deepEqual(titles(),['Homework A'],`status ${status} must retain same-context definitions`)}
read=()=>{throw new DOMException('controlled timeout','TimeoutError')};await load();assert.deepEqual(titles(),['Homework A'],'timeout must retain the last successful definitions')
globalThis.__progress={'hw-A':{score:90}};await load();assert.equal(points(),90,'Cached definitions must merge fresh progress, never cached grades')
read=()=>success([row('A-new')]);await load();assert.deepEqual(titles(),['Homework A-new'],'Recovery must replace old definitions')
read=()=>success([]);await load();assert.deepEqual(titles(),[],'200 [] must remove withdrawn homework')
read=()=>failed(503);await load();assert.deepEqual(titles(),[],'A withdrawn snapshot must not reappear on failure')
for(const status of [401,403]){read=()=>success([row('A')]);await load();read=()=>failed(status);await load();assert.deepEqual(titles(),[],`status ${status} must fail closed`);read=()=>failed(503);await load();assert.deepEqual(titles(),[],'Denied definitions cannot be resurrected')}
read=()=>success([row('A')]);await load();globalThis.__student={id:'B',groupId:'GB',name:'Learner B'};globalThis.__auth={user:{id:'authB',role:'authenticated',app_metadata:{role:'student'},last_sign_in_at:'sessionB'}};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'B cannot receive A cache')
read=()=>success([row('B')]);await load();globalThis.__student={...globalThis.__student,groupId:'GB2'};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'Changing group cannot retain the former group')
read=()=>success([row('B2')]);await load();globalThis.__auth={user:{...globalThis.__auth.user,app_metadata:{role:'restricted'}}};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'Changed permissions must invalidate the fallback')
read=()=>success([row('B2')]);await load();globalThis.__auth={user:{...globalThis.__auth.user,last_sign_in_at:'new-login'}};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'A new login must not reuse a previous auth session snapshot')
// Sibling student rows may share one Auth account and even the same group.
read=()=>success([row('sibling-A')]);await load();globalThis.__student={...globalThis.__student,id:'sibling-B'};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'Student-row identity must be part of the slot key')
read=()=>success([row('sibling-B')]);await load();globalThis.__auth={user:{...globalThis.__auth.user,id:'different-auth'}};read=()=>failed(503);await load();assert.deepEqual(titles(),[],'Changing only Auth identity invalidates the slot')
// Permissions may change while a read is already in flight, without another load.
read=()=>success([row('before-permission-change')]);await load();let finishPermission;read=()=>new Promise(r=>finishPermission=r);const pendingPermission=load();while(!finishPermission)await new Promise(r=>setImmediate(r));globalThis.__auth={user:{...globalThis.__auth.user,app_metadata:{role:'changed-during-read'}}};finishPermission(success([row('old-permission-data')]));await pendingPermission;assert.deepEqual(titles(),[],'An old-permission response cannot be published')
// A resolves after B: exercise the existing loadSequence and live session guard.
globalThis.__student={id:'A',groupId:'GA',name:'Learner A'};globalThis.__auth={user:{id:'authA',role:'authenticated',app_metadata:{role:'student'},last_sign_in_at:'sessionA'}};let finishA;read=()=>new Promise(r=>finishA=r);const pendingA=load();while(!finishA)await new Promise(r=>setImmediate(r));
globalThis.__student={id:'B',groupId:'GB',name:'Learner B'};globalThis.__auth={user:{id:'authB',role:'authenticated',app_metadata:{role:'student'},last_sign_in_at:'sessionB'}};read=()=>success([row('B-latest')]);await load();finishA(success([row('A-late')]));await pendingA;assert.deepEqual(titles(),['Homework B-latest'],'Late A must not publish over B')
// Same learner moves groups while an older read is still in flight.
let finishOldGroup;read=()=>new Promise(r=>finishOldGroup=r);const oldGroup=load();while(!finishOldGroup)await new Promise(r=>setImmediate(r));globalThis.__student={...globalThis.__student,groupId:'GB-new'};read=()=>success([row('new-group')]);await load();finishOldGroup(success([row('old-group')]));await oldGroup;assert.deepEqual(titles(),['Homework new-group'])
// Preserve the previous graceful degradation of optional group labels/bank tasks.
groupError=true;read=()=>success([row('inline')]);await load();assert.deepEqual(titles(),['Homework inline'],'Optional group subject failure cannot remove accessible inline homework')
bankError=true;read=()=>success([row('inline'),row('bank-only',{basic_tasks:[],task_ids:[1]})]);await load();assert.deepEqual(titles(),['Homework inline'],'A partial bank failure must not remove other inline work')
console.debug=originalDebug
console.log('PASS: standalone transient recovery, authoritative empty/denied reads, progress freshness, ownership/auth/group isolation, late responses and optional metadata degradation')
