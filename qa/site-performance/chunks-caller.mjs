import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transform} from 'esbuild'
const source=readFileSync('src/store/studentDataStore.ts','utf8')
const start=source.indexOf('async function ensureLessonsHeavy(')
const end=source.indexOf('\n/**',start)
const {code}=await transform(source.slice(start,end),{loader:'ts'})
function harness(){
 const heavyCache=new Map(),heavyDone=new Set(),heavyInflight=new Set(),heavyFailed=new Set()
 let finishRead,finishChunk,reads=0,updates=0,chunkIds=[]
 const env={heavyCache,heavyDone,heavyInflight,heavyFailed,
  heavyKey:id=>id.replace(/~rec$/,''),applyHeavy:subjects=>subjects,
  fetchLessonsHeavy:ids=>{reads++;return new Promise(resolve=>{finishRead=()=>resolve(new Map(ids.map(id=>[id,{content:'actual'}])))})},
  loadApLessons:ids=>{chunkIds.push(ids);return ids.some(id=>id.startsWith('apchem-'))?new Promise(r=>finishChunk=r):Promise.resolve()},
  useStudentData:{setState:fn=>{updates++;fn({subjects:[]})}},console:{error:()=>{}},
 }
 const ensure=Function(...Object.keys(env),`${code};return ensureLessonsHeavy`)(...Object.values(env))
 return {ensure,heavyDone,heavyInflight,chunkIds,read:()=>finishRead(),chunk:()=>finishChunk(),get reads(){return reads},get updates(){return updates}}
}
const settle=()=>new Promise(r=>setImmediate(r))
let h=harness(),work=h.ensure(['ordinary-lesson~rec','ordinary-lesson'])
assert.deepEqual(h.chunkIds,[['ordinary-lesson']],'caller passes normalized exact requested references')
h.read();await work;assert.equal(h.updates,1);assert(h.heavyDone.has('ordinary-lesson'))
h=harness();work=h.ensure(['apchem-ru-0'])
await h.ensure(['apchem-ru-0']);assert.equal(h.reads,1,'inflight heavy read is not duplicated')
h.read();await settle();assert.equal(h.updates,0);assert(!h.heavyDone.has('apchem-ru-0'),'fallback chunk barrier remains before heavyPending clears')
h.chunk();await work;assert.equal(h.updates,1);assert(h.heavyDone.has('apchem-ru-0'));assert.equal(h.heavyInflight.size,0)
console.log('PASS actual ensureLessonsHeavy: exact normalized IDs supplied, ordinary lesson no unrelated wait, AP fallback waits before completion, inflight dedup retained')
