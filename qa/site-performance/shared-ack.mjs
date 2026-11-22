import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
const output='node_modules/.cache/site-performance-shared-ack.mjs'
const events=new Map()
globalThis.window={addEventListener:(n,fn)=>events.set('w:'+n,fn),removeEventListener:()=>{}}
globalThis.document={visibilityState:'visible',addEventListener:(n,fn)=>events.set('d:'+n,fn),removeEventListener:()=>{}}
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true})
let authEvent
globalThis.__performanceAuth={auth:{onAuthStateChange(cb){authEvent=cb}}}
await build({entryPoints:['src/lib/sharedQuery.ts'],bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins:[{name:'auth',setup(b){b.onResolve({filter:/^\.\/supabase$/},()=>({path:'auth',namespace:'controlled'}));b.onLoad({filter:/.*/,namespace:'controlled'},()=>({contents:'export const supabase=globalThis.__performanceAuth'}))}}]})
const {createSharedQuery}=await import(pathToFileURL(process.cwd()+'/'+output))
const settle=()=>new Promise(r=>setImmediate(r))
let calls=0, pending=[]
const q=createSharedQuery(()=>{calls++;return new Promise(r=>pending.push(r))},[],{refreshOnFocusMs:0})
const off=q.subscribe(()=>{});q.ensure();assert.equal(calls,1)
events.get('w:focus')();events.get('d:visibilitychange')();assert.equal(calls,1,'focus and visibility join current read')
const commit=q.beginMutation();assert.equal(commit(rows=>[...rows,{id:'saved',title:'ACK'}]),true)
assert.equal(q.getSnapshot().value[0].id,'saved','ACK is published before background reload')
pending.shift()([{id:'stale'}]);await settle();assert.equal(q.getSnapshot().value[0].id,'saved','pre-write read cannot overwrite ACK')
const refresh=q.reload();assert.equal(calls,2);pending.shift()([{id:'saved',title:'server'}]);await refresh
assert.equal(q.getSnapshot().value[0].title,'server')
const beforeAccountChange=q.beginMutation();authEvent('SIGNED_IN',{user:{id:'other',app_metadata:{role:'teacher'}}})
assert.equal(q.getSnapshot().value.length,0,'account reset clears snapshot synchronously')
assert.equal(beforeAccountChange(()=>[{id:'old-user'}]),false,'old-account ACK cannot restore data')
pending.shift()([]);await settle()
const read=q.reload();const afterMutation=q.reload();assert.equal(calls,4)
pending.shift()([]);await read;await settle();assert.equal(calls,5,'explicit mutation reload still guarantees a later read')
pending.shift()([]);await afterMutation;off()
console.log('PASS shared query: focus dedup; immediate confirmed ACK; pre-ACK late read; background reconcile; account isolation; explicit reload barrier')
