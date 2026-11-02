import { diaryNeedsAction, diaryOverdue, sortStudentDiary, type StudentDiaryEntry } from './studentDiary'

export function studentHomeWork(entries: readonly StudentDiaryEntry[], today: string) {
  const actions = sortStudentDiary(entries.filter(diaryNeedsAction), 'priority', false, today)
  const overdue = actions.filter(entry => diaryOverdue(entry, today))
  const review = entries.filter(entry => ['submitted', 'submitted_unknown'].includes(entry.status))
  return { actions, overdue, upcoming: actions.filter(entry => !diaryOverdue(entry, today)), review, next: actions[0] ?? null }
}
export function homeModuleDebts(entries: readonly StudentDiaryEntry[], courseId: string, today: string) {
  const counts: Record<number, number> = {}
  for (const entry of entries) {
    if (entry.course.id !== courseId || !diaryOverdue(entry, today)) continue
    const id = entry.course.modules[entry.moduleOrder]?.id
    if (id != null) counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
