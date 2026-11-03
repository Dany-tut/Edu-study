import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
mkdirSync('node_modules/.cache', { recursive: true })
const out = await build({ entryPoints: ['src/lib/diagnosticFetch.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
writeFileSync('node_modules/.cache/diagnosticFetch.mjs', out.outputFiles[0].text)
const { diagnosticFetch, setRequestReporter } = await import('../node_modules/.cache/diagnosticFetch.mjs')
const events = []
setRequestReporter(e => events.push(e))
const response = new Response('', { status: 503 })
let received
const wrapped = diagnosticFetch(async (...args) => { received = args; return response }, 'https://db.example')
const url = 'https://db.example/rest/v1/rpc/test?token=SECRET'
assert.equal(await wrapped(url, { method: 'POST', body: 'PRIVATE' }), response)
assert.equal(received[0], url)
assert.equal(events[0].status, 503)
assert.equal(events[0].endpoint, '/rest/v1/rpc/test')
assert.equal(JSON.stringify(events).includes('SECRET'), false)
assert.equal(JSON.stringify(events).includes('PRIVATE'), false)
await wrapped('https://db.example/rest/v1/analytics_events')
await wrapped('https://other.example/rest/v1/users')
assert.equal(events.length, 1, 'exclude telemetry itself and other products')
const failure = new Error('network')
await assert.rejects(diagnosticFetch(async () => { throw failure }, 'https://db.example')('https://db.example/rest/v1/test'), e => e === failure)
assert.equal(events.at(-1).status, 0)
const count = events.length
await assert.rejects(diagnosticFetch(async () => { throw new DOMException('cancel', 'AbortError') }, 'https://db.example')('https://db.example/rest/v1/test'))
assert.equal(events.length, count + 1)
assert.equal(events.at(-1).event, 'api_cancelled')
setRequestReporter(() => { throw new Error('telemetry') })
assert.equal(await wrapped(url), response, 'broken telemetry cannot break requests')
console.log('Diagnostic fetch: response/error identity, privacy, exclusions, cancellation and reporter isolation passed')
const timers = new Map(); let timerId = 0
const realSetTimeout=globalThis.setTimeout, realClearTimeout=globalThis.clearTimeout
try {
  globalThis.document={visibilityState:'visible'}
  globalThis.setTimeout=(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id}
  globalThis.clearTimeout=id=>timers.delete(id)
  const pendingEvents=[];setRequestReporter(e=>pendingEvents.push(e))
  let resolve
  const pending=diagnosticFetch(()=>new Promise(r=>{resolve=r}), 'https://db.example')('https://db.example/rest/v1/lessons')
  for(const t of [...timers.values()])t.fn()
  assert.deepEqual(pendingEvents.map(e=>e.event),['api_slow','api_stalled'])
  resolve(new Response('',{status:200}));await pending
  assert.equal(pendingEvents.at(-1).status,200)
  assert.equal(timers.size,0,'settlement clears watchdog timers')
  console.log('Request watchdogs: pending slow/stalled signals and successful settlement passed')
} finally {globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout}
