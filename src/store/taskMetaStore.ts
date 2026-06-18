import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Teacher-managed options for the task editor dropdowns (Раздел / Тема / Источник).
// We never mutate the built-in constants — instead we layer per-scope `added`
// (extra options the teacher created) and `removed` (built-ins they hid) on top.
// Scope keys keep contexts apart, e.g. "section:Химия", "topic:Химия|Клетка",
// "source". The helper `mergeOptions` applies both layers to a base list.

interface MetaState {
  added: Record<string, string[]>
  removed: Record<string, string[]>
  addOption: (scope: string, label: string) => void
  removeOption: (scope: string, label: string) => void
}

export const useTaskMeta = create<MetaState>()(
  persist(
    (set) => ({
      added: {},
      removed: {},
      addOption: (scope, label) =>
        set((s) => {
          const v = label.trim()
          if (!v) return s
          const cur = s.added[scope] ?? []
          if (cur.includes(v)) return s
          // Un-hide if it was a removed built-in being re-added.
          const rem = (s.removed[scope] ?? []).filter((x) => x !== v)
          return {
            added: { ...s.added, [scope]: [...cur, v] },
            removed: { ...s.removed, [scope]: rem },
          }
        }),
      removeOption: (scope, label) =>
        set((s) => {
          const v = label.trim()
          const added = (s.added[scope] ?? []).filter((x) => x !== v)
          const rem = s.removed[scope] ?? []
          return {
            added: { ...s.added, [scope]: added },
            removed: rem.includes(v) ? s.removed : { ...s.removed, [scope]: [...rem, v] },
          }
        }),
    }),
    { name: 'task-meta-options', storage: createJSONStorage(() => localStorage) }
  )
)

// ── Canonical scope keys (shared by the editor, every filter panel, and the
// student trainer so a teacher-added option surfaces everywhere) ─────────────
// `subj` is the data Subject ('biology' | 'chemistry'); '' means "both".
export const SOURCE_SCOPE = 'source'
export const sectionScope = (subj: string) => `section:${subj}`
export const topicScope = (subj: string, section: string) => `topic:${subj}|${section || '∅'}`

type MetaLayers = Pick<MetaState, 'added' | 'removed'>

/** Apply teacher edits (one or more scopes) to a base option list. */
export function mergeOptions(base: string[], scope: string | string[], state: MetaLayers): string[] {
  const scopes = Array.isArray(scope) ? scope : [scope]
  const removed = new Set(scopes.flatMap((s) => state.removed[s] ?? []))
  const out = base.filter((o) => !removed.has(o))
  for (const s of scopes) for (const a of state.added[s] ?? []) if (!out.includes(a)) out.push(a)
  return out
}

/** Hook: returns a stable merger `(base, scope) => merged` subscribed to edits. */
export function useOptionMerger() {
  const added = useTaskMeta((s) => s.added)
  const removed = useTaskMeta((s) => s.removed)
  return (base: string[], scope: string | string[]) => mergeOptions(base, scope, { added, removed })
}
