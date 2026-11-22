// External candidate for src/lib/courseFullCompact.ts. No editor/cache/network input.
import { prepareFullDispatch, type FullDispatch } from './courseFullAcknowledgement'
import { baselineCanDriveDelta, type ConfirmedBaseline, type Scope } from './courseConfirmedBaseline'
import type { CourseContentSnapshot } from './courseContentDelta'

type Row = Record<string, unknown>
type Base = ConfirmedBaseline<CourseContentSnapshot>
export type CompactFullLesson = Row | Readonly<{ short_id: string; unchanged_id: string }>
/** Exactly the existing server FULL field_names, not all SQL columns. Unknown
 * nested JSON is compared in full; generated/auth/ownership SQL columns never
 * become writable. Missing chapter_variants is the established KEEP semantic. */
export const fullWritableLessonFields = ['module_id', 'short_id', 'title', 'position', 'lesson_number', 'youtube_url', 'timecodes', 'chapter_variants',
  'description', 'content', 'kind', 'test_tasks', 'materials', 'scheduled_date', 'scheduled_time', 'scheduled_duration',
  'rec_date', 'rec_time', 'rec_duration', 'lesson_sched_manual', 'delivery_mode', 'homework'] as const
const own = (row: Row, key: string): boolean => Object.prototype.hasOwnProperty.call(row, key)
const record = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((value, i) => same(value, b[i]))
  if (!record(a) || !record(b)) return false
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => own(b, key) && same(a[key], b[key]))
}
/** Null means source/provenance BLOCK, not permission to adopt another stamp.
 * Returned rows are a wire projection only: retain the ORIGINAL full dispatch
 * canonical/preserved/base unchanged for the existing full ACK adapter. */
export function compactFullLessons(dispatch: FullDispatch | null, scope: Scope, currentVerifiedBase: Base | null): CompactFullLesson[] | null {
  try {
    if (!dispatch || !currentVerifiedBase || !same(currentVerifiedBase, dispatch.base)
      || dispatch.base.source !== 'matched-load' || !uuid(dispatch.base.ownerId) || !uuid(dispatch.base.courseId)
      || dispatch.base.token.courseShortId !== dispatch.base.courseShortId
      || dispatch.base.token.scope.ownerId !== dispatch.base.ownerId
      || !baselineCanDriveDelta(dispatch.base, { courseShortId: dispatch.base.courseShortId, baselineStamp: currentVerifiedBase.stamp, scope })) return null
    const verified = prepareFullDispatch(dispatch.base, dispatch.canonical, scope)
    if (!verified || !same(verified, dispatch)) return null
    const oldByRef = new Map(dispatch.base.lessons.map(row => [row.shortId, row]))
    if (oldByRef.size !== dispatch.base.lessons.length || new Set(dispatch.base.lessons.map(row => row.id)).size !== oldByRef.size) return null
    const rows: CompactFullLesson[] = []
    for (const sent of verified.preserved.lessons) {
      const previous = oldByRef.get(sent.short_id)
      if (!previous) { const { id: _id, ...full } = sent; rows.push(structuredClone(full)); continue }
      const raw = verified.base.serialized.rawLessons?.[sent.short_id]
      if (!raw || !uuid(previous.id) || raw.id !== previous.id || sent.id !== previous.id
        || raw.short_id !== previous.shortId || raw.module_id !== previous.moduleId
        || (own(raw, 'course_id') && raw.course_id !== verified.base.courseId)) return null
      const unchanged = fullWritableLessonFields.every(key => {
        // Existing FULL protocol never clears chapter_variants merely because
        // the UI omitted its optional property. Ref has exactly the same KEEP
        // effect, even if a prior validated ACK omitted this column locally.
        if (key === 'chapter_variants' && !own(sent, key)) return true
        return own(sent, key) && sent[key] !== undefined && own(raw, key) && raw[key] !== undefined && same(sent[key], raw[key])
      })
      if (unchanged) rows.push({ short_id: sent.short_id, unchanged_id: previous.id })
      else { const { id: _id, ...full } = sent; rows.push(structuredClone(full)) }
    }
    return rows
  } catch { return null }
}
