import {build} from 'esbuild';import assert from 'node:assert/strict';
const result=await build({stdin:{contents:"export * from './src/lib/chunkError';export * from './src/lib/diagnosticJourney'",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const memory=new Map();globalThis.sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const mod=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));const events=[];mod.setJourneyReporter((event,meta)=>events.push({event,meta}));let tries=0;
const resultValue=await mod.retryImport(async()=>{if(++tries===1)throw Error('temporary load');return 'lesson-module'});
assert.equal(resultValue,'lesson-module');assert.equal(events.filter(x=>x.event==='operation_failed').length,1);assert(events.some(x=>x.meta.stage==='observed'&&x.meta.evidence==='module_loaded'));const failure=events[0].meta.failure_id;assert(events.filter(x=>x.meta.failure_id===failure).length>=3);
const error=new Error('original');await assert.rejects(()=>mod.retryImport(async()=>{throw error},1),x=>x===error);
console.log('Lesson import: transient failure retained before retry, explicit successful recovery and original rejection identity passed');
