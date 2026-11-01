import assert from 'node:assert/strict'
import { journalPages } from '../src/lib/journalPages.ts'

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
