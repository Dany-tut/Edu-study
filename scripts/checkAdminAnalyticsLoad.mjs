import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'
const built = await build({ entryPoints: ['src/lib/adminAnalyticsLoad.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' })
mkdirSync('node_modules/.cache', { recursive: true })
writeFileSync('node_modules/.cache/checkAdminAnalyticsLoad.mjs', built.outputFiles[0].text)
const { loadAnalyticsSections } = await import('../node_modules/.cache/checkAdminAnalyticsLoad.mjs')
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return {promise,resolve,reject} }
const a=deferred(), b=deferred(), c=deferred(), seen=[], applied=[], settled=[]
const tasks=[a,b,c].map((d,i)=>({id:String(i),run:()=>{seen.push(i);return d.promise},apply:data=>applied.push(data)}))
const running=loadAnalyticsSections(tasks,()=>true,(id,error)=>settled.push({id,error}))
assert.deepEqual(seen,[0,1]); a.resolve({data:'overview',error:null}); await new Promise(setImmediate)
assert.deepEqual(applied,['overview']); assert.deepEqual(seen,[0,1,2]); assert.equal(settled.length,1)
b.reject(new Error('chart failed')); c.resolve({data:'daily',error:null}); await running
assert.deepEqual(applied,['overview','daily']); assert.equal(settled.find(x=>x.id==='1').error,'chart failed')
const old=deferred();let current=true;const late=[];const oldRun=loadAnalyticsSections([{id:'old',run:()=>old.promise,apply:d=>late.push(d)},{id:'queued',run:()=>{throw Error('stale queue started')},apply:()=>{}}],()=>current,()=>late.push('settled'),1)
current=false;old.resolve({data:'old period',error:null});await oldRun;assert.deepEqual(late,[])
await loadAnalyticsSections([],()=>true,()=>assert.fail('Empty tab performed work'))
const originalSetTimeout=global.setTimeout,originalClearTimeout=global.clearTimeout
try{let expire;global.setTimeout=fn=>{expire=fn;return 1};global.clearTimeout=()=>{};const failures=[]
 const stalled=loadAnalyticsSections([{id:'stalled',run:()=>new Promise(()=>{}),apply:()=>assert.fail('Stalled result applied')}],()=>true,(id,error)=>failures.push({id,error}));expire();await stalled;assert.match(failures[0].error,/timed out/)
}finally{global.setTimeout=originalSetTimeout;global.clearTimeout=originalClearTimeout}
console.log('PASS: bounded workers; progressive summary; rejected chart isolation; stale period drops data and queued work; idle tab; bounded hung request')
