import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
const output = await build({ entryPoints: ['src/lib/incidentTelemetry.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
writeFileSync('node_modules/.cache/incidentTelemetry.mjs', output.outputFiles[0].text)
const m = await import('../node_modules/.cache/incidentTelemetry.mjs')
let clock = 1000, tick
const doc = new EventTarget()
doc.visibilityState = 'visible'; doc.querySelectorAll = () => []; doc.getElementById = () => ({textContent:'Искра',querySelector:()=>null})
globalThis.document = doc; globalThis.location = {hash:'#/teacher'}
globalThis.window = new EventTarget(); globalThis.screen = {width:390,height:844}
Object.defineProperty(globalThis, 'performance', {value:{now:()=>clock},configurable:true})
globalThis.setInterval = fn => {tick=fn}
const events=[]
m.installRuntimeDiagnostics((event,meta) => events.push({event,...meta}))
clock+=5000;tick();assert.equal(events[0].event,'ui_freeze')
assert.equal(events[0].duration_ms,4000)
doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));clock+=20000;tick()
doc.visibilityState='visible';clock+=1000;tick()
assert.equal(events.length,1,'background resume must not be reported as a freeze')
doc.querySelectorAll=()=>[{getBoundingClientRect:()=>({width:100,height:20})}]
for(let i=0;i<17;i++){clock+=1000;tick()}
assert.ok(events.some(e=>e.event==='ui_loading_stalled'))
const count=events.length
for(let i=0;i<10;i++){clock+=1000;tick()}
assert.equal(events.length,count,'loading alerts are throttled')
for(let i=0;i<40;i++)m.rememberDiagnosticEvent('page_view','#/teacher',{password:'SECRET',text:'PRIVATE'})
const context=m.incidentContext()
assert.equal(context.breadcrumbs.length,30)
assert.equal(JSON.stringify(context).includes('SECRET'),false)
assert.equal(JSON.stringify(context).includes('PRIVATE'),false)
assert.ok(context.incident_id)
console.log('Incident telemetry: visible freeze, background suspension, stuck loading, throttling, breadcrumb bounds/privacy passed')
