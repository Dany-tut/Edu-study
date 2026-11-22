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
const delta=courseSaveProbeMetrics({}, {function_ms:1550,runtime_jit_enabled:0,runtime_plan_cache_mode:2,steps:[{stage:'delta_inventory_cas',ms:620},{stage:'delta_lesson_update',ms:1300},{stage:'delta_ack_construction',ms:2},{stage:'not_allowed_claims',ms:1}]},1900)
assert.equal(delta.inside_delta_inventory_cas_ms,620)
assert.equal(delta.inside_delta_lesson_update_ms,1300)
assert.equal(delta.inside_delta_ack_construction_ms,2)
assert.equal(delta.runtime_jit_enabled,0)
assert.equal(delta.runtime_plan_cache_mode,2)
assert.equal('inside_not_allowed_claims_ms' in delta,false)
for(const bad of [-1,3,Infinity,'1',{private:'claims'}]){
 const rejected=courseSaveProbeMetrics({}, {runtime_jit_enabled:bad,runtime_plan_cache_mode:bad},1)
 assert.equal('runtime_plan_cache_mode' in rejected,false)
 assert.equal('runtime_jit_enabled' in rejected,false)
}
console.log('PASS delta profiling: explicit stages, numeric runtime enums, unknown/invalid/content/claims dropped')
