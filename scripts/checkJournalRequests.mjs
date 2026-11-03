import assert from 'node:assert/strict'
import { journalBatches, journalPages } from '../src/lib/journalRequests.ts'

const ids = Array.from({length: 735}, (_, i) => String(i))
let active = 0, peak = 0
const result = await journalBatches(ids, async batch => {
  active++; peak = Math.max(peak, active)
  await new Promise(resolve => setTimeout(resolve, batch[0] === '0' ? 15 : 1))
  active--
  assert.ok(batch.length <= 100)
  return batch
})
assert.equal(peak, 3)
assert.deepEqual(result, ids, 'Concurrent batches must retain order and every row')
assert.deepEqual(await journalBatches([], () => { throw new Error('Empty scope must not query the table') }), [])
let pages = 0
const rows = await journalPages(offset => {
  pages++
  return Promise.resolve({data: Array.from({length: offset === 1000 ? 7 : 500}, (_, i) => offset+i), error: null})
})
assert.equal(pages, 3)
assert.equal(rows.length, 1007)
assert.deepEqual(rows, Array.from({length:1007}, (_, i) => i))
await assert.rejects(() => journalPages(() => Promise.resolve({data:null,error:{message:'Read denied'}})), /Read denied/)
await assert.rejects(() => journalBatches(['1'], async () => { throw new Error('Read failed') }), /Read failed/)
const controller = new AbortController()
let calls = 0
await assert.rejects(() => journalPages(() => {
  calls++
  controller.abort()
  return Promise.resolve({data:new Array(500).fill(1),error:null})
}, controller.signal), error => error.name === 'AbortError')
assert.equal(calls, 1, 'Cancelled loads must not keep paginating')
console.log('Journal requests: bounded parallel reads, ordering, empty scopes, full pagination, error propagation and cancellation passed.')

// One bounded query per exact ID batch, with no speculative tail pages.
const { journalRowsById } = await import('../src/lib/journalRequests.ts')
const exactIds = Array.from({length: 147}, (_, i) => String(i))
let exactCalls = 0
const exactRows = await journalRowsById(exactIds, new AbortController().signal, async batch => {
  exactCalls++
  assert.ok(batch.length <= 50)
  return {data: [...batch].reverse().map(id => ({id})), error: null}
})
assert.equal(exactCalls, 3, '147 known lesson IDs need exactly three requests, not speculative pages')
assert.deepEqual(exactRows.map(row => row.id), exactIds)
const recovered = await journalRowsById(exactIds, new AbortController().signal, async batch => batch.length > 20
  ? {data:null,error:{code:'57014',message:'timeout'}}
  : {data:batch.map(id=>({id})),error:null})
assert.deepEqual(recovered, exactRows, 'Split ID batches retain every row in order')
await assert.rejects(journalRowsById(['missing'],new AbortController().signal,async()=>({data:[],error:null})),/полностью/)
assert.deepEqual(await journalRowsById([],new AbortController().signal,()=>{throw Error('Must not query empty IDs')}),[])
console.log('Exact journal IDs: bounded request count, complete ordered rows, timeout splitting and missing-row rejection passed.')
