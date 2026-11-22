import assert from 'node:assert/strict'
import {courseSaveProbeMetrics} from '../../src/lib/courseSaveProbeMetrics'
const body={description:'Я · private text',p_lessons:[{content:{secret:'not telemetry'}}]}
const metrics=courseSaveProbeMetrics(body,{function_ms:123,claims:{sub:'private'},steps:[
  {stage:'lesson_snapshot_and_cas',ms:42}, {stage:'private text',ms:1},
  {stage:'owner_lock_and_probe_gate',ms:Infinity},
]},250)
assert.equal(metrics.request_body_utf8_bytes,Buffer.byteLength(JSON.stringify(body)))
assert.equal(metrics.inside_function_ms,123)
assert.equal(metrics.inside_lesson_snapshot_and_cas_ms,42)
assert.equal(Object.values(metrics).every(v=>typeof v==='number'&&Number.isFinite(v)),true)
assert.equal(JSON.stringify(metrics).includes('private'),false)
assert.equal('inside_owner_lock_and_probe_gate_ms' in metrics,false)
console.log('PASS QA metrics: exact UTF8 body bytes, finite numeric stage whitelist, no content/claims')
