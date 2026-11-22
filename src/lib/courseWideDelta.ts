// EXTERNAL CANDIDATE. Intended integration location: src/lib/courseWideDelta.ts.
// No backend installation or authorization/rollout decision lives in this helper.
import type { CourseContentDelta, CourseContentSnapshot } from './courseContentDelta'
import type { ConfirmedBaseline, Scope } from './courseConfirmedBaseline'
import type { ExpectedContentRoster } from './courseContentAcknowledgement'

type Row = Record<string, unknown>
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonColumn = 'content' | 'homework' | 'materials'
export type JsonOp = Readonly<{ column: JsonColumn; path: readonly string[]; op: 'set'; value: JsonValue }
  | { column: JsonColumn; path: readonly string[]; op: 'remove'; explicit?: true }>
export type WideLessonPatch = Omit<CourseContentDelta['p_lesson_patches'][number], 'set'> & {
  set: Row; json_ops?: JsonOp[]
}
export type WideContentDelta = Omit<CourseContentDelta, 'p_lesson_patches'> & { p_lesson_patches: WideLessonPatch[] }
export type ExplicitBranchRemoval = Readonly<{ id: string; short_id: string; column: JsonColumn; path: readonly string[] }>
export type WideDeltaIntent = Readonly<{ explicitBranchRemovals?: readonly ExplicitBranchRemoval[] }>
type NarrowPlanner = (before: CourseContentSnapshot, after: CourseContentSnapshot, modules?: CourseContentSnapshot['modules']) => CourseContentDelta | null
type CorePrepare = (before: CourseContentSnapshot, after: CourseContentSnapshot) => CourseContentSnapshot
type CoreAdvance = (base: ConfirmedBaseline<CourseContentSnapshot> | null, canonical: CourseContentSnapshot | null,
  preserved: CourseContentSnapshot | null, ack: unknown, scope: Scope, expected: ExpectedContentRoster) => ConfirmedBaseline<CourseContentSnapshot> | null
type Predicate = (value: unknown) => boolean
interface Schema { children?: Record<string, Schema>; validate?: Predicate }
const own = (row: Row, key: string): boolean => Object.prototype.hasOwnProperty.call(row, key)
const record = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const nonnegative: Predicate = value => finite(value) && value >= 0
const list = (check: Predicate): Predicate => value => Array.isArray(value) && (value as unknown[]).every(check)
function wireJson(value: unknown): JsonValue {
  const encoded = JSON.stringify(value, (_key: string, item: unknown): unknown => {
    if ((typeof item === 'number' && !Number.isFinite(item)) || ['function', 'symbol', 'bigint'].includes(typeof item)) throw Error('Not finite JSON data')
    return item
  })
  if (encoded === undefined) throw Error('Missing JSON value')
  return JSON.parse(encoded) as JsonValue
}
export function wideJsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && (a as unknown[]).every((value, index) => wideJsonEqual(value, (b as unknown[])[index]))
  if (!record(a) || !record(b)) return false
  const keys = Object.keys(a).filter(key => a[key] !== undefined), other = Object.keys(b).filter(key => b[key] !== undefined)
  return keys.length === other.length && keys.every(key => own(b, key) && wideJsonEqual(a[key], b[key]))
}
// This error MUST retain the draft and stop dispatch. It is not an unsupported
// result: the old full serializer has the same lossy array replacement risk.
export class WideContentPreservationError extends Error {
  readonly code = 'ISKRA_DATA_PRESERVATION'
  constructor(detail: string) { super('ISKRA_DATA_PRESERVATION: ' + detail); this.name = 'WideContentPreservationError' }
}
function preservationBlock(detail: string): never { throw new WideContentPreservationError(detail) }
function stableId(value: unknown): string | null {
  if (!record(value)) return null
  const id = value.id
  return typeof id === 'string' && id.length > 0 ? 's:' + id : finite(id) ? 'n:' + id : null
}
// Staged scope: existing elements only, stable identity and order. Extra raw
// elements omitted by hydration remain untouched; no insertion/deletion intent
// is inferred from canonical arrays. Object keys unknown to UI survive at ANY
// depth. Nested scalar arrays may change values but cannot change their roster.
function mergeExisting(raw: unknown, before: unknown, after: unknown): unknown {
  if (wideJsonEqual(before, after)) return structuredClone(raw === undefined ? after : raw)
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after) || !Array.isArray(raw)) preservationBlock('array source/shape is not confirmed')
    if (before.length !== after.length) preservationBlock('array insertion/deletion requires explicit intent')
    if (before.every(item => !record(item) && !Array.isArray(item)) && after.every(item => !record(item) && !Array.isArray(item))) {
      if (!wideJsonEqual(raw, before)) preservationBlock('scalar array source differs from confirmed projection')
      return structuredClone(after)
    }
    const ids = (items: unknown[]): string[] => {
      const result = items.map(stableId)
      if (result.some(id => id === null) || new Set(result).size !== result.length) preservationBlock('missing/duplicate stable array IDs')
      return result as string[]
    }
    const oldIds = ids(before), nextIds = ids(after), rawIds = ids(raw)
    if (!wideJsonEqual(oldIds, nextIds)) preservationBlock('array identity/reorder requires explicit intent')
    if (!oldIds.every(id => rawIds.includes(id))) preservationBlock('raw array identity mismatch')
    const oldById = new Map(oldIds.map((id, i) => [id, before[i]])), nextById = new Map(nextIds.map((id, i) => [id, after[i]]))
    return raw.map((item, i) => oldById.has(rawIds[i]) ? mergeExisting(item, oldById.get(rawIds[i]), nextById.get(rawIds[i])) : structuredClone(item))
  }
  if (record(before) && record(after)) {
    if (!record(raw)) preservationBlock('object source is not confirmed')
    const merged: Row = structuredClone(raw)
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (wideJsonEqual(before[key], after[key])) continue
      if (!own(after, key) || after[key] === undefined) preservationBlock('object-key removal requires explicit intent')
      if (key === 'id') preservationBlock('stable identity cannot change')
      put(merged, key, mergeExisting(raw[key], before[key], after[key]))
    }
    return merged
  }
  if (Array.isArray(raw) || record(raw) || record(before) || record(after)) preservationBlock('object replacement is outside staged text edits')
  return structuredClone(after)
}
function pathValue(row: Row, column: string, path: readonly string[]): unknown {
  let value: unknown = row[column]
  for (const key of path) { if (!record(value)) return undefined; value = value[key] }
  return value
}
const jsonRecord: Predicate = value => { if (!record(value)) return false; try { wireJson(value); return true } catch { return false } }
const task: Predicate = value => jsonRecord(value) && record(value) && (!own(value, 'id') || text(value.id) || finite(value.id))
const paragraph: Predicate = value => jsonRecord(value) && record(value) && text(value.id) && text(value.text)
const selfCheck: Predicate = value => jsonRecord(value) && record(value) && text(value.id) && text(value.q) && text(value.answer)
  && (!own(value, 'options') || list(text)(value.options)) && (!own(value, 'at') || nonnegative(value.at))
const segment: Predicate = value => jsonRecord(value) && record(value) && finite(value.start) && value.start >= 0
  && finite(value.end) && value.end > value.start && text(value.text) && !!value.text.trim()
  && (!own(value, 'speaker') || text(value.speaker))
const speaker: Predicate = value => jsonRecord(value) && record(value) && text(value.id) && text(value.label)
  && ['teacher', 'student'].includes(String(value.role)) && text(value.tone)
const file: Predicate = value => jsonRecord(value) && record(value) && text(value.path) && !!value.path
  && (!own(value, 'size') || nonnegative(value.size))
const leaf = (validate: Predicate): Schema => ({ validate })
const branch = (children: Record<string, Schema>): Schema => ({ children })
const materialFile = branch({ id: leaf(text), name: leaf(text), path: leaf(value => text(value) && !!value), size: leaf(nonnegative),
  mime: leaf(text), url: leaf(text), r2: leaf(value => typeof value === 'boolean') })
// Minimal scope: montage edits stay on the existing guarded path. Its raw
// unknown siblings survive ordinary transcript flag/source/segments edits.
const schema: Record<JsonColumn, Schema> = {
  homework: branch({ hwTasks: leaf(list(task)), recHwTasks: leaf(list(task)), extraHw: leaf(list(jsonRecord)) }),
  content: branch({ paragraphs: leaf(list(paragraph)), selfCheck: leaf(list(selfCheck)),
    transcript: branch({ source: leaf(value => text(value) && !!value), segments: leaf(value => list(segment)(value) && Array.isArray(value) && value.length > 0),
      forStudents: leaf(value => typeof value === 'boolean'), speakers: leaf(list(speaker)) }) }),
  materials: branch({ workbook: materialFile, notebook: materialFile, materials: leaf(list(file)) }),
}
const rootValidators: Record<string, Predicate> = { youtube_url: value => value === null || text(value), test_tasks: list(task) }
const columns: readonly JsonColumn[] = ['content', 'homework', 'materials']
function descriptor(column: unknown, path: unknown): Schema | null {
  if (typeof column !== 'string' || !columns.includes(column as JsonColumn) || !Array.isArray(path)
    || path.length < 1 || path.length > 2 || !(path as unknown[]).every(text)) return null
  let node: Schema = schema[column as JsonColumn]
  for (const key of path as string[]) { if (!node.children || !own(node.children, key)) return null; node = node.children[key] }
  return node
}
export function isWideJsonOp(value: unknown): value is JsonOp {
  if (!record(value) || Object.keys(value).some(key => !['column', 'path', 'op', 'value', 'explicit'].includes(key))) return false
  const node = descriptor(value.column, value.path)
  if (!node) return false
  if (value.op === 'remove') return !own(value, 'value') && (node.children ? value.explicit === true : !own(value, 'explicit'))
  if (value.op !== 'set' || own(value, 'explicit') || node.children || !node.validate || !own(value, 'value')) return false
  try { return node.validate(value.value) && wireJson(value.value) !== undefined } catch { return false }
}
export function validWideJsonOps(value: unknown): value is JsonOp[] {
  if (!Array.isArray(value) || !(value as unknown[]).every(isWideJsonOp)) return false
  const ops = value as JsonOp[]
  return !ops.some((a, index) => ops.slice(index + 1).some(b => a.column === b.column
    && (a.path.every((key, i) => b.path[i] === key) || b.path.every((key, i) => a.path[i] === key))))
}
function put(target: Row, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value: structuredClone(value), enumerable: true, writable: true, configurable: true })
}
function mask(target: Row, previous: Row, key: string): void {
  if (own(previous, key) && previous[key] !== undefined) put(target, key, previous[key]); else delete target[key]
}
function emit(before: unknown, after: unknown, node: Schema, column: JsonColumn, path: readonly string[], ops: JsonOp[], explicit: boolean): boolean {
  if (wideJsonEqual(before, after)) return true
  if (after === undefined || (after === null && node.children)) {
    if (Array.isArray(before)) preservationBlock('array removal requires explicit intent')
    if (node.children && !explicit) preservationBlock('branch removal requires explicit intent')
    ops.push({ column, path, op: 'remove', ...(node.children ? { explicit: true as const } : {}) }); return true
  }
  if (!node.children) {
    if (!node.validate || !node.validate(after)) return false
    ops.push({ column, path, op: 'set', value: wireJson(after) }); return true
  }
  if (!record(after) || (before !== undefined && before !== null && !record(before))) return false
  const old = record(before) ? before : {}
  for (const key of new Set([...Object.keys(old), ...Object.keys(after)])) {
    if (wideJsonEqual(old[key], after[key])) continue
    if (!own(node.children, key) || !emit(old[key], after[key], node.children[key], column, [...path, key], ops, false)) return false
  }
  return true
}
function coherent(row: Row): boolean {
  const content = record(row.content) ? row.content : {}, transcript = content.transcript
  if (transcript !== undefined && transcript !== null && (!record(transcript) || !text(transcript.source)
    || transcript.source !== String(row.youtube_url ?? '').trim() || !list(segment)(transcript.segments)
    || !Array.isArray(transcript.segments) || transcript.segments.length === 0)) return false
  const materials = record(row.materials) ? row.materials : {}
  return ['workbook', 'notebook'].every(key => materials[key] === undefined || materials[key] === null || file(materials[key]))
}
export function createWideContentDelta(narrow: NarrowPlanner) {
  return (before: CourseContentSnapshot, after: CourseContentSnapshot, expected = before.modules, intent: WideDeltaIntent = {}): WideContentDelta | null => {
    try {
      const masked: CourseContentSnapshot = { ...after, lessons: after.lessons.map(row => ({ ...row,
        homework: record(row.homework) ? { ...row.homework } : row.homework, content: record(row.content) ? { ...row.content } : row.content,
        materials: record(row.materials) ? { ...row.materials } : row.materials })) }
      const oldRows = new Map(before.lessons.map(row => [row.short_id, row])), current = new Map(after.lessons.map(row => [row.short_id, row]))
      const extras = new Map<string, { set: Row; json_ops: JsonOp[] }>()
      for (const row of masked.lessons) {
        const old = oldRows.get(row.short_id), original = current.get(row.short_id)
        if (!old || !original || old.id !== row.id) return null
        const extra: { set: Row; json_ops: JsonOp[] } = { set: {}, json_ops: [] }
        const raw = before.rawLessons?.[row.short_id]
        if (!raw) preservationBlock('raw confirmed source is missing')
        for (const [key, validate] of Object.entries(rootValidators)) {
          if (!wideJsonEqual(old[key], original[key])) { if (!own(original, key) || !validate(original[key])) return null; put(extra.set, key, key === 'test_tasks' ? wireJson(mergeExisting(raw[key], old[key], original[key])) : wireJson(original[key])) }
          if (own(old, key) || own(original, key)) mask(row, old, key)
        }
        for (const column of columns) {
          const previous = old[column], value = original[column], target = row[column], children = schema[column].children!
          if (!record(previous) || !record(value) || !record(target)) return null
          for (const key of new Set([...Object.keys(previous), ...Object.keys(value)])) {
            if (!own(children, key)) continue
            const explicit = !!intent.explicitBranchRemovals?.some(removal => removal.id === row.id && removal.short_id === row.short_id
              && removal.column === column && wideJsonEqual(removal.path, [key]))
            if (!emit(previous[key], value[key], children[key], column, [key], extra.json_ops, explicit)) preservationBlock('unsupported nested content cannot use lossy full fallback')
            mask(target, previous, key)
          }
        }
        for (const [index, op] of extra.json_ops.entries()) {
          if (op.op === 'set' && Array.isArray(op.value)) {
            extra.json_ops[index] = { ...op, value: wireJson(mergeExisting(pathValue(raw, op.column, op.path), pathValue(old, op.column, op.path), op.value)) }
          }
          // Changing an existing file's identity is replacement, not rename.
          if (op.column === 'materials' && op.path.length === 2 && ['id', 'path'].includes(op.path[1])) {
            const prior = pathValue(old, op.column, [op.path[0]])
            if (prior !== null && prior !== undefined) preservationBlock('file replacement requires explicit intent')
          }
        }
        if (!validWideJsonOps(extra.json_ops) || !coherent(original)) return null
        extras.set(row.short_id, extra)
      }
      const result = narrow(before, masked, expected) as WideContentDelta | null
      if (!result) {
        if ([...extras.values()].some(extra => extra.json_ops.length || own(extra.set, 'test_tasks'))) preservationBlock('mixed structural/body edit requires preserved full-path integration')
        return null
      }
      for (const row of after.lessons) {
        const extra = extras.get(row.short_id)!
        if (!Object.keys(extra.set).length && !extra.json_ops.length) continue
        let patch = result.p_lesson_patches.find(value => value.short_id === row.short_id)
        if (!patch) { patch = { id: row.id, short_id: row.short_id, set: {}, homework_set: {}, content_set: {} }; result.p_lesson_patches.push(patch) }
        Object.assign(patch.set, extra.set)
        if (extra.json_ops.length) patch.json_ops = extra.json_ops.sort((a, b) => (a.column + '/' + a.path.join('/')).localeCompare(b.column + '/' + b.path.join('/')))
      }
      return structuredClone(result)
    } catch (error) { if (error instanceof WideContentPreservationError) throw error; return null }
  }
}
export function applyWideJsonOps(raw: Row, ops: readonly JsonOp[]): Row {
  if (!validWideJsonOps(ops)) throw Error('Invalid wide JSON path/type/overlap')
  const result = structuredClone(raw)
  for (const op of ops) {
    let value = result[op.column]
    if ((value === undefined || value === null) && op.op === 'remove') continue
    if (value === undefined || value === null) value = {}
    if (!record(value)) throw Error('ISKRA_DATA_PRESERVATION: non-object JSON column')
    put(result, op.column, value)
    let parent = result[op.column] as Row, missing = false
    for (const key of op.path.slice(0, -1)) {
      const child = parent[key]
      if ((child === undefined || child === null) && op.op === 'remove') { missing = true; break }
      if (child === undefined || child === null) { put(parent, key, {}); parent = parent[key] as Row }
      else if (!record(child)) throw Error('ISKRA_DATA_PRESERVATION: non-object JSON parent')
      else parent = child
    }
    if (missing) continue
    const key = op.path[op.path.length - 1]
    if (op.op === 'remove') delete parent[key]; else put(parent, key, op.value)
  }
  return result
}
export function prepareWideConfirmedSnapshot(before: CourseContentSnapshot, current: CourseContentSnapshot, delta: WideContentDelta, core: CorePrepare): CourseContentSnapshot {
  const result = core(before, current), oldRows = new Map(before.lessons.map(row => [row.short_id, row]))
  for (const patch of delta.p_lesson_patches) {
    if (!patch.json_ops?.length && !own(patch.set, 'test_tasks')) continue
    const row = result.lessons.find(value => value.short_id === patch.short_id), old = oldRows.get(patch.short_id)
    if (!row || !old) throw Error('Unknown wide lesson identity')
    const raw = before.rawLessons?.[patch.short_id] ?? old
    if (own(patch.set, 'test_tasks')) put(row, 'test_tasks', patch.set.test_tasks)
    for (const column of new Set((patch.json_ops ?? []).map(op => op.column))) {
      let value = own(raw, column) ? structuredClone(raw[column]) : structuredClone(old[column])
      const narrow: Row = column === 'content' ? patch.content_set : column === 'homework' ? patch.homework_set : {}
      if (Object.keys(narrow).length) {
        if (value === null || value === undefined) value = {}
        if (!record(value)) throw Error('ISKRA_DATA_PRESERVATION: non-object raw JSON')
        for (const [key, item] of Object.entries(narrow)) put(value, key, item)
      } else if (value !== null && value !== undefined && !record(value)) throw Error('ISKRA_DATA_PRESERVATION: non-object raw JSON')
      if (value === undefined) delete row[column]; else put(row, column, value)
    }
    Object.assign(row, applyWideJsonOps(row, patch.json_ops ?? []))
    if (!coherent(row)) throw Error('Unsupported final transcript/source/file')
  }
  return structuredClone(result)
}
export function createWideContentAcknowledgement(core: CoreAdvance) {
  return (base: ConfirmedBaseline<CourseContentSnapshot> | null, canonical: CourseContentSnapshot, preserved: CourseContentSnapshot,
    acknowledgement: unknown, scope: Scope, expected: ExpectedContentRoster, delta: WideContentDelta): ConfirmedBaseline<CourseContentSnapshot> | null => {
    try {
      if (!record(acknowledgement) || !Array.isArray(acknowledgement.applied_lesson_patches)) return null
      const sanitized = structuredClone(acknowledgement), echoes: Row[] = []
      const sent = new Map(delta.p_lesson_patches.map(patch => [patch.short_id, patch])), seen = new Set<string>()
      for (const candidate of acknowledgement.applied_lesson_patches as unknown[]) {
        if (!record(candidate) || !text(candidate.short_id) || !record(candidate.set)) return null
        const request = sent.get(candidate.short_id)
        if (!request || candidate.id !== request.id || seen.has(candidate.short_id)) return null
        seen.add(candidate.short_id)
        const echo = structuredClone(candidate), set = echo.set as Row
        for (const [key, validate] of Object.entries(rootValidators)) {
          if (own(candidate.set, key) && (!own(request.set, key) || !validate(candidate.set[key]) || !wideJsonEqual(candidate.set[key], request.set[key]))) return null
          if (own(request.set, key) && !own(candidate.set, key)) return null
          delete set[key]
        }
        const expectedOps = request.json_ops ?? [], actualOps = candidate.json_ops ?? []
        if (!validWideJsonOps(actualOps) || expectedOps.length !== actualOps.length) return null
        for (const op of expectedOps) {
          const actual = actualOps.find(value => value.column === op.column && wideJsonEqual(value.path, op.path))
          if (!actual || actual.op !== op.op || !wideJsonEqual(actual, op)) return null
        }
        delete echo.json_ops
        echoes.push(echo)
      }
      for (const [ref, patch] of sent) if ((patch.json_ops?.length || Object.keys(patch.set).some(key => own(rootValidators, key))) && !seen.has(ref)) return null
      sanitized.applied_lesson_patches = echoes.filter(echo => [echo.set, echo.homework_set, echo.content_set].some(value => record(value) && Object.keys(value).length > 0))
      const result = core(base, canonical, preserved, sanitized, scope, expected)
      if (!result?.serialized.rawLessons) return null
      for (const candidate of acknowledgement.applied_lesson_patches as unknown[]) {
        if (!record(candidate) || !text(candidate.short_id) || !record(candidate.set)) return null
        let raw = result.serialized.rawLessons[candidate.short_id]
        if (!raw) return null
        for (const key of Object.keys(rootValidators)) if (own(candidate.set, key)) put(raw, key, candidate.set[key])
        if (candidate.json_ops !== undefined) { if (!validWideJsonOps(candidate.json_ops)) return null; raw = applyWideJsonOps(raw, candidate.json_ops) }
        result.serialized.rawLessons[candidate.short_id] = raw
      }
      return result
    } catch { return null }
  }
}
