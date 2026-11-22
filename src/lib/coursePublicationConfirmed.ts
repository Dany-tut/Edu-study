// External candidate for src/lib/coursePublicationConfirmed.ts. No UI/latest draft input.
import { prepareConfirmedSnapshot, advanceConfirmedContent } from './courseContentAcknowledgement'
import { baselineCanDriveDelta, type ConfirmedBaseline, type Scope } from './courseConfirmedBaseline'
import type { CourseContentSnapshot } from './courseContentDelta'

type Row = Record<string, unknown>
type Base = ConfirmedBaseline<CourseContentSnapshot>
export type PublicationStatus = 'draft' | 'published'
export type PublicationRequest = Readonly<{
  p_short_id: string; p_baseline: string
  p_expected_modules: CourseContentSnapshot['modules']
  p_expected_status: PublicationStatus; p_status: PublicationStatus
}>
export type PublicationDispatch = Readonly<{
  base: Base; request: PublicationRequest
  canonical: CourseContentSnapshot; preserved: CourseContentSnapshot
}>
const record = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value)
const own = (row: Row, key: string): boolean => Object.prototype.hasOwnProperty.call(row, key)
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((value, i) => same(value, b[i]))
  if (!record(a) || !record(b)) return false
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => own(b, key) && same(a[key], b[key]))
}
function stamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/)
  if (!m || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString().slice(0, 19) !== m[1]) return null
  return m[1] + '.' + (m[2] ?? '').padEnd(6, '0') + 'Z'
}
const modules = (value: readonly CourseContentSnapshot['modules'][number][]) => [...value].sort((a, b) => a.id.localeCompare(b.id))
const status = (value: unknown): value is PublicationStatus => value === 'draft' || value === 'published'
export function buildWholeWitnessPublicationArgs(base: Base, destination: PublicationStatus): PublicationRequest {
  if (!status(base.serialized.course.status) || !status(destination)) throw Error('Invalid publication status')
  return structuredClone({ p_short_id: base.courseShortId, p_baseline: base.stamp,
    p_expected_modules: [...base.modules], p_expected_status: base.serialized.course.status, p_status: destination })
}
/** Null is a preservation/provenance block, never permission for direct status UPDATE. */
export function prepareConfirmedPublicationDispatch(base: Base | null, request: PublicationRequest, scope: Scope): PublicationDispatch | null {
  try {
    if (!base || !baselineCanDriveDelta(base, { courseShortId: request.p_short_id, baselineStamp: request.p_baseline, scope })
      || Object.keys(request).length !== 5 || Object.keys(request).some(key => !['p_short_id', 'p_baseline', 'p_expected_modules', 'p_expected_status', 'p_status'].includes(key))
      || !status(request.p_expected_status) || !status(request.p_status) || base.serialized.course.status !== request.p_expected_status
      || !same(modules(request.p_expected_modules), modules(base.modules))) return null
    if (base.serialized.rawCourse && own(base.serialized.rawCourse, 'status')
      && base.serialized.rawCourse.status !== request.p_expected_status) return null
    const canonical = structuredClone(base.serialized)
    canonical.course.status = request.p_status
    const preserved = prepareConfirmedSnapshot(base.serialized, canonical)
    if (preserved.course.status !== request.p_status || !same(canonical.lessons, base.serialized.lessons)
      || !same(canonical.modules, base.serialized.modules)) return null
    return { base: structuredClone(base), request: structuredClone(request), canonical, preserved }
  } catch { return null }
}
export function advanceConfirmedPublication(dispatch: PublicationDispatch | null, ack: unknown, scope: Scope, currentConfirmed: Base | null): Base | null {
  try {
    if (!dispatch || !currentConfirmed || !same(currentConfirmed, dispatch.base) || !record(ack)
      || Object.keys(ack).some(key => !['course_id', 'stamp', 'course_updated_at', 'full_snapshot_confirmed', 'module_witness', 'lesson_witness', 'applied_course_patch'].includes(key))) return null
    const verified = prepareConfirmedPublicationDispatch(dispatch.base, dispatch.request, scope)
    if (!verified || !same(verified.canonical, dispatch.canonical) || !same(verified.preserved, dispatch.preserved)
      || !record(ack.applied_course_patch) || Object.keys(ack.applied_course_patch).length !== 1
      || ack.applied_course_patch.status !== verified.request.p_status || !Array.isArray(ack.lesson_witness)) return null
    const oldStamp = stamp(verified.base.stamp), courseStamp = stamp(ack.course_updated_at), globalStamp = stamp(ack.stamp)
    if (!oldStamp || !courseStamp || !globalStamp || courseStamp > globalStamp) return null
    const noop = verified.request.p_expected_status === verified.request.p_status
    if (noop ? globalStamp !== oldStamp || courseStamp > oldStamp : courseStamp <= oldStamp || globalStamp !== courseStamp) return null
    for (const old of verified.base.lessons) {
      const rows = ack.lesson_witness.filter(value => record(value) && value.id === old.id)
      if (rows.length !== 1 || stamp(rows[0].updated_at) !== stamp(old.updatedAt)) return null
    }
    return advanceConfirmedContent(verified.base, verified.canonical, verified.preserved, ack, scope, {
      modules: [...verified.base.modules],
      lessons: verified.base.lessons.map(({ id, shortId, moduleId }) => ({ id, shortId, moduleId })),
    })
  } catch { return null }
}
