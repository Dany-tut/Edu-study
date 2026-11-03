export type StudentDiaryView = 'work'
type ViewStorage = Pick<Storage, 'getItem' | 'setItem'>
const viewKey = (owner: string) => 'iskra:diary-view:' + encodeURIComponent(owner)
const isView = (value: unknown): value is StudentDiaryView => value === 'work'

export function readStudentDiaryView(owner: string | null, storage?: ViewStorage): StudentDiaryView {
  if (!owner) return 'work'
  try { const saved = (storage ?? localStorage).getItem(viewKey(owner)); return isView(saved) ? saved : 'work' }
  catch { return 'work' }
}
export function saveStudentDiaryView(owner: string | null, view: string, storage?: ViewStorage) {
  if (!owner || !isView(view)) return
  try { (storage ?? localStorage).setItem(viewKey(owner), view) } catch { /* The selected view still works without storage. */ }
}

export function diaryUpcomingDays(today: string): string[] {
  const start = new Date(today + 'T12:00:00Z')
  if (Number.isNaN(start.getTime())) return []
  return Array.from({length: 7}, (_, i) => {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + i)
    return date.toISOString().slice(0, 10)
  })
}

export function groupDiaryTimeline<T extends { due: string | null }>(
  entries: readonly T[], day: string | null, overdue: (entry: T) => boolean, descendingDates = false,
): { key: string; entries: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    if (day && entry.due !== day) continue
    const key = overdue(entry) ? 'overdue' : entry.due ?? 'undated'
    const group = groups.get(key) ?? []
    group.push(entry); groups.set(key, group)
  }
  return [...groups].sort(([a], [b]) => a === b ? 0 : a === 'overdue' || b === 'undated' ? -1
    : b === 'overdue' || a === 'undated' ? 1 : a.localeCompare(b) * (descendingDates ? -1 : 1))
    .map(([key, entries]) => ({key, entries}))
}
