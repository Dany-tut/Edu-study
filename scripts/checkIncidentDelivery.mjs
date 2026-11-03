import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {writeFileSync} from 'node:fs'
const storage = new Map();const session = new Map();const makeStore = m => ({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)})
globalThis.localStorage=makeStore(storage);globalThis.sessionStorage=makeStore(session)
globalThis.window=new EventTarget();window.innerWidth=390;window.innerHeight=844;window.devicePixelRatio=2
const doc=new EventTarget();doc.referrer='https://school.example/confirm?code=REF_SECRET';doc.visibilityState='visible';doc.querySelectorAll=()=>[]
globalThis.document=doc;globalThis.screen={width:390,height:844};globalThis.location={hash:'#/teacher',origin:'https://iskra.example',pathname:'/'}
globalThis.history={pushState(){},replaceState(){}}
globalThis.setInterval=()=>0
let fail=true,user=null,authCallback
const batches=[]
globalThis.__delivery={supabase:{from:()=>({insert:async rows=>{batches.push(rows);return {error:fail?{message:'offline'}:null}}}),auth:{onAuthStateChange:cb=>{authCallback=cb}}},SUPABASE_URL:'https://db.invalid',SUPABASE_KEY:'public',getStudentSession:()=>null,getSessionUser:async()=>user}
const mocks={'./supabase':['supabase','SUPABASE_URL','SUPABASE_KEY'],'./studentSession':['getStudentSession'],'./owner':['getSessionUser']}
const out=await build({entryPoints:['src/lib/analytics.ts'],bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.DEV':'false',__APP_VERSION__:'"qa"'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path].map(n=>`export const ${n}=globalThis.__delivery.${n};`).join('\n')}))}}]})
writeFileSync('node_modules/.cache/incidentDelivery.mjs',out.outputFiles[0].text)
const first=await import('../node_modules/.cache/incidentDelivery.mjs?first')
first.trackPath('#/join-teacher?token=INVITE_SECRET')
first.trackEvent('react_crash',{msg:'broken',stack:'https://provider.test/callback?access_token=PRIVATE Person@example.com'})
await first.trackNow('marker')
const key=[...storage.keys()].find(k=>k.startsWith('iskra:incident-outbox:'))
const pending=JSON.parse(storage.get(key));assert.equal(pending.length,1)
assert.equal(JSON.stringify(pending).includes('PRIVATE'),false);assert.equal(JSON.stringify(pending).includes('Person@example.com'),false)
assert.equal(pending[0].meta.breadcrumbs[0].path, '#/join-teacher')
assert.ok(!JSON.stringify(batches).includes('INVITE_SECRET'))
// Simulate an incident saved by an earlier version while offline.
pending[0].path = '#/join?token=OLD_SECRET'
pending[0].meta.breadcrumbs[0].path = '#/join-teacher?token=OLD_SECRET'
storage.set(key, JSON.stringify(pending))
const incidentId=pending[0].meta.incident_id
fail=false
const second=await import('../node_modules/.cache/incidentDelivery.mjs?restart')
second.initAnalytics()
await second.trackNow('marker')
assert.ok(batches.flat().some(e=>e.meta.incident_id===incidentId),'retry preserves incident identity')
const sessionStart = batches.flat().find(e => e.event === 'session_start')
assert.equal(sessionStart.meta.ref, 'https://school.example')
assert.ok(!JSON.stringify(batches).includes('REF_SECRET'))
assert.ok(!JSON.stringify(batches).includes('OLD_SECRET'))
assert.deepEqual(JSON.parse(storage.get(key)),[],'acknowledged incidents leave outbox')
user={id:'user-one',app_metadata:{role:'teacher'}};await authCallback();await Promise.resolve();
second.trackEvent('action')
user={id:'user-two',app_metadata:{role:'teacher'}};await authCallback();await Promise.resolve();
await second.trackNow('marker')
assert.equal(batches.flat().filter(e=>e.event==='action').at(-1).user_id,'user-one','buffered event keeps actor at occurrence, not flush')
console.log('Incident delivery: offline persistence, redaction, reload replay, acknowledgment and actor snapshot passed')
