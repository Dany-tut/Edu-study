import type { Group } from '../data/teacherMockData'

// A 1:1 student may study several subjects — each subject is its OWN individual
// group (see [[reference-group-tracks]]). These helpers merge those sibling
// groups back into a single "person" for display, keyed by name within the
// current teacher's already-owner-scoped data (same heuristic as the roster's
// siblingCards / resolveIndividualGroup).

export type PersonSubject = { groupId: string; subject: string; icon: string; color: string; level: string }

export type PersonGroup = {
  /** Representative (first) group id — used as the single selection token so the
   *  strip keeps its `selectedGroupId: string` contract. */
  id: string
  name: string
  memberIds: string[]
  subjects: PersonSubject[]
  color: string
}

const personKey = (g: Group) => g.name.trim().toLowerCase()

/** Group individual (1:1) groups by person, preserving first-appearance order. */
export function mergeIndividuals(individualGroups: Group[]): PersonGroup[] {
  const byPerson = new Map<string, Group[]>()
  for (const g of individualGroups) {
    const k = personKey(g)
    const arr = byPerson.get(k)
    if (arr) arr.push(g)
    else byPerson.set(k, [g])
  }
  const persons: PersonGroup[] = []
  for (const arr of byPerson.values()) {
    const sorted = [...arr].sort((a, b) => a.id.localeCompare(b.id))
    const rep = sorted[0]
    persons.push({
      id: rep.id,
      name: rep.name,
      memberIds: sorted.map(g => g.id),
      subjects: sorted.map(g => ({ groupId: g.id, subject: g.subject, icon: g.icon, color: g.color, level: g.level })),
      color: rep.color,
    })
  }
  return persons
}

/**
 * All sibling group ids for the person that owns `selectedId`. If `selectedId`
 * is a regular (non-individual) group, returns just `[selectedId]`; if null,
 * returns `[]`. Lets a list view expand a merged-card selection to the union of
 * that person's subject groups.
 */
export function expandToPerson(individualGroups: Group[], selectedId: string | null): string[] {
  if (!selectedId) return []
  const sel = individualGroups.find(g => g.id === selectedId)
  if (!sel) return [selectedId]
  const k = personKey(sel)
  return individualGroups.filter(g => personKey(g) === k).map(g => g.id)
}
