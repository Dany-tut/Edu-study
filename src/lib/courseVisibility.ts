import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

import type { CourseItemKind, CourseVisibilityRow } from './courseVisibilityModel'
export type { CourseItemKind, CourseVisibilityRow } from './courseVisibilityModel'
type Snapshot = { values: Record<string, boolean>; pending: Record<string, boolean>; loaded: boolean; error: string | null; revision: number }
const states = new Map<string, Snapshot>()
const listeners = new Set<() => void>()
const flights = new Map<string, Promise<void>>()
const mutations = new Map<string, Promise<void>>()
const keyOf = (kind: CourseItemKind, item: string) => `${kind}:${item}`
const storageKey = (course: string) => `iskra:course-visibility-draft:${course}`
function snapshot(course: string): Snapshot {
  let value = states.get(course)
  if (!value) {
    let pending: Record<string, boolean> = {}
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(course)) || '{}')
      if (saved && !Array.isArray(saved) && typeof saved === 'object') pending = Object.fromEntries(
        Object.entries(saved).filter(([key, value]) => /^(module|lesson):.{1,160}$/.test(key) && typeof value === 'boolean'),
      ) as Record<string, boolean>
    } catch { /* in-memory draft */ }
    value = { values: { ...pending }, pending, loaded: false, error: null, revision: 0 }
    states.set(course, value)
  }
  return value
}
function publish(course: string, next: Snapshot) {
  states.set(course, next)
  try {
    if (Object.keys(next.pending).length) localStorage.setItem(storageKey(course), JSON.stringify(next.pending))
    else localStorage.removeItem(storageKey(course))
  } catch { /* Keep the draft in memory. */ }
  listeners.forEach(fn => fn())
}
export function loadCourseVisibility(course: string): Promise<void> {
  const running = flights.get(course)
  if (running) return running
  const revision = snapshot(course).revision
  const request = (async () => {
    const { data, error } = await supabase.rpc('get_course_item_visibility', { p_course: course })
    const current = snapshot(course)
    // A read started before a click cannot undo the confirmed click.
    if (current.revision !== revision) return
    if (error) {
      publish(course, { ...current, loaded: true, error: 'Не удалось загрузить видимость. Повторите загрузку.' })
      return
    }
    const values = Object.fromEntries(((data ?? []) as CourseVisibilityRow[]).map(r => [keyOf(r.item_kind, r.item_key), r.hidden]))
    publish(course, { ...current, values: { ...values, ...current.pending }, loaded: true, error: null })
  })().catch(() => {
    const current = snapshot(course)
    if (current.revision === revision) publish(course, { ...current, loaded: true, error: 'Не удалось загрузить видимость. Повторите загрузку.' })
  }).finally(() => flights.delete(course))
  flights.set(course, request)
  return request
}
export function useCourseVisibility(course: string) {
  const state = useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => snapshot(course))
  useEffect(() => { void loadCourseVisibility(course) }, [course])
  return { ...state, hidden: (kind: CourseItemKind, item: string) => state.values[keyOf(kind, item)] === true }
}
export async function setCourseItemHidden(course: string, kind: CourseItemKind, item: string, hidden: boolean, allowDraft: boolean) {
  const mutationKey = `${course}/${keyOf(kind, item)}`
  const operation = (mutations.get(mutationKey) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const { data, error } = await supabase.rpc('set_course_item_visibility', { p_course: course, p_kind: kind, p_item: item, p_hidden: hidden })
    if (error || (!data && !allowDraft)) throw new Error('Не удалось сохранить видимость. Попробуйте ещё раз.')
    const old = snapshot(course), key = keyOf(kind, item)
    const pending = { ...old.pending }
    if (data) delete pending[key]
    else pending[key] = hidden
    publish(course, { ...old, values: { ...old.values, [key]: hidden }, pending, revision: old.revision + 1 })
  }).catch(() => { throw new Error('Не удалось сохранить видимость. Попробуйте ещё раз.') })
  mutations.set(mutationKey, operation)
  try { await operation } finally { if (mutations.get(mutationKey) === operation) mutations.delete(mutationKey) }
}

/** Called after the course row exists, before new modules/lessons are exposed.
 * Re-key only local module identities; content saves never overwrite visibility. */
export async function flushCourseVisibility(course: string, aliases: Record<string, string>) {
  await Promise.all([...mutations].filter(([key]) => key.startsWith(`${course}/`)).map(([, promise]) => promise))
  const state = snapshot(course)
  const edits = new Map<string, { source: string; value: boolean }>()
  const clearPending = (source: string, value: boolean) => {
    const current = snapshot(course), pending = { ...current.pending }
    if (pending[source] === value) delete pending[source]
    publish(course, { ...current, pending })
  }
  for (const [source, value] of Object.entries(state.pending)) {
    const split = source.indexOf(':'), kind = source.slice(0, split) as CourseItemKind
    const item = source.slice(split + 1), target = keyOf(kind, kind === 'module' ? aliases[item] ?? item : item)
    // An explicit click on the acknowledged identity is newer than a local-ID
    // draft. A queued content save must never restore that old visibility.
    if (source !== target && state.values[target] !== undefined) clearPending(source, value)
    else edits.set(target, { source, value })
  }
  for (const [local, persisted] of Object.entries(aliases)) {
    const source = keyOf('module', local), target = keyOf('module', persisted)
    const value = state.values[source]
    if (source !== target && value !== undefined && state.values[target] === undefined && !edits.has(target)) edits.set(target, { source, value })
  }
  for (const [target, { source, value }] of edits) {
    if (source !== target && snapshot(course).values[target] !== undefined) { clearPending(source, value); continue }
    const split = target.indexOf(':')
    await setCourseItemHidden(course, target.slice(0, split) as CourseItemKind, target.slice(split + 1), value, false)
    clearPending(source, value)
  }
}
