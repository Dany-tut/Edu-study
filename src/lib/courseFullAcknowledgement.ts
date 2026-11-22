// External FULLv2 ACK adapter. Existing shared advance remains unchanged.
import {advanceConfirmedContent} from './courseContentAcknowledgement'
import {prepareFullPreservedSnapshot} from './courseFullPreservation'
import {baselineCanDriveDelta,type ConfirmedBaseline,type Scope} from './courseConfirmedBaseline'
import type {CourseContentSnapshot} from './courseContentDelta'
type Row=Record<string,unknown>;type Base=ConfirmedBaseline<CourseContentSnapshot>
const obj=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
function same(a:unknown,b:unknown):boolean {if(Object.is(a,b))return true;if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));return obj(a)&&obj(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.prototype.hasOwnProperty.call(b,k)&&same(a[k],b[k]))}
function stamp(v:unknown):string|null {if(typeof v!=='string')return null;const m=v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/);return m?m[1]+'.'+(m[2]??'').padEnd(6,'0')+'Z':null}
function by<T>(a:readonly T[],key:(v:T)=>unknown):Map<string,T>|null {const m=new Map<string,T>();for(const v of a){const k=key(v);if(typeof k!=='string'||!k||m.has(k))return null;m.set(k,v)}return m}
export type FullDispatch={base:Base;canonical:CourseContentSnapshot;preserved:CourseContentSnapshot;arrayDeletes:NonNullable<ReturnType<typeof prepareFullPreservedSnapshot>>['arrayDeletes']}
export function prepareFullDispatch(base:Base|null,canonical:CourseContentSnapshot,scope:Scope):FullDispatch|null {
 try {
  if(!base||!baselineCanDriveDelta(base,{courseShortId:base.courseShortId,baselineStamp:base.stamp,scope})||canonical.course.status!==base.serialized.course.status)return null
  const kept=by(canonical.lessons,l=>l.short_id),old=by(base.lessons,l=>l.shortId),modules=by(canonical.modules,m=>m.id)
  if(!kept||!old||!modules||canonical.modules.some(m=>!uuid(m.id)||typeof m.label!=='string'||!Number.isInteger(m.position)))return null
  for(const row of canonical.lessons){const previous=old.get(row.short_id);if(previous?row.id!==previous.id:row.id!=='')return null;if(row.module_id!==null&&!modules.has(row.module_id as string))return null}
  const prepared=prepareFullPreservedSnapshot(base,canonical,scope);if(!prepared)return null
  return structuredClone({base,canonical,preserved:prepared.snapshot,arrayDeletes:prepared.arrayDeletes})
 }catch{return null}
}
/** New IDs are bound ONLY for explicit new refs in immutable dispatch. The
 * complete returned roster is validated before the shared generic advance. */
export function advanceConfirmedFull(dispatch:FullDispatch|null,ack:unknown,scope:Scope,currentConfirmed:Base|null):Base|null {
 try {
  if(!dispatch||!currentConfirmed||!same(currentConfirmed,dispatch.base)||!obj(ack)||Object.keys(ack).some(k=>!['course_id','stamp','access','lessons','full_snapshot_confirmed','module_witness','lesson_witness','course_updated_at'].includes(k)))return null
  const verified=prepareFullDispatch(dispatch.base,dispatch.canonical,scope)
  if(!verified||!same(verified,dispatch)||!Array.isArray(ack.lesson_witness)||!Array.isArray(ack.module_witness)||!Array.isArray(ack.lessons))return null
  const before=stamp(dispatch.base.stamp),next=stamp(ack.stamp);if(!before||!next||next<before)return null
  const originalByRef=new Map(dispatch.base.lessons.map(l=>[l.shortId,l])),originalIDs=new Set(dispatch.base.lessons.map(l=>l.id))
  const sentByRef=by(dispatch.preserved.lessons,l=>l.short_id),returned=by(ack.lesson_witness,v=>obj(v)?v.short_id:null),returnedIDs=by(ack.lesson_witness,v=>obj(v)?v.id:null),echoes=by(ack.lessons,v=>obj(v)?v.id:null)
  if(!sentByRef||!returned||!returnedIDs||!echoes||returned.size!==sentByRef.size||returnedIDs.size!==sentByRef.size||echoes.size!==sentByRef.size)return null
  const canonical=structuredClone(dispatch.canonical),preserved=structuredClone(dispatch.preserved)
  const expectedLessons:Array<{id:string;shortId:string;moduleId:string|null}>=[]
  let max=before
  for(const [ref,sent] of sentByRef){const row=returned.get(ref);if(!obj(row)||!uuid(row.id)||row.module_id!==sent.module_id)return null
   const old=originalByRef.get(ref),updated=stamp(row.updated_at);if(!updated||updated>next)return null
   if(old?row.id!==old.id:originalIDs.has(row.id))return null
   const echo=echoes.get(row.id);if(!obj(echo)||Object.keys(echo).some(k=>!['id','title','lesson_number'].includes(k))||echo.title!==sent.title||echo.lesson_number!==sent.lesson_number)return null
   if(!old&&updated<=before)return null
   if(old){const raw=dispatch.base.serialized.rawLessons?.[ref];if(!raw)return null
    const unchanged=Object.keys(sent).filter(k=>k!=='id').every(k=>same(sent[k],raw[k]))
    if(unchanged&&updated!==stamp(old.updatedAt))return null
   }
   if(updated>max)max=updated
   canonical.lessons.find(l=>l.short_id===ref)!.id=row.id;preserved.lessons.find(l=>l.short_id===ref)!.id=row.id
   expectedLessons.push({id:row.id,shortId:ref,moduleId:row.module_id as string|null})
  }
  // FULLv2 has no course_updated_at echo currently: access snapshot includes
  // actual course timestamp even when no intents, so tie exactMAX to it.
  if(!obj(ack.access)||!Array.isArray(ack.access.student_ids)||!Array.isArray(ack.access.group_ids)||!obj(ack.access.access_modes)
   ||ack.access.student_ids.some(v=>!uuid(v))||ack.access.group_ids.some(v=>!uuid(v))||Object.values(ack.access.access_modes).some(v=>!['full','custom','by_date'].includes(v as string)))return null
  const courseStamp=stamp(ack.access.updated_at);if(!courseStamp||courseStamp>next)return null
  // Deleting newest lesson may lower rowMAX; server guarantees course revision
  // advancement, so original aggregate must not be used as inferred ACK time.
  max=courseStamp;for(const row of ack.lesson_witness){const s=obj(row)?stamp(row.updated_at):null;if(!s)return null;if(s>max)max=s}
  if(max!==next)return null
  return advanceConfirmedContent(dispatch.base,canonical,preserved,ack,scope,{modules:preserved.modules,lessons:expectedLessons})
 }catch{return null}
}
