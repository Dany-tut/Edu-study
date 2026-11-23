import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

// Exercise the real reporter and delivery functions. Only DB/network and the
// current browser environment are fixtures; no fixture gets an actual credential.
const stubs = {
  './analytics': 'export const getSessionId=()=>"fixture-session"',
  './appVersion': 'export const APP_VERSION="1.0.fixture"',
  './incidentTelemetry': 'export const clientDiagnostics=()=>({client_timezone:globalThis.fixtureTZ,client_platform:"Mac"})',
  './supabase': 'export const supabase={rpc:(...args)=>globalThis.fixtureRPC(...args)}',
}
const { outputFiles } = await build({
  stdin: { contents: "export * from './src/lib/courseSaveReport'; export * from './src/lib/submitCourseSaveReport';", resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false,
  plugins:[{name:'isolated-network',setup(b){
    b.onResolve({filter:/^\.\/(analytics|appVersion|incidentTelemetry|supabase)$/},args=>({path:args.path,namespace:'fixture'}))
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path]}))
  }}],
})
const { createCourseSaveReport, submitCourseSaveReport } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'))
const entries = new Map()
globalThis.sessionStorage = { getItem:k=>entries.get(k)??null, setItem:(k,v)=>entries.set(k,v), removeItem:k=>entries.delete(k) }
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{ userAgent:'Mozilla/5.0 Chrome/144.0.0 Safari/537.36 Edg/144.1',onLine:true }})
globalThis.location = {hostname:'localhost'}
globalThis.window = { innerWidth:412,innerHeight:800 }
globalThis.screen = { width:412,height:900 }
globalThis.fixtureTZ = 'UTC'
const storageKey='test.report'
let report=createCourseSaveReport(storageKey), calls=[], finish
const ctx={courseId:'qa01', recoveredDraft:true, conflict:false, stage:'lessons', code:'unexpected with lesson text',
  draft:'SECRET TEXT',url:'secret.example/?apikey=SECRET', materials:[{name:'personal document'}]}
globalThis.fixtureRPC=async(name,args)=>{calls.push({name,args});return new Promise(r=>{finish=r})}
await report.retry(()=>undefined)
await report.retry(async()=>{ throw Error('failed manual transport') })
await report.send(ctx,submitCourseSaveReport)
assert.equal(calls.length,0,'one manual failure is below the threshold')
let rejectWrite
const manual = report.retry(()=>new Promise(r=>{rejectWrite=r}))
await report.retry(async()=>{throw Error('a double click must not start another write')})
rejectWrite(false);await manual
assert.equal(report.getSnapshot().attempts,2)
const first=report.send(ctx,submitCourseSaveReport)
assert.equal(report.getSnapshot().status,'sending')
await report.send(ctx, submitCourseSaveReport)
assert.equal(calls.length,1,'duplicate clicks cannot send two reports')
const {name,args}=calls[0]
assert.equal(name,'report_course_save_failure')
assert.equal(args.p_diagnostics.code,null)
assert.equal(args.p_diagnostics.browser,'Edge')
assert.equal(args.p_diagnostics.browser_version,'144.1')
assert.equal(args.p_diagnostics.country,null,'UTC does not identify a country')
assert.equal(JSON.stringify(args).includes('SECRET'),false)
assert.equal(JSON.stringify(args).includes('personal document'),false)
finish({data:'different-id',error:null});await first
assert.equal(report.getSnapshot().status,'error','HTTP success with the wrong ticket is no ACK')
const failed=report.send(ctx,submitCourseSaveReport)
finish({data:null,error:{code:'42501'}});await failed
assert.equal(report.getSnapshot().status,'error','backend denial must not show sent')
report=createCourseSaveReport(storageKey)
globalThis.fixtureTZ='Asia/Bangkok'
const retry=report.send(ctx,submitCourseSaveReport)
assert.equal(calls.at(-1).args.p_report_id,args.p_report_id)
assert.equal(calls.at(-1).args.p_diagnostics.country,'TH')
finish({data:args.p_report_id,error:null});await retry
assert.equal(report.getSnapshot().status,'sent')
report=createCourseSaveReport(storageKey)
await report.send(ctx,submitCourseSaveReport)
assert.equal(calls.length,3,'confirmed report is suppressed even after F5')
report.reset();assert.equal(entries.has(storageKey),false)
await report.retry(async()=>false); await report.retry(async()=>false)
const late=report.send(ctx,submitCourseSaveReport)
const laterId=calls.at(-1).args.p_report_id
assert.notEqual(laterId,args.p_report_id)
report.reset();finish({data:laterId,error:null});await late
assert.deepEqual(report.getSnapshot(),{attempts:0,status:'ready'})

const editor=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
assert.match(editor,/onClick: \(\) => \{ void reporter.retry\(retrySave\)/)
assert.match(editor,/setTimeout\(retrySave, SAVE_RETRY_MS\)/)
assert.match(editor,/if \(back && unsaved.current && !conflict\) retrySave\(\)/)
console.log('PASS manual retry threshold; duplicate clicks, lost ACK, denial, retry after F5, safe diagnostics and stale success')
