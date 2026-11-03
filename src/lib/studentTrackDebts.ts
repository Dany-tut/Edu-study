/** Explicit issued assignments only: a past lesson date alone never creates a debt. */
export interface TrackAssignment {
  id: string
  lessonId: string
  moduleId: number
  title: string
  dueDate?: string
  required: boolean
  state: 'open' | 'draft' | 'returned' | 'failed' | 'submitted' | 'unknown' | 'completed'
}
export function needsHomeworkAction(work: TrackAssignment): boolean {
  return work.required && ['open', 'draft', 'returned', 'failed'].includes(work.state)
}
/** Date-only deadlines are inclusive in the student's local calendar. */
export function isHomeworkOverdue(work: TrackAssignment, today: string): boolean {
  return needsHomeworkAction(work) && !!work.dueDate && work.dueDate < today
}
export function sortedHomeworkActions(works: TrackAssignment[], today: string): TrackAssignment[] {
  return works.filter(needsHomeworkAction).sort((a, b) =>
    Number(isHomeworkOverdue(b, today)) - Number(isHomeworkOverdue(a, today)) ||
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.id.localeCompare(b.id))
}
export function overdueModuleCounts(works: TrackAssignment[], today: string): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const work of works) if (isHomeworkOverdue(work, today)) counts[work.moduleId] = (counts[work.moduleId] ?? 0) + 1
  return counts
}
