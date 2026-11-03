import assert from 'node:assert/strict';
import {build} from 'esbuild';
const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const out=await build({entryPoints:['src/lib/diagnosticJourney.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const journey=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
const events=[];const id=journey.diagnosticFailure('lazy_module','load_failed');journey.setJourneyReporter((event,meta)=>events.push({event,meta}));
journey.diagnosticRetry(id,'reload');journey.observeReloadedJourneys();assert(events.some(x=>x.meta.stage==='boot_observed'));assert(!events.some(x=>x.meta.evidence==='module_loaded'));
journey.diagnosticRecovered(id,'module_loaded');assert.equal(events.filter(x=>x.event==='operation_failed').length,1);assert(events.some(x=>x.meta.evidence==='module_loaded'&&x.meta.failure_id===id));assert.equal(JSON.parse(storage.get('iskra:diagnostic-journeys')).length,0);
// An actual reload is followed by boot first, and by form evidence only after the
// matching account's committed form reports readiness. Re-renders must not duplicate it.
globalThis.location = { hash: '#/teacher/profile' }
globalThis.window = new EventTarget()
Object.defineProperty(performance, 'getEntriesByType', {value: () => [{type: 'reload'}]})
journey.setJourneyReporter((event, meta) => events.push({event, meta}), () => 'fixture-owner')
const profileFailure = journey.diagnosticFailure('lazy_module', 'load_failed')
journey.markProfileReload(profileFailure)
journey.observeReloadedJourneys()
const profileEvents = () => events.filter(e => e.meta.failure_id === profileFailure)
assert(profileEvents().some(e => e.meta.stage === 'boot_observed'))
journey.profileFormReady('another-owner')
assert(!profileEvents().some(e => e.meta.stage === 'observed'))
journey.profileFormReady('fixture-owner')
journey.profileFormReady('fixture-owner')
assert.equal(profileEvents().filter(e => e.meta.evidence === 'profile_form_ready').length, 1)
journey.profileFormReady(null)
const abandoned = journey.diagnosticFailure('lazy_module', 'load_failed')
journey.markProfileReload(abandoned)
journey.observeReloadedJourneys()
window.dispatchEvent(new Event('hashchange'))
journey.profileFormReady('fixture-owner')
assert(!events.some(e => e.meta.failure_id === abandoned && e.meta.stage === 'observed'))

journey.setJourneyReporter(()=>{throw Error('broken reporter')});assert.doesNotThrow(()=>journey.diagnosticFailure('page','render_failed'));
globalThis.sessionStorage={getItem(){throw Error('private storage')},setItem(){throw Error('private storage')}};assert.doesNotThrow(()=>journey.diagnosticFailure('widget','render_failed'));
console.log('Journeys: queued first failure, retry/reload correlation, explicit recovery, original failure retained, reporter/storage isolation passed');
