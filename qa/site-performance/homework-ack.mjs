import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transform} from 'esbuild'
const text=readFileSync('src/lib/useHomework.ts','utf8')
const map=text.slice(text.indexOf('function canAcknowledgeHomework('),text.indexOf('// Домашки владельца.'))
const hook=text.slice(text.indexOf('export function useHomework()'),text.indexOf('// Сдачи сложных заданий.'))
const {code}=await transform(`const {supabase,homeworkQuery,useSharedQuery,mutationAcknowledged,missingMutationRow,trackEvent,getOwnerId}=globalThis.__hw;${map}\n${hook}`,{loader:'ts',format:'esm'})
let snapshot=[],reloads=0,releaseRead
const q={getSnapshot:()=>({value:snapshot,loading:false}),beginMutation:()=>update=>{snapshot=update(snapshot);return true},reload:()=>{reloads++;return new Promise(r=>releaseRead=r)}}
let nextResult,requested
const client={from(table){assert.equal(table,'homework');const request={};return new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve(nextResult);return (...args)=>{request[key]=args;requested=request;return clientProxy(request)}}})}}
function clientProxy(request){return new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve(nextResult);return(...args)=>{request[key]=args;requested=request;return clientProxy(request)}}})}
globalThis.__hw={supabase:client,homeworkQuery:q,useSharedQuery:()=>q.getSnapshot(),mutationAcknowledged:(_,r)=>!r.error&&!!r.data,missingMutationRow:()=>Error('missing'),trackEvent:()=>{},getOwnerId:async()=> 'owner'}
const {useHomework}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const hw=useHomework(),payload={groupId:'group',title:'Title',dueDate:'2026-12-01',taskIds:[1],totalStudents:3}
nextResult={data:{id:'created',title:'Title',group_id:'group',groups:{name:'QA group',color:'blue'},basic_tasks:[{id:1}],total_students:3},error:null}
await hw.createHomework(payload)
assert.equal(snapshot[0].id,'created');assert.equal(snapshot[0].groupName,'QA group');assert.equal(reloads,1,'background reread started but caller resolved without it')
snapshot[0]={...snapshot[0],submittedCount:2,reviewedCount:1,oldestSubmittedAt:'old'}
nextResult={data:{...nextResult.data,title:'Changed'},error:null}
await hw.updateHomework('created',{...payload,title:'Changed'})
assert.equal(snapshot[0].title,'Changed');assert.equal(snapshot[0].submittedCount,2);assert.equal(snapshot[0].oldestSubmittedAt,'old')
nextResult={data:{id:'created',status:'closed',updated_at:'2026-11-22T09:00:02.000002+00:00'},error:null};assert.equal(await hw.closeHomework('created'),true);assert.equal(snapshot[0].status,'closed')
nextResult={data:{id:'created',title:'Stale active',status:'active',updated_at:'2026-11-22T09:00:02.000001+00:00'},error:null}
await hw.updateHomework('created',payload)
assert.equal(snapshot[0].status,'closed','older update ACK cannot reopen a confirmed closed row')
assert.notEqual(snapshot[0].title,'Stale active','older update ACK cannot replace newer confirmed row')
const before=JSON.stringify(snapshot);nextResult={data:null,error:{message:'denied'}}
await hw.createHomework(payload);assert.equal(JSON.stringify(snapshot),before,'failed mutation never publishes success')
releaseRead?.()
console.log('PASS actual homework hook: confirmed create/update/close immediately in list, group metadata and counts retained, no wait for background reads, errors keep prior snapshot')
