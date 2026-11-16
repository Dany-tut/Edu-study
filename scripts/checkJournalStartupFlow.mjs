import assert from 'node:assert/strict'
import { build } from 'esbuild'

const rpcCalls = []
let active = 0
let peak = 0
let sqlSequence = 0
globalThis.__journalFlowState = {
  rpcCalls,
  start(shape) {
    const call = { shape, started: ++sqlSequence, settled: 0 }
    rpcCalls.push(call); active++; peak = Math.max(peak, active)
    return call
  },
  settle(call) { call.settled = ++sqlSequence; active-- },
}
const mockPlugin = {
  name: 'journal-startup-flow-mocks',
  setup(build) {
    build.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'supabase-mock', namespace: 'journal-flow' }))
    build.onResolve({ filter: /\/journalSnapshot$/ }, () => ({ path: 'snapshot-mock', namespace: 'journal-flow' }))
    build.onLoad({ filter: /.*/, namespace: 'journal-flow' }, ({ path }) => ({
      loader: 'js',
      contents: path === 'snapshot-mock'
        ? 'export function journalSnapshotResult(result) { if (result.error) throw result.error; return result.data }'
        : `
          const authListeners = new Set()
          export const supabase = {
            auth: { onAuthStateChange(callback) { authListeners.add(callback); return { data: { subscription: { unsubscribe() { authListeners.delete(callback) } } } } } },
            rpc(name, args) {
              const state = globalThis.__journalFlowState
              const call = state.start(args.p_complete ? 'complete' : 'compact')
              call.name = name
              let resolve, reject
              const pending = new Promise((yes, no) => { resolve = yes; reject = no })
              setTimeout(() => { state.settle(call); resolve({ data: { shape: call.shape }, error: null }) }, 8)
              const request = { then: pending.then.bind(pending), catch: pending.catch.bind(pending), finally: pending.finally.bind(pending), abortSignal() { return this }, retry() { return this } }
              return request
            },
          }
        `,
    }))
  },
}

const snapshotBundle = await build({ entryPoints: ['src/lib/journalSnapshotStartup.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [mockPlugin] })
const policyBundle = await build({ entryPoints: ['src/lib/journalRealtimePolicy.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const startup = await import('data:text/javascript;base64,' + Buffer.from(snapshotBundle.outputFiles[0].text).toString('base64'))
const policy = await import('data:text/javascript;base64,' + Buffer.from(policyBundle.outputFiles[0].text).toString('base64'))

// Actual cold-entry orchestration: app prefetch, route consumer requesting the
// full shape, then the initial Realtime sync emitted when the channel connects.
const owner = 'owner-fixture'
const appPrefetch = startup.prefetchTeacherJournalSnapshot(owner, false)
await new Promise(resolve => setTimeout(resolve, 1))
const routeRead = startup.readStartupJournalSnapshot(owner, true, new AbortController().signal)
assert.deepEqual(await appPrefetch, { shape: 'compact' })
assert.deepEqual(await routeRead, { shape: 'complete' })
assert.deepEqual(rpcCalls.map(call => call.shape), ['compact', 'complete'])
assert.equal(peak, 1, 'the route upgrade must wait for the compact RPC to settle')
assert.ok(rpcCalls[1].started > rpcCalls[0].settled, 'the complete request must start after compact settles')

let reloads = 0
if (policy.shouldReloadJournalForChange({ eventType: 'SYNC', syncKind: 'initial' })) reloads++
assert.equal(reloads, 0, 'initial Realtime SYNC is already covered by the cold load')
if (policy.shouldReloadJournalForChange({ eventType: 'SYNC', syncKind: 'reconnect' })) reloads++
if (policy.shouldReloadJournalForChange({ eventType: 'UPDATE' })) reloads++
assert.equal(reloads, 2, 'reconnect and real row changes must still refresh journal data')
assert.equal(active, 0)
console.log('PASS: app prefetch + full route load + initial Realtime sync issue no overlapping or redundant RPC; reconnect and real updates still refresh')
