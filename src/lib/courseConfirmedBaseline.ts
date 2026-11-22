/** Match authoritative metadata/heavy reads before deriving a delta baseline.
 * This witness is an optimization proof, never an authorization credential.
 * SQL must still perform ownership/RLS and CAS under the course/lesson locks.
 */
export type Scope = Readonly<{ authEpoch: number; ownerId: string }>
export type ReadToken = Readonly<{ courseShortId: string; scope: Scope; requestId: number }>
export type ModuleWitness = Readonly<{ id: string; label: string; position: number }>
export type LessonWitness = Readonly<{
  id: string; shortId: string; moduleId: string | null; updatedAt: string
}>
export type Witness = Readonly<{
  courseId: string; courseShortId: string; ownerId: string; courseUpdatedAt: string
  modules: readonly ModuleWitness[]; lessons: readonly LessonWitness[]
}>
export type MetadataRead<Light> = Readonly<{
  origin: 'network-metadata'; token: ReadToken; witness: Witness
  // Original metadata snapshot stamp, not a time read from a later request.
  sourceStamp: string
  // Separately-read number_start may participate only when version-bound.
  numberStart: { included: false } | { included: true; readCourseUpdatedAt: string }
  light: Light
}>
export type RawHeavyWitness = Readonly<{
  id: string; short_id: string; module_id: string | null; updated_at: string
}>
export type HeavyRead<RawHeavy extends RawHeavyWitness> = Readonly<{
  token: ReadToken; witness: Witness; rows: readonly RawHeavy[]
}>
export type ConfirmedBaseline<Serialized> = Readonly<{
  source: 'matched-load'; token: ReadToken; courseShortId: string; courseId: string
  ownerId: string; stamp: string; serialized: Serialized
  // Identities retained separately from canonical writable field representation.
  lessons: readonly LessonWitness[]; modules: readonly ModuleWitness[]
}>

// Do not use Date.parse/Date.toISOString: they discard Postgres microseconds.
// PostgREST UTC spelling variants are allowed; unexpected zones fail closed.
function stampKey(stamp: string | null | undefined): string | null {
  const m = stamp?.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/)
  return m ? `${m[1]}.${(m[2] ?? '').padEnd(6, '0')}Z` : null
}
function sameScope(a: Scope, b: Scope) {
  return a.authEpoch === b.authEpoch && a.ownerId === b.ownerId
}
function uniqueBy<T>(rows: readonly T[], key: (r: T) => string | null | undefined) {
  const map = new Map<string, T>()
  for (const row of rows) {
    const id = key(row)
    if (!id || map.has(id)) return null
    map.set(id, row)
  }
  return map
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function maxStamp(witness: Witness): string | null {
  let latest = stampKey(witness.courseUpdatedAt)
  if (!latest) return null
  for (const lesson of witness.lessons) {
    const key = stampKey(lesson.updatedAt)
    if (!key) return null
    if (key > latest) latest = key
  }
  return latest
}
function witnessesMatch(a: Witness, b: Witness): boolean {
  if (a.courseId !== b.courseId || a.courseShortId !== b.courseShortId || a.ownerId !== b.ownerId
    || !uuid.test(a.courseId) || !uuid.test(a.ownerId)) return false
  const courseStamp = stampKey(a.courseUpdatedAt)
  if (!courseStamp || courseStamp !== stampKey(b.courseUpdatedAt)) return false
  const modulesA = uniqueBy(a.modules, x => x.id), modulesB = uniqueBy(b.modules, x => x.id)
  const lessonsA = uniqueBy(a.lessons, x => x.shortId), lessonsB = uniqueBy(b.lessons, x => x.shortId)
  const idsA = uniqueBy(a.lessons, x => x.id), idsB = uniqueBy(b.lessons, x => x.id)
  if (!modulesA || !modulesB || !lessonsA || !lessonsB || !idsA || !idsB
    || modulesA.size !== modulesB.size || lessonsA.size !== lessonsB.size) return false
  for (const [id, module] of modulesA) {
    const other = modulesB.get(id)
    if (!uuid.test(id) || !other || typeof module.label !== 'string' || !Number.isInteger(module.position) || module.label !== other.label || module.position !== other.position) return false
  }
  for (const [shortId, lesson] of lessonsA) {
    const other = lessonsB.get(shortId)
    if (!uuid.test(lesson.id) || !other || lesson.id !== other.id || lesson.moduleId !== other.moduleId
      || (lesson.moduleId !== null && !modulesA.has(lesson.moduleId))) return false
    const key = stampKey(lesson.updatedAt)
    if (!key || key !== stampKey(other.updatedAt)) return false
  }
  return maxStamp(a) !== null && maxStamp(a) === maxStamp(b)
}

/** Called immediately after successful heavy response, BEFORE UI merge.
 * The pure functions must use their arguments only, never course/latestCourse,
 * readDraft, ce-session, current selection, pending access or visibility state.
 */
export function captureConfirmedBaseline<Light, RawHeavy extends RawHeavyWitness, Clean, Serialized>(args: {
  metadata: MetadataRead<Light> | null
  heavy: HeavyRead<RawHeavy>
  activeToken: ReadToken | null
  currentScope: Scope
  recoveredDraft: boolean
  projectClean: (light: Light, heavy: readonly RawHeavy[]) => Clean
  serialize: (clean: Clean) => Serialized
}): ConfirmedBaseline<Serialized> | null {
  const { metadata, heavy, activeToken, currentScope } = args
  if (args.recoveredDraft || !metadata || metadata.origin !== 'network-metadata'
    || metadata.token !== activeToken || heavy.token !== activeToken
    || !sameScope(metadata.token.scope, currentScope)
    || metadata.token.courseShortId !== metadata.witness.courseShortId
    || metadata.token.scope.ownerId !== metadata.witness.ownerId
    || !witnessesMatch(metadata.witness, heavy.witness)) return null
  // The witness and content must come from the same unfiltered heavy rows.
  const contentWitness: Witness = { ...heavy.witness, lessons: heavy.rows.map(row => ({
    id: row.id, shortId: row.short_id, moduleId: row.module_id, updatedAt: row.updated_at,
  })) }
  if (!witnessesMatch(heavy.witness, contentWitness)) return null
  const sourceStamp = stampKey(metadata.sourceStamp)
  if (!sourceStamp || sourceStamp !== maxStamp(metadata.witness) || sourceStamp !== maxStamp(heavy.witness)) return null
  if (metadata.numberStart.included
    && stampKey(metadata.numberStart.readCourseUpdatedAt) !== stampKey(metadata.witness.courseUpdatedAt)) return null
  let serialized: Serialized
  try {
    const clean = args.projectClean(structuredClone(metadata.light), structuredClone(heavy.rows))
    serialized = structuredClone(args.serialize(clean))
  } catch { return null } // Optimization failure cannot block the safe UI/full-save path.
  return {
    source: 'matched-load', token: activeToken!, courseShortId: metadata.witness.courseShortId,
    courseId: metadata.witness.courseId, ownerId: metadata.witness.ownerId,
    stamp: metadata.sourceStamp, // Keep original provenance; do not adopt heavy's fresher stamp.
    serialized,
    lessons: structuredClone(metadata.witness.lessons), modules: structuredClone(metadata.witness.modules),
  }
}

/** Readiness at DISPATCH, not at hydration. baselineStamp may still be null
 * during heavy response; the existing source-stamp initialization runs later.
 * This function never writes it. Unknown/mixed stamps mean full-safe fallback.
 */
export function baselineCanDriveDelta(base: ConfirmedBaseline<unknown> | null, args: {
  courseShortId: string; baselineStamp: string | null; scope: Scope
}): boolean {
  const expected = stampKey(args.baselineStamp)
  return !!base && expected !== null && base.courseShortId === args.courseShortId
    && base.ownerId === args.scope.ownerId && sameScope(base.token.scope, args.scope)
    && expected === stampKey(base.stamp)
}
