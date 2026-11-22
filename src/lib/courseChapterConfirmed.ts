// External proposal only. No latestCourse parameter: ACK can certify only base+request.
import {prepareConfirmedSnapshot,advanceConfirmedContent} from './courseContentAcknowledgement'
import {baselineCanDriveDelta,type ConfirmedBaseline,type Scope} from './courseConfirmedBaseline'
import type {CourseContentSnapshot} from './courseContentDelta'
import {chapterPayload} from './chapterVariants'
import type {buildWholeWitnessChapterArgs} from './courseChapterWriteArgs'
type Row=Record<string,unknown>
type Request=ReturnType<typeof buildWholeWitnessChapterArgs>
type Base=ConfirmedBaseline<CourseContentSnapshot>
const obj=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)
const own=(o:Row,k:string)=>Object.prototype.hasOwnProperty.call(o,k)
function same(a:unknown,b:unknown):boolean {
 if(Object.is(a,b))return true
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]))
 if(!obj(a)||!obj(b))return false
 return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>own(b,k)&&same(a[k],b[k]))
}
function stamp(v:unknown):string|null {
 if(typeof v!=='string')return null
 const m=v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/)
 return m?m[1]+'.'+(m[2]??'').padEnd(6,'0')+'Z':null
}
const sortedModules=(a:readonly {id:string;label:string;position:number}[])=>[...a].sort((a,b)=>a.id.localeCompare(b.id))
// Do not let a typed projection silently delete unknown raw variant roots or
// item metadata (including originalTitle). Unsupported removal/identity change
// of an item carrying such metadata BLOCKS before dispatch, no hidden merge.
function preservesRawChapters(raw:Row,variants:unknown):boolean {
 if(!obj(variants))return false
 const before=raw.chapter_variants
 if(before!==null&&before!==undefined&&!obj(before))return false
 if(obj(before)) {
  const known=new Set(['source','active','revision','text','slides'])
  if(Object.keys(before).some(k=>!known.has(k)&&(!own(variants,k)||!same(before[k],variants[k]))))return false
  for(const mode of ['text','slides']) {
   const old=before[mode],next=variants[mode]
   if(old===undefined)continue
   if(!Array.isArray(old))return false
   for(const item of old) {
    if(!obj(item))return false
    const unknown=Object.keys(item).filter(k=>!['time','label','seconds'].includes(k))
    if(!unknown.length)continue
    if(!Array.isArray(next))return false
    const matches=next.filter(n=>obj(n)&&n.time===item.time&&n.seconds===item.seconds)
    if(matches.length!==1||unknown.some(k=>!own(matches[0],k)||!same(item[k],matches[0][k])))return false
   }
  }
 }
 if(raw.timecodes!==null&&raw.timecodes!==undefined&&(!Array.isArray(raw.timecodes)||raw.timecodes.some(c=>!obj(c)||Object.keys(c).some(k=>!['time','label','seconds'].includes(k)))))return false
 return true
}
export type ChapterDispatch={base:Base;request:Request;canonical:CourseContentSnapshot;preserved:CourseContentSnapshot}
/** MUST run before mutation dispatch. Null means preservation/provenance BLOCK,
 * not permission to use another write engine with a stale full snapshot. */
export function prepareConfirmedChapterDispatch(base:Base|null,request:Request,scope:Scope):ChapterDispatch|null {
 try {
  if(!base||!baselineCanDriveDelta(base,{courseShortId:request.p_course_short_id,baselineStamp:request.p_baseline,scope})
   ||!same(sortedModules(request.p_expected_modules),sortedModules(base.modules)))return null
  const target=base.lessons.find(l=>l.shortId===request.p_lesson_short_id)
  const canonicalTarget=base.serialized.lessons.find(l=>l.short_id===request.p_lesson_short_id)
  if(!target||!canonicalTarget||canonicalTarget.id!==target.id)return null
  const raw=base.serialized.rawLessons?.[target.shortId]??canonicalTarget,p=request.p_chapter_payload
  if(Object.keys(request).length!==5||Object.keys(request).some(k=>!['p_course_short_id','p_baseline','p_expected_modules','p_lesson_short_id','p_chapter_payload'].includes(k))
   ||!obj(p)||Object.keys(p).length!==5||Object.keys(p).some(k=>!['source','timecodes','chapter_variants','expected_timecodes','expected_chapter_variants'].includes(k))
   ||!same(chapterPayload(p.chapter_variants).timecodes,p.timecodes))return null
  if(p.source!==p.chapter_variants.source||typeof raw.youtube_url!=='string'||raw.youtube_url.trim()!==p.source
   ||!same(raw.timecodes??[],p.expected_timecodes)||!same(raw.chapter_variants??null,p.expected_chapter_variants)
   ||!preservesRawChapters(raw,p.chapter_variants))return null
  const canonical=structuredClone(base.serialized)
  const row=canonical.lessons.find(l=>l.short_id===target.shortId)!
  row.timecodes=structuredClone(p.timecodes);row.chapter_variants=structuredClone(p.chapter_variants)
  const preserved=prepareConfirmedSnapshot(base.serialized,canonical)
  const sent=preserved.lessons.find(l=>l.short_id===target.shortId)!
  if(!same(sent.timecodes,p.timecodes)||!same(sent.chapter_variants,p.chapter_variants))return null
  return {base:structuredClone(base),request:structuredClone(request),canonical,preserved}
 }catch{return null}
}
export function advanceConfirmedChapter(dispatch:ChapterDispatch|null,ack:unknown,scope:Scope,currentConfirmed:Base|null):Base|null {
 try {
  if(!dispatch||!currentConfirmed||!same(currentConfirmed,dispatch.base)||!obj(ack)||Object.keys(ack).some(k=>!['course_id','stamp','full_snapshot_confirmed','module_witness','lesson_witness','applied_chapters'].includes(k)))return null
  const verified=prepareConfirmedChapterDispatch(dispatch.base,dispatch.request,scope)
  if(!verified||!same(verified.canonical,dispatch.canonical)||!same(verified.preserved,dispatch.preserved))return null
  const {base,request,canonical,preserved}=verified,p=request.p_chapter_payload,applied=ack.applied_chapters
  const target=base.lessons.find(l=>l.shortId===request.p_lesson_short_id)!
  if(!obj(applied)||Object.keys(applied).length!==6||Object.keys(applied).some(k=>!['id','short_id','updated_at','youtube_url','timecodes','chapter_variants'].includes(k))
   ||applied.id!==target.id||applied.short_id!==target.shortId||typeof applied.youtube_url!=='string'||applied.youtube_url.trim()!==p.source
   ||!same(applied.timecodes,p.timecodes)||!same(applied.chapter_variants,p.chapter_variants)||!Array.isArray(ack.lesson_witness))return null
  // Only target chapter write is legal: every other row's timestamp unchanged.
  // Exact target stamp ties the payload echo to authoritative inventory.
  const returned=ack.lesson_witness.filter(v=>obj(v)&&v.id===target.id)
  if(returned.length!==1||!stamp(applied.updated_at)||stamp(returned[0].updated_at)!==stamp(applied.updated_at))return null
  for(const old of base.lessons.filter(l=>l.id!==target.id)) {
   const r=ack.lesson_witness.filter(v=>obj(v)&&v.id===old.id)
   if(r.length!==1||stamp(r[0].updated_at)!==stamp(old.updatedAt))return null
  }
  const oldRaw=base.serialized.rawLessons?.[target.shortId]??base.serialized.lessons.find(l=>l.id===target.id)!
  const beforeStamp=stamp(base.stamp),targetStamp=stamp(applied.updated_at),oldTargetStamp=stamp(target.updatedAt)
  if(!beforeStamp||!targetStamp||!oldTargetStamp)return null
  const noop=same(oldRaw.timecodes,p.timecodes)&&same(oldRaw.chapter_variants,p.chapter_variants)
  if((noop&&targetStamp!==oldTargetStamp)||(!noop&&targetStamp<=beforeStamp)||stamp(ack.stamp)!==(targetStamp>beforeStamp?targetStamp:beforeStamp))return null
  if(applied.youtube_url!==oldRaw.youtube_url)return null // no source normalization write is authorized
  const result=advanceConfirmedContent(base,canonical,preserved,ack,scope,{modules:[...base.modules],lessons:base.lessons.map(({id,shortId,moduleId})=>({id,shortId,moduleId}))})
  if(!result)return null
  const raw=result.serialized.rawLessons?.[target.shortId]
  if(!raw||!same(raw.timecodes,applied.timecodes)||!same(raw.chapter_variants,applied.chapter_variants))return null
  return result
 }catch{return null}
}
