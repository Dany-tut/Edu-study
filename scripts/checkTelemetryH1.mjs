import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
mkdirSync('node_modules/.cache',{recursive:true})
const out=await build({entryPoints:['src/lib/diagnosticFetch.ts','src/lib/telemetrySource.ts'],bundle:true,platform:'node',format:'esm',outdir:'node_modules/.cache/h1',write:false,plugins:process.env.ISKRA_H1_MUTATE_ENDPOINT==='1'?[{name:'restore-old-endpoint-defect',setup(b){b.onLoad({filter:/diagnosticFetch\.ts$/},a=>({contents:readFileSync(a.path,'utf8').replace('endpoint = diagnosticEndpoint(url.pathname)',"endpoint = url.pathname.split('/').slice(0, 4).join('/')"),loader:'ts'}))}}]:[]})
mkdirSync('node_modules/.cache/h1',{recursive:true})
for(const f of out.outputFiles)writeFileSync(f.path,f.text)
const {diagnosticFetch,setRequestReporter,diagnosticEndpoint}=await import('../node_modules/.cache/h1/diagnosticFetch.js')
const {telemetrySource}=await import('../node_modules/.cache/h1/telemetrySource.js')
const storage=new Map()
globalThis.sessionStorage={getItem:k=>storage.get(k)??null}
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'browser',webdriver:false,onLine:true},configurable:true})
globalThis.location={hostname:'edu-study-app.vercel.app',hash:'#/teacher/profile?token=PRIVATE'}
globalThis.document={visibilityState:'visible'}
globalThis.window=new EventTarget()
assert.equal(telemetrySource().event_source,'browser_unclassified')
navigator.webdriver=true;assert.equal(telemetrySource().event_source,'automation_suspected')
navigator.webdriver=false;navigator.userAgent='HeadlessChrome';assert.equal(telemetrySource().event_source,'automation_suspected')
storage.set('iskra:telemetry-source','qa');assert.equal(telemetrySource().event_source,'qa')
assert.equal(telemetrySource().app_host_kind,'canonical_production')
storage.clear();navigator.userAgent='browser'
for(const [path,expected] of [
 ['/auth/v1/user/oauth/grants','/auth/v1/user/oauth/grants'],
 ['/auth/v1/user/identities/authorize','/auth/v1/user/identities/authorize'],
 ['/auth/v1/user/oauth/grants/PRIVATE','/auth/v1/user/oauth/grants/:id'],
 ['/auth/v1/user/identities/PRIVATE','/auth/v1/user/identities/:id'],
 ['/auth/v1/admin/users/PRIVATE','/auth/v1/:other'],
 ['/storage/v1/object/private/PRIVATE','/storage/v1'],
 ['/rest/v1/rpc/student_track','/rest/v1/rpc/student_track'],
])assert.equal(diagnosticEndpoint(path),expected)
const events=[];setRequestReporter(e=>events.push(e))
const url='https://db.example/auth/v1/user/oauth/grants?token=PRIVATE'
const http=new Response('',{status:404})
assert.equal(await diagnosticFetch(async()=>http,'https://db.example')(url),http)
assert.equal(events.at(-1).endpoint,'/auth/v1/user/oauth/grants')
assert.equal(events.at(-1).outcome,'http_error')
assert.equal(JSON.stringify(events).includes('PRIVATE'),false)
async function reject(error,init){const request=diagnosticFetch(async()=>{throw error},'https://db.example');await assert.rejects(request(url,init),e=>e===error);return events.at(-1)}
for(const error of [new DOMException('secret','AbortError'),Object.assign(new Error('secret'),{name:'AbortError'})])assert.equal((await reject(error)).event,'api_cancelled')
const abort=new AbortController();abort.abort('PRIVATE')
assert.equal((await reject('PRIVATE',{signal:abort.signal})).outcome,'cancelled')
const timeout=new AbortController();timeout.abort(new DOMException('PRIVATE','TimeoutError'))
assert.equal((await reject(new DOMException('PRIVATE','AbortError'),{signal:timeout.signal})).outcome,'timeout')
assert.equal(events.at(-1).event,'api_request')
assert.equal((await reject(new TypeError('PRIVATE'))).error_kind,'network')
assert.equal((await reject(new Error('PRIVATE'))).error_kind,'unknown')
// Passing a Request preserves its signal and init overrides are respected.
const request=new Request(url,{signal:abort.signal})
await assert.rejects(diagnosticFetch(async()=>{throw new Error('aborted')},'https://db.example')(request))
assert.equal(events.at(-1).event,'api_cancelled')
let finish
const wrapper=diagnosticFetch(()=>new Promise(r=>{finish=r}),'https://db.example')
const pending=wrapper(url);window.dispatchEvent(new Event('pagehide'))
location.hash='#/homework/123e4567-e89b-12d3-a456-426614174000?token=PRIVATE'
document.visibilityState='hidden'
finish(new Response('',{status:200}));await pending
assert.equal(events.at(-1).page_changed,true)
assert.equal(events.at(-1).page_leaving,true)
assert.equal(events.at(-1).start_route,'#/teacher/profile')
assert.equal(events.at(-1).end_route,'#/homework/:id')
assert.equal(events.at(-1).end_visibility,'hidden')
let fail
const late=diagnosticFetch(()=>new Promise((_,r)=>{fail=r}),'https://db.example')
const rejected=late(url);window.dispatchEvent(new Event('pagehide'));fail(new TypeError('PRIVATE'))
await assert.rejects(rejected)
assert.equal(events.at(-1).outcome,'transport_error','pagehide alone cannot suppress a real failure')
assert.equal(events.at(-1).event,'api_request')
assert.equal(JSON.stringify(events).includes('PRIVATE'),false)
console.log('H1: source labels, exact/redacted paths, all abort forms, timeout distinction, unchanged results, page lifecycle and privacy passed')
window.dispatchEvent(new Event('pageshow'))
document.visibilityState='visible'
// Real localhost transport verifies native fetch cancellation/timeout contracts.
const {createServer}=await import('node:http')
const requests=[]
const server=createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk
 requests.push({method:req.method,body})
 if(req.url==='/rest/v1/echo'){res.end('saved');return}
 req.on('error',()=>{});setTimeout(()=>{if(!res.destroyed)res.end('late')},50)
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
try{
 const origin=`http://127.0.0.1:${server.address().port}`
 const native=diagnosticFetch(fetch,origin)
 const response=await native(origin+'/rest/v1/echo',{method:'POST',body:'PRIVATE'})
 assert.equal(await response.text(),'saved')
 assert.deepEqual(requests[0],{method:'POST',body:'PRIVATE'})
 const controller=new AbortController()
 const cancelled=native(origin+'/rest/v1/wait',{signal:controller.signal})
 controller.abort()
 await assert.rejects(cancelled)
 assert.equal(events.at(-1).event,'api_cancelled')
 await assert.rejects(native(origin+'/rest/v1/wait',{signal:AbortSignal.timeout(10)}))
 assert.equal(events.at(-1).outcome,'timeout')
 assert.equal(events.at(-1).event,'api_request')
 assert.equal(JSON.stringify(events).includes('PRIVATE'),false)
 console.log('H1 localhost integration: native fetch POST body/result, cancellation and deadline classification passed')
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
