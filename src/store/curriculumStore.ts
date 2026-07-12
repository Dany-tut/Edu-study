import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import {
  type Subject, type SubjectCurriculum,
  getStaticCurriculum, setRuntimeCurriculum,
} from '../data/taskBankData'

// ── Editable curriculum taxonomy ─────────────────────────────────────────────
// The single source of truth behind every trainer filter. Seeded from the
// static ЕГЭ maps in taskBankData, fully editable in the teacher "Банк заданий"
// tab, and persisted to Supabase (`public.curriculum`, one jsonb row per
// subject). A `lines` array carries each line's number, name, owning section
// and exam part; lineNames + sectionLineMap are derived from it and pushed into
// the runtime registry so the cascade helpers (and both trainers) read the live
// taxonomy. Loaded once per session; teacher edits upsert back (debounced).

export type CurriculumLine = { n: number; name: string; section: string; part: 1 | 2 }
export type SubjectData = { sections: string[]; topics: Record<string, string[]>; lines: CurriculumLine[] }

const CATCH_ALL = 'Задания части 2'

// Build the editable line list from the static section→line map.
function seedSubject(subject: Subject): SubjectData {
  const stat = getStaticCurriculum(subject)
  const sections = [...stat.sections]
  // Assign each line to one owning section (specific sections before the catch-all).
  const owner: Record<number, { section: string; part: 1 | 2 }> = {}
  const ordered = [...sections.filter(s => s !== CATCH_ALL), ...sections.filter(s => s === CATCH_ALL)]
  for (const sec of ordered) {
    const m = stat.sectionLineMap[sec]
    if (!m) continue
    for (const n of m.lines) if (!owner[n]) owner[n] = { section: sec, part: 1 }
    for (const n of m.part2Lines) if (!owner[n]) owner[n] = { section: sec, part: 2 }
  }
  const lines: CurriculumLine[] = Object.keys(stat.lineNames).map(Number).sort((a, b) => a - b).map(n => ({
    n, name: stat.lineNames[n],
    section: owner[n]?.section ?? sections[0],
    part: owner[n]?.part ?? 1,
  }))
  const topics: Record<string, string[]> = {}
  for (const s of sections) topics[s] = [...(stat.topics[s] ?? [])]
  return { sections, topics, lines }
}

const seed = (): Record<Subject, SubjectData> => ({
  biology: seedSubject('biology'),
  chemistry: seedSubject('chemistry'),
})

// Derive the runtime SubjectCurriculum (lineNames + sectionLineMap) from editable data.
function derive(d: SubjectData): SubjectCurriculum {
  const lineNames: Record<number, string> = {}
  const sectionLineMap: Record<string, { lines: number[]; part2Lines: number[] }> = {}
  for (const s of d.sections) sectionLineMap[s] = { lines: [], part2Lines: [] }
  for (const l of [...d.lines].sort((a, b) => a.n - b.n)) {
    lineNames[l.n] = l.name
    if (!sectionLineMap[l.section]) sectionLineMap[l.section] = { lines: [], part2Lines: [] }
    if (l.part === 2) sectionLineMap[l.section].part2Lines.push(l.n)
    else sectionLineMap[l.section].lines.push(l.n)
  }
  return { sections: d.sections, topics: d.topics, lineNames, sectionLineMap }
}

function syncRuntime(data: Record<Subject, SubjectData>) {
  setRuntimeCurriculum('biology', derive(data.biology))
  setRuntimeCurriculum('chemistry', derive(data.chemistry))
}

// ── Supabase persistence ─────────────────────────────────────────────────────
// One row per subject: { subject, data: jsonb }. Writes are debounced per
// subject so typing a line name doesn't fire a request per keystroke.
const saveTimers: Partial<Record<Subject, ReturnType<typeof setTimeout>>> = {}
function persistSubject(subject: Subject, data: SubjectData) {
  if (saveTimers[subject]) clearTimeout(saveTimers[subject])
  useCurriculum.setState({ saveState: 'saving' })
  saveTimers[subject] = setTimeout(() => {
    supabase.from('curriculum')
      .upsert({ subject, data, updated_at: new Date().toISOString() }, { onConflict: 'subject' })
      .then(({ error }) => {
        if (error) { console.error('[curriculum] save failed', error); useCurriculum.setState({ saveState: 'error' }) }
        else useCurriculum.setState({ saveState: 'saved' })
      })
  }, 600)
}

interface CurriculumState {
  data: Record<Subject, SubjectData>
  version: number
  loaded: boolean
  loading: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  load: () => Promise<void>
  addSection: (subject: Subject, name: string) => void
  renameSection: (subject: Subject, oldName: string, name: string) => void
  removeSection: (subject: Subject, name: string) => void
  addTopic: (subject: Subject, section: string, name: string) => void
  renameTopic: (subject: Subject, section: string, oldName: string, name: string) => void
  removeTopic: (subject: Subject, section: string, name: string) => void
  addLine: (subject: Subject, section: string, part: 1 | 2) => void
  updateLine: (subject: Subject, n: number, patch: Partial<CurriculumLine>) => void
  removeLine: (subject: Subject, n: number) => void
  resetSubject: (subject: Subject) => void
}

// Immutably update one subject's data, re-sync the runtime registry, bump
// version, and persist the changed subject to Supabase (debounced).
function commit(
  set: (fn: (s: CurriculumState) => Partial<CurriculumState>) => void,
  subject: Subject,
  fn: (d: SubjectData) => SubjectData,
) {
  set(s => {
    const updated = fn(s.data[subject])
    if (updated === s.data[subject]) return s // no-op guard (e.g. duplicate name)
    const next = { ...s.data, [subject]: updated }
    syncRuntime(next)
    persistSubject(subject, updated)
    return { data: next, version: s.version + 1 }
  })
}

export const useCurriculum = create<CurriculumState>()(
    (set, get) => ({
      data: seed(),
      version: 0,
      loaded: false,
      loading: false,
      saveState: 'idle',

      // Load the taxonomy from Supabase once. If the table is empty, seed it
      // from the static ЕГЭ defaults so the very first teacher starts from a
      // complete structure.
      load: async () => {
        if (get().loaded || get().loading) return
        set({ loading: true })
        const { data, error } = await supabase.from('curriculum').select('subject, data')
        if (error) { console.error('[curriculum] load failed', error); set({ loading: false }); return }
        if (data && data.length) {
          set(s => {
            const next = { ...s.data }
            for (const row of data as { subject: Subject; data: SubjectData }[]) {
              if (row.subject === 'biology' || row.subject === 'chemistry') next[row.subject] = row.data
            }
            syncRuntime(next)
            return { data: next, version: s.version + 1, loaded: true, loading: false }
          })
        } else {
          const seeded = seed()
          syncRuntime(seeded)
          set({ data: seeded, loaded: true, loading: false, version: get().version + 1 })
          await supabase.from('curriculum').upsert([
            { subject: 'biology', data: seeded.biology },
            { subject: 'chemistry', data: seeded.chemistry },
          ], { onConflict: 'subject' })
        }
      },

      addSection: (subject, name) => commit(set, subject, d => {
        const v = name.trim()
        if (!v || d.sections.includes(v)) return d
        return { ...d, sections: [...d.sections, v], topics: { ...d.topics, [v]: [] } }
      }),
      renameSection: (subject, oldName, name) => commit(set, subject, d => {
        const v = name.trim()
        if (!v || v === oldName || d.sections.includes(v)) return d
        const topics = { ...d.topics }; topics[v] = topics[oldName] ?? []; delete topics[oldName]
        return {
          sections: d.sections.map(s => s === oldName ? v : s),
          topics,
          lines: d.lines.map(l => l.section === oldName ? { ...l, section: v } : l),
        }
      }),
      removeSection: (subject, name) => commit(set, subject, d => {
        const topics = { ...d.topics }; delete topics[name]
        return {
          sections: d.sections.filter(s => s !== name),
          topics,
          lines: d.lines.filter(l => l.section !== name),
        }
      }),

      addTopic: (subject, section, name) => commit(set, subject, d => {
        const v = name.trim()
        const cur = d.topics[section] ?? []
        if (!v || cur.includes(v)) return d
        return { ...d, topics: { ...d.topics, [section]: [...cur, v] } }
      }),
      renameTopic: (subject, section, oldName, name) => commit(set, subject, d => {
        const v = name.trim()
        const cur = d.topics[section] ?? []
        if (!v || v === oldName || cur.includes(v)) return d
        return { ...d, topics: { ...d.topics, [section]: cur.map(t => t === oldName ? v : t) } }
      }),
      removeTopic: (subject, section, name) => commit(set, subject, d => ({
        ...d, topics: { ...d.topics, [section]: (d.topics[section] ?? []).filter(t => t !== name) },
      })),

      addLine: (subject, section, part) => commit(set, subject, d => {
        const nextN = d.lines.reduce((m, l) => Math.max(m, l.n), 0) + 1
        return { ...d, lines: [...d.lines, { n: nextN, name: `${t('Линия')} ${nextN}`, section, part }] }
      }),
      updateLine: (subject, n, patch) => commit(set, subject, d => {
        // Block collisions when changing the line number.
        if (patch.n != null && patch.n !== n && d.lines.some(l => l.n === patch.n)) return d
        return { ...d, lines: d.lines.map(l => l.n === n ? { ...l, ...patch } : l) }
      }),
      removeLine: (subject, n) => commit(set, subject, d => ({
        ...d, lines: d.lines.filter(l => l.n !== n),
      })),

      resetSubject: (subject) => commit(set, subject, () => seedSubject(subject)),
    })
)

// Push the static seed into the runtime registry on import so helpers are
// correct before the DB load resolves, then kick off the load from Supabase.
syncRuntime(useCurriculum.getState().data)
void useCurriculum.getState().load()
