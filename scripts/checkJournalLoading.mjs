import assert from 'node:assert/strict'
<<<<<<< HEAD
import { journalPages, journalParallelPages } from '../src/lib/journalPages.ts'
import { journalSnapshotResult } from '../src/lib/journalSnapshot.ts'

const snapshot = Object.fromEntries(['courses','lessons','modules','work','events','assignments','legacy','attempts','marks','warnings'].map(k=>[k,[]]))
snapshot.lessons = Array.from({length:1609},(_,id)=>({id}))
assert.equal(journalSnapshotResult({data:snapshot,error:null}).lessons.length,1609)
for(const code of ['PGRST202','42883']) assert.equal(journalSnapshotResult({data:null,error:{code,message:'RPC missing'}}),null)
for(const code of ['42501','57014','500']) assert.throws(()=>journalSnapshotResult({data:null,error:{code,message:'required snapshot failed'}}),/required snapshot failed/)
assert.throws(()=>journalSnapshotResult({data:{...snapshot,work:null},error:null}),/неполон/)
assert.throws(()=>journalSnapshotResult({data:null,error:null}),/неполон/)
=======
import { journalPages } from '../src/lib/journalPages.ts'
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)

const signal = new AbortController().signal
const source = Array.from({length: 113}, (_, id) => ({id}))
const calls = []
const rows = await journalPages(async (offset, size) => {
  calls.push([offset, size])
  if (size > 25) return {data: null, error: {code: '57014', message: 'statement timeout'}}
  return {data: source.slice(offset, offset + size), error: null}
}, signal, 50)
assert.deepEqual(rows, source, 'Retrying smaller pages must neither skip nor duplicate work')
assert.deepEqual(calls.slice(0, 3), [[0, 50], [0, 25], [25, 25]])
let count = 0
await assert.rejects(journalPages(async () => {
  count++
  return {data: null, error: {code: '57014', message: 'statement timeout'}}
}, signal, 50), /statement timeout/)
assert.equal(count, 4, 'Repeated timeouts must stop at the minimum page size')
await assert.rejects(journalPages(async offset => offset === 0
  ? {data: source.slice(0, 50), error: null}
  : {data: null, error: {message: 'permission denied'}}, signal, 50), /permission denied/,
  'A failed later page must not publish a partial queue')
const controller = new AbortController()
let resolve
const pending = journalPages(() => new Promise(r => {resolve = r}), controller.signal)
controller.abort()
resolve({data: [], error: null})
await assert.rejects(pending, {name: 'AbortError'}, 'An obsolete response must not be accepted')
console.log('Journal loading: complete pagination, timeout recovery, bounded failure and cancellation passed.')
<<<<<<< HEAD

// Out-of-order responses must still produce every row in order, with at most
// four requests in flight (large teachers must not create an unbounded fanout).
const many = Array.from({length: 637}, (_, id) => ({id}))
let active = 0, peak = 0
const parallel = await journalParallelPages(async (offset, size) => {
  active++; peak = Math.max(peak, active)
  await new Promise(resolve => setTimeout(resolve, offset % 100 === 0 ? 8 : 1))
  active--
  return {data: many.slice(offset, offset + size), error: null}
}, signal)
assert.deepEqual(parallel, many)
assert.equal(peak, 4)
const retried = await journalParallelPages(async (offset, size) => size > 12
  ? {data: null, error: {code: '57014', message: 'statement timeout'}}
  : {data: source.slice(offset, offset + size), error: null}, signal)
assert.deepEqual(retried, source, 'Split retries must retain exact range boundaries')
await assert.rejects(journalParallelPages(async offset => offset === 50
  ? {data: null, error: {message: 'required page denied'}}
  : {data: many.slice(offset, offset + 50), error: null}, signal), /required page denied/)
assert.deepEqual(await journalParallelPages(async offset => offset >= 150
  ? {data: null, error: {message: 'irrelevant speculative page'}}
  : {data: source.slice(offset, offset + 50), error: null}, signal), source)
const cancelled = new AbortController()
await assert.rejects(journalParallelPages(async () => {
  cancelled.abort()
  return {data: [], error: null}
}, cancelled.signal), {name: 'AbortError'})
console.log('Parallel journal: complete ordered rows, bounded concurrency, split timeout retries, required failures, tail and cancellation passed.')

const productionRows = Array.from({length: 2107}, (_, id) => ({id}))
let inFlight = 0, maxInFlight = 0
const bounded = await journalParallelPages(async (offset, size) => {
  assert.equal(size, 1000)
  inFlight++;maxInFlight=Math.max(maxInFlight,inFlight)
  await new Promise(r=>setTimeout(r,1))
  inFlight--
  return {data:productionRows.slice(offset,offset+size),error:null}
},signal,1000,2)
assert.deepEqual(bounded,productionRows)
assert.equal(maxInFlight,2)
console.log('PASS: fallback retains all 2107 rows across windows with two bounded responses')
=======
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
