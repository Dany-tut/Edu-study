import assert from 'node:assert/strict'
import { createLatestSave } from '../src/lib/latestSaveQueue.ts'
import { enqueueChapterSave } from '../src/lib/chapterSaveQueue.ts'
const tick=()=>new Promise(resolve=>setImmediate(resolve))
function fixture() {
 const chain={current:Promise.resolve()};const enqueue=createLatestSave(chain);const calls=[]
 const write=value=>new Promise((resolve,reject)=>calls.push({value,resolve,reject}))
 return {chain,enqueue,calls,write}
}
// One immutable active request plus one latest pending snapshot, all callers wait
// for actual acknowledgement (including false), not a synthetic early success.
{
 const f=fixture();const active=f.enqueue('course-A',{revision:0},f.write);await tick()
 let settled=0
 const waiting=Array.from({length:5},(_,i)=>f.enqueue('course-A',{revision:i+1},f.write).then(value=>{settled++;return value}))
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].value.revision,0)
 f.calls[0].resolve(true);await active;await tick()
 assert.equal(f.calls.length,2);assert.equal(f.calls[1].value.revision,5);assert.equal(settled,0)
 f.calls[1].resolve(false);assert.deepEqual(await Promise.all(waiting),Array(5).fill(false))
 assert.equal(settled,5)
}
// Revisions that have not begun yet collapse to a single write, using the latest
// writer closure as well as the latest immutable input.
{
 const f=fixture();let writer
 const promises=Array.from({length:6},(_,i)=>f.enqueue('A',i,async value=>{writer=i;return value}))
 assert.deepEqual(await Promise.all(promises),Array(6).fill(5));assert.equal(writer,5)
}
// Different entities and explicit publication/manual writes are barriers.
{
 const f=fixture();const order=[]
 const active=f.enqueue('A',0,f.write);await tick()
 const before=f.enqueue('A',1,async v=>{order.push(['A-before',v]);return true})
 const publish=f.chain.current.then(async()=>{order.push(['publish']);return true});f.chain.current=publish
 const after=f.enqueue('A',2,async v=>{order.push(['A-after',v]);return true})
 const other=f.enqueue('B',3,async v=>{order.push(['B',v]);return true})
 const last=f.enqueue('A',4,async v=>{order.push(['A-last',v]);return true})
 f.calls[0].resolve(true);await Promise.all([active,before,publish,after,other,last])
 assert.deepEqual(order,[['A-before',1],['publish'],['A-after',2],['B',3],['A-last',4]])
}
// The actual chapter queue shares the same chain. A whole-course snapshot on
// the far side must observe confirmed chapters and cannot swallow that write.
{
 const f=fixture();const seen=[];let chapters='old'
 const active=f.enqueue('A',0,f.write);await tick()
 const before=f.enqueue('A',1,async v=>{seen.push([v,chapters]);return true})
 const chapter=enqueueChapterSave(f.chain,async()=>{chapters='new';return true})
 const after=f.enqueue('A',2,async v=>{seen.push([v,chapters]);return true})
 const latest=f.enqueue('A',3,async v=>{seen.push([v,chapters]);return true})
 f.calls[0].resolve(true);await Promise.all([active,before,chapter,after,latest])
 assert.deepEqual(seen,[[1,'old'],[3,'new']])
}
// A failed active request does not poison the chain or lose the latest pending
// edit. A thrown error from the replacement reaches all superseded callers.
{
 const f=fixture();const active=f.enqueue('A',0,f.write);const failed=assert.rejects(active,/active failed/);await tick()
 const one=f.enqueue('A',1,f.write),two=f.enqueue('A',2,f.write)
 const rejected=[assert.rejects(one,/latest failed/),assert.rejects(two,/latest failed/)]
 f.calls[0].reject(new Error('active failed'));await failed;await tick()
 assert.equal(f.calls[1].value,2);f.calls[1].reject(new Error('latest failed'));await Promise.all(rejected)
 const retry=f.enqueue('A',3,async value=>value);assert.equal(await retry,3)
}
// Exercise the existing UI contract: an old acknowledgement cannot clear newer
// input, and saving remains true while a pending latest snapshot is unconfirmed.
{
 const f=fixture();let seq=0,draft=null,inFlight=0,unsaved=false
 const save=revision=>{seq++;const atSave=seq;draft=revision;unsaved=true;inFlight++
  return f.enqueue('A',revision,f.write).then(ok=>{if(ok&&seq===atSave){draft=null;unsaved=false}return ok}).finally(()=>inFlight--)}
 const first=save('first');await tick();const second=save('second');const last=save('latest')
 f.calls[0].resolve(true);await first;await tick();assert.equal(draft,'latest');assert.equal(unsaved,true);assert.equal(inFlight,2)
 f.calls[1].resolve(false);await Promise.all([second,last]);assert.equal(draft,'latest');assert.equal(unsaved,true);assert.equal(inFlight,0)
 const retry=save('latest');await tick();f.calls[2].resolve(true);await retry;assert.equal(draft,null);assert.equal(unsaved,false)
}
console.log('PASS: 6 FIFO snapshots -> active+latest; no early success; false/rejection fanout; entity/manual/publication/chapter barriers; latest closure; retry; late ack retains draft and pending status')
