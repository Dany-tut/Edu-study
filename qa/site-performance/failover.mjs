import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
const output='node_modules/.cache/site-performance-failover.mjs'
await build({entryPoints:['src/lib/supabaseFailover.ts'],bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',define:{'import.meta.env':'{}'}})
let cached=null
globalThis.sessionStorage={getItem:()=>cached,setItem:(_,v)=>{cached=v},removeItem:()=>{cached=null}}
const direct='https://direct.example',proxy='https://proxy.example'
let sequence=0
async function client(base){const mod=await import(pathToFileURL(process.cwd()+'/'+output).href+'?case='+sequence++);return mod.ruFailoverFetch(base,direct,proxy)}
let calls=[]
let run=await client(async(input,init)=>{calls.push({input,init});return new Response(null,{status:204})})
await run(direct+'/rest/v1/rpc/save',{method:'POST',body:'{}'})
assert.deepEqual(calls.map(c=>[c.input,c.init.method]),[[direct+'/rest/v1/','HEAD'],[direct+'/rest/v1/rpc/save','POST']])
assert.equal(calls[1].init.signal,undefined,'no 2.5second abort signal is attached to the actual write')
let postCount=0;cached='direct'
run=await client(async(input,init)=>{postCount++;throw new TypeError('uncertain write response')})
await assert.rejects(run(direct+'/rest/v1/rpc/save',{method:'POST',body:'{}'}))
assert.equal(postCount,1,'uncertain mutation is never replayed through proxy');assert.equal(cached,null)
calls=[];cached=null
run=await client(async(input,init)=>{calls.push([input,init.method]);if(input.startsWith(direct))throw new TypeError('unreachable');return new Response(null,{status:204})})
await run(direct+'/rest/v1/rpc/save',{method:'PATCH',body:'{}'})
assert.deepEqual(calls,[[direct+'/rest/v1/','HEAD'],[proxy+'/rest/v1/','HEAD'],[proxy+'/rest/v1/rpc/save','PATCH']])
cached='proxy';calls=[];const controller=new AbortController()
run=await client(async(input,init)=>{calls.push([input,init]);return new Response(null,{status:204})})
await run(direct+'/rest/v1/lessons',{method:'DELETE',signal:controller.signal})
assert.equal(calls.length,1);assert.equal(calls[0][0],proxy+'/rest/v1/lessons');assert.equal(calls[0][1].signal,controller.signal)
console.log('PASS failover: safe first-route probe; no short mutation timeout; no mutation replay; proxy selection; caller cancellation preserved')
