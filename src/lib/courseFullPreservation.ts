// External FULL preservation proposal. No DB authority/dispatch eligibility is
// created here; caller must validate typed edit intent and immutable provenance.
import {prepareConfirmedSnapshot} from './courseContentAcknowledgement'
import {baselineCanDriveDelta,type ConfirmedBaseline,type Scope} from './courseConfirmedBaseline'
import type {CourseContentSnapshot} from './courseContentDelta'
type Row=Record<string,unknown>
export type ArrayDeleteIntent={lessonId:string;lessonShortId:string;column:string;path:string[];id:string|number;idType:'string'|'number'}
export type FullPreservationResult={snapshot:CourseContentSnapshot;arrayDeletes:ArrayDeleteIntent[]}
class PreservationBlock extends Error {}
function block():never {throw new PreservationBlock('FULL raw preservation BLOCK')}
const obj=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v))
const own=(o:Row,k:string)=>Object.prototype.hasOwnProperty.call(o,k)
function same(a:unknown,b:unknown):boolean {
 if(Object.is(a,b))return true
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]))
 if(!obj(a)||!obj(b))return false
 return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>own(b,k)&&same(a[k],b[k]))
}
const copy=(o:Row,k:string,v:unknown)=>Object.defineProperty(o,k,{value:structuredClone(v),enumerable:true,writable:true,configurable:true})
function stableId(row:unknown):string|null {
 if(!obj(row))return null
 return typeof row.id==='string'&&row.id.length>0?'s:'+row.id:typeof row.id==='number'&&Number.isFinite(row.id)?'n:'+row.id:null
}
function indexed(a:unknown[]):Map<string,Row> {
 const m=new Map<string,Row>()
 for(const row of a){const key=stableId(row);if(!key||!obj(row)||m.has(key))block();m.set(key,row)}
 return m
}
function merge(raw:unknown,before:unknown,after:unknown,path:string[],removed:(path:string[],id:string|number)=>void):unknown {
 // Unchanged subtrees have no edit intent: preserve authoritative raw entirely.
 if(same(before,after))return structuredClone(raw===undefined?after:raw)
 if(Array.isArray(before)||Array.isArray(after)||Array.isArray(raw)) {
  if(!Array.isArray(before)||!Array.isArray(after)||!Array.isArray(raw))block()
  const arrays=[before,after,raw] as unknown[][]
  const scalar=arrays.every(a=>a.every(v=>!obj(v)&&!Array.isArray(v)))
  if(scalar){if(!same(raw,before))block();return structuredClone(after)}
  // Edited recordarrays are whole-record stable-ID operations, never by index.
  const bm=indexed(before),am=indexed(after),rm=indexed(raw)
  for(const id of bm.keys())if(!rm.has(id))block()
  for(const id of am.keys())if(!bm.has(id)&&rm.has(id))block() // unseen raw-ID collision
  const beforeKeys=[...bm.keys()],rawKnownKeys=raw.map(stableId).filter((k):k is string=>k!==null&&bm.has(k))
  if(!same(beforeKeys,rawKnownKeys))block() // source projection must preserve known order
  const knownAfter=[...am.keys()].filter(k=>bm.has(k)),newAfter=[...am.keys()].filter(k=>!bm.has(k))
  const hidden=raw.some(row=>!bm.has(stableId(row)!))
  // With hidden anchors, insertion before/interleaved among known rows has no
  // unambiguous slot policy. Accept suffix additions only; otherwise BLOCK.
  if(hidden&&newAfter.length){let sawNew=false;for(const key of am.keys()){if(!bm.has(key))sawNew=true;else if(sawNew)block()}}
  for(const [key,row] of bm)if(!am.has(key))removed(path,row.id as string|number)
  if(!hidden)return after.map(row=>{const key=stableId(row)!;return bm.has(key)?merge(rm.get(key),bm.get(key),row,[...path,key],removed):structuredClone(row)})
  // Preserve hidden slots/anchors: remove explicitly deleted known slots;
  // fill surviving known slots in requested known order. Unknown raw rows stay
  // exactly between those slots, rather than being collected at array end.
  let index=0
  const result:unknown[]=[]
  for(const rawRow of raw){const key=stableId(rawRow)!
   if(!bm.has(key)){result.push(structuredClone(rawRow));continue}
   if(!am.has(key))continue
   const nextKey=knownAfter[index++];result.push(merge(rm.get(nextKey),bm.get(nextKey),am.get(nextKey),[...path,nextKey],removed))
  }
  if(index!==knownAfter.length)block()
  for(const key of newAfter)result.push(structuredClone(am.get(key)))
  return result
 }
 if(obj(before)||obj(after)||obj(raw)) {
  if(before===undefined){if(raw!==undefined&&!same(raw,after))block();return structuredClone(after)}
  if(!obj(before)||!obj(after))block()
  if(raw===null||raw===undefined)raw={}
  if(!obj(raw))block()
  const result=structuredClone(raw)
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])) {
   if(!own(after,key)) {
    // Deleting a complete object/array may hide unrepresented raw data. Only
    // exact roundtrippable leaf removal is allowed; otherwise explicit BLOCK.
    if(!same(raw[key],before[key]))block();delete result[key]
   }else if(!own(before,key)) {
    if(own(raw,key)&&!same(raw[key],after[key]))block();copy(result,key,after[key])
   }else copy(result,key,merge(raw[key],before[key],after[key],[...path,key],removed))
  }
  return result
 }
 // Confirmed canonical projection owns a changed scalar leaf; SQL-null/UI-
 // default/time formatting need not round-trip. Unknown siblings stay raw.
 return structuredClone(after)
}
const jsonColumns=['content','homework','materials','test_tasks'] as const
export function prepareFullPreservedSnapshot(base:ConfirmedBaseline<CourseContentSnapshot>|null,after:CourseContentSnapshot,scope:Scope):FullPreservationResult|null {
 try {
  if(!base||base.source!=='matched-load'||!baselineCanDriveDelta(base,{courseShortId:base.courseShortId,baselineStamp:base.stamp,scope}))return null
  const before=base.serialized
  const old=new Map<string,Row>(),raw=before.rawLessons
  for(const row of before.lessons){if(!row.short_id||old.has(row.short_id))return null;old.set(row.short_id,row)}
  const seen=new Set<string>();for(const row of after.lessons){if(!row.short_id||seen.has(row.short_id))return null;seen.add(row.short_id)}
  // Existing helper retains ownership whitelist and metadata/module/lesson
  // structural semantics; this helper adds raw JSON array preservation ONLY.
  const snapshot=prepareConfirmedSnapshot(before,after),arrayDeletes:ArrayDeleteIntent[]=[]
  const oldModules=new Map(before.modules.map(module=>[module.id,module]))
  const rawModules=new Map(base.modules.map(module=>[module.id,module]))
  snapshot.modules=snapshot.modules.map(module=>{
   const old=oldModules.get(module.id),rawModule=rawModules.get(module.id)
   return old&&rawModule?{...module,
    ...(module.label===old.label?{label:rawModule.label}:{}),
    ...(module.position===old.position?{position:rawModule.position}:{}),
   }:module
  })
  for(const row of snapshot.lessons){const previous=old.get(row.short_id),canonical=after.lessons.find(l=>l.short_id===row.short_id)!
   if(!previous)continue // newly inserted lesson is root coordinator's authority
   const authoritative=raw?.[row.short_id];if(!authoritative||authoritative.id!==previous.id||canonical.id!==previous.id)return null
   for(const column of jsonColumns)if(own(canonical,column)) {
    const merged=merge(authoritative[column],previous[column],canonical[column],[],(path,id)=>arrayDeletes.push({lessonId:row.id,lessonShortId:row.short_id,column,path:[...path],id,idType:typeof id as 'string'|'number'}))
    copy(row,column,merged)
   }
  }
  return {snapshot,arrayDeletes}
 }catch{return null}
}
