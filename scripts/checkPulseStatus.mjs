import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
import { initialStatus, updateStatus, publishStatus } from './pulse/status.mjs'
const at='2026-11-03T03:00:00Z'
const source=initialStatus(at)
source.user_id='PRIVATE';source.states.monitor.email='PRIVATE';source.history=[{area:'invalid',code:'invalid',at}]
let state=updateStatus(source,'monitor','blocked',at)
assert.equal(JSON.stringify(state).includes('PRIVATE'),false)
assert.equal(state.last_checked_at,null)
state=updateStatus(state,'monitor','observing',at)
assert.equal(state.last_checked_at,at)
const count=state.history.length
state=updateStatus(state,'monitor','observing','2026-11-03T03:05:00Z')
assert.equal(state.history.length,count,'same status refresh is not a duplicate transition')
assert.equal(state.last_checked_at,'2026-11-03T03:05:00Z')
state=updateStatus(state,'monitor','error','2026-11-03T03:10:00Z')
assert.equal(state.last_checked_at,'2026-11-03T03:05:00Z','failed read must not refresh successful check time')
assert.throws(()=>updateStatus(state,'monitor','healthy'))
assert.throws(()=>updateStatus(state,'__proto__','constructor'))
const out=await build({entryPoints:['/Users/dany/Cursor/_Архив/Stata/src/lib/operations.ts'],bundle:true,platform:'node',format:'esm',write:false})
writeFileSync('node_modules/.cache/pulseOperations.mjs',out.outputFiles[0].text)
const {parseOperations,operationsStale}=await import('../node_modules/.cache/pulseOperations.mjs')
assert.equal(parseOperations(state).project,'iskra')
assert.equal(operationsStale(state,Date.parse('2026-11-03T03:10:00Z')),false)
assert.equal(operationsStale(state,Date.parse('2026-11-03T03:21:00Z')),true)
assert.equal(operationsStale(initialStatus(at)),true)
assert.throws(()=>parseOperations({schema_version:2}))
const dir=await mkdtemp(join(tmpdir(),'iskra-pulse-'))
try {
 const file=join(dir,'iskra.json')
 await publishStatus('monitor','blocked',file)
 await publishStatus('hotfix','awaiting_approval',file)
 const saved=parseOperations(JSON.parse(await readFile(file,'utf8')))
 assert.equal(saved.states.monitor.code,'blocked')
 assert.equal(saved.states.hotfix.code,'awaiting_approval')
 assert.equal(saved.history.length,2)
} finally {await rm(dir,{recursive:true,force:true})}
console.log('Pulse: producer → file → consumer contract, independent statuses, privacy, timestamps/staleness, deduplication and invalid payloads passed')
