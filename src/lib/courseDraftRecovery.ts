import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { stampKey, type ConfirmedBaseline } from './courseConfirmedBaseline'
import type { CourseContentSnapshot } from './courseContentDelta'

// Store the names of edited fields, not a second copy of lesson contents.
// Stable identities allow a server insertion or reorder while the tab is closed.
type Change = { set: true } | { fields: Record<string, Change> } | {
  items: Record<string, Change>; removed: string[]; order?: string[]
}
type Intent = { [key: string]: Change }
export type CourseDraft = CourseEdData & { editorRecovery?: { revision: number; intent?: Intent } }

const courseFields = ['title', 'subject', 'level', 'status', 'description', 'color', 'bg', 'seedStamp',
  'numberStart', 'groupIds', 'studentIds', 'accessChanges', 'lessons', 'modules'] as const
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const safe = (key: string) => !['__proto__', 'constructor', 'prototype'].includes(key)

function keyed(values: unknown[]): Map<string, unknown> | null {
  const map = new Map<string, unknown>()
  for (const value of values) {
    const id = typeof value === 'string' ? value : record(value) ? value.id : undefined
    if (typeof id !== 'string' || !id || !safe(id) || map.has(id)) return null
    map.set(id, value)
  }
  return map
}

function difference(a: unknown, b: unknown): Change | undefined {
  if (a === b) return
  if (record(a) && record(b)) {
    const fields: Intent = {}
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!safe(key)) continue
      const change = difference(a[key], b[key])
      if (change) fields[key] = change
    }
    if (Object.keys(fields).length) return { fields }
    return
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const before = keyed(a), after = keyed(b)
    if (before && after) {
      const items: Intent = {}
      for (const [id, item] of after) {
        const change = difference(before.get(id), item)
        if (change) items[id] = change
      }
      const removed = [...before.keys()].filter(id => !after.has(id))
      const order = [...after.keys()]
      const reordered = before.size !== after.size || [...before.keys()].some((id, i) => order[i] !== id)
      if (reordered || Object.keys(items).length) return { items, removed, ...(reordered ? { order } : {}) }
      return
    }
    if (JSON.stringify(a) === JSON.stringify(b)) return
  }
  return { set: true }
}

export function courseDraftIntent(source: CourseEdData, local: CourseEdData): Intent {
  const fields: Intent = {}
  for (const key of courseFields) {
    const change = difference(source[key], local[key])
    if (change) fields[key] = change
  }
  return fields
}

function overlay(remote: unknown, local: unknown, change: Change): unknown {
  if ('set' in change) return local
  if ('fields' in change) {
    if (!record(remote) || !record(local)) throw new Error('Edited object no longer exists')
    const out = { ...remote }
    for (const [key, child] of Object.entries(change.fields)) {
      if (!safe(key)) throw new Error('Invalid draft field')
      out[key] = overlay(remote[key], local[key], child)
    }
    return out
  }
  if (!Array.isArray(remote) || !Array.isArray(local)) throw new Error('Edited list no longer exists')
  const rows = keyed(remote), edits = keyed(local)
  if (!rows || !edits) throw new Error('Ambiguous draft identities')
  for (const id of change.removed) rows.delete(id)
  for (const [id, child] of Object.entries(change.items)) {
    if (!edits.has(id)) throw new Error('Missing draft item')
    rows.set(id, overlay(rows.get(id), edits.get(id), child))
  }
  const ids = new Set([...(change.order ?? []), ...rows.keys()])
  return [...ids].filter(id => rows.has(id)).map(id => rows.get(id))
}

export function applyCourseDraftIntent(fresh: CourseEdData, local: CourseEdData, intent: Intent): CourseEdData | null {
  try {
    const result = { ...fresh, serverStamp: local.serverStamp }
    for (const key of courseFields) {
      if (Object.prototype.hasOwnProperty.call(intent, key)) Object.assign(result, { [key]: overlay(fresh[key], local[key], intent[key]) })
    }
    return result
  } catch { return null }
}

export function openCourseRecovery(base: CourseDraft, stored: CourseDraft | null) {
  const draft = base.editorRecovery && (!stored?.editorRecovery || base.editorRecovery.revision >= stored.editorRecovery.revision)
    ? base : stored
  const selected = draft ?? base
  const { editorRecovery, ...course } = selected
  return {
    course: course.dbCourseId ? { ...course, metadataPending: true, heavyPending: true } : course,
    recoveredDraft: !!draft, editRevision: draft ? Math.max(1, editorRecovery?.revision ?? 1) : 0,
    recoveryIntent: draft ? editorRecovery?.intent : undefined, needsHeavyFill: !!selected.heavyPending,
  }
}

/** Before edit masks existed the old draft cannot distinguish its own changes
 * from a newer server lesson. Never allow a reviewed course-level overwrite to
 * change such a lesson, or to overwrite a concurrently changed module roster. */
export function isAmbiguousLegacyRecovery(base: ConfirmedBaseline<CourseContentSnapshot>, sourceStamp: string | undefined, local: CourseContentSnapshot | null) {
  if (!local) return true
  if (JSON.stringify(local.modules) !== JSON.stringify(base.serialized.modules)) return true
  const before = new Map(base.serialized.lessons.map(row => [row.short_id, row]))
  const after = new Map(local.lessons.map(row => [row.short_id, row]))
  if (before.size !== after.size || [...after.keys()].some(key => !before.has(key))) return true
  const original = stampKey(sourceStamp)
  return base.lessons.some(row => {
    const stamp = stampKey(row.updatedAt)
    return (!original || !stamp || stamp > original) && !!difference(before.get(row.shortId), after.get(row.shortId))
  })
}
