import assert from 'node:assert/strict'
import { journalLessonDetailIds } from '../src/lib/journalLessonScope.ts'
import { journalPages, journalParallelPages } from '../src/lib/journalPages.ts'

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

// Do not download unrelated authoring material, but preserve a withdrawn
// enrollment's submissions, extra homework, recordings and attempt history.
const lesson = (id, course_id = 'unassigned') => ({id, short_id: `short-${id}`, course_id})
const detailIds = journalLessonDetailIds({
  courses: [
    {id:'direct', student_ids:['student'], group_ids:[]},
    {id:'group', student_ids:[], group_ids:['group']},
    {id:'unassigned', student_ids:['another-student'], group_ids:['another-group']},
  ],
  lessons: [lesson('direct','direct'),lesson('group','group'),lesson('extra'),lesson('recording'),lesson('attempt'),lesson('scheduled'),lesson('assigned'),lesson('unused')],
  studentIds:['student'],groupIds:['group'],
  work:[{lesson_ref:'short-extra~practice-hard'},{lesson_ref:'video-short-recording~rec'}],
  attempts:[{lesson_ref:'short-attempt~rec~practice'}],
  events:[{lesson_id:'scheduled'}],assignments:[{lesson_id:'assigned'}],
})
assert.deepEqual(detailIds, ['direct','group','extra','recording','attempt','scheduled','assigned'])
assert.deepEqual(journalLessonDetailIds({courses:[],lessons:[lesson('unused')],studentIds:[],groupIds:[],work:[],attempts:[],events:[],assignments:[]}), [])
console.log('Journal payload scope: direct/group access, withdrawn enrollment history, extra work, recordings, attempts and explicit assignments preserved; unrelated task content excluded.')
