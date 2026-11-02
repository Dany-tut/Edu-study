import type { CourseJournalData } from './courseJournal'

/** A rolling deployment may have an older DB. Every other failure is final:
 * never amplify a slow/denied snapshot into the legacy request fan-out. */
export function journalSnapshotResult({ data, error }: { data: unknown; error: { code: string; message: string } | null }): CourseJournalData | null {
  if (error) {
    if (['PGRST202', '42883'].includes(error.code)) return null
    throw new Error(error.message)
  }
  const next = data as CourseJournalData | null
  if (!next || !['courses', 'lessons', 'modules', 'work', 'events', 'assignments', 'legacy', 'attempts', 'marks', 'warnings']
    .every(key => Array.isArray((next as unknown as Record<string, unknown>)[key]))) {
    throw new Error('Снимок журнала неполон. Обновите журнал.')
  }
  return next
}
