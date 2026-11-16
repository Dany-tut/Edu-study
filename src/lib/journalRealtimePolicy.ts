import type { TeacherDataChange } from './teacherDataRealtime'

/** The cold-load snapshot owns the first Realtime sync; reconnects must catch up. */
export function shouldReloadJournalForChange(change: Pick<TeacherDataChange, 'eventType' | 'syncKind'>) {
  return change.eventType !== 'SYNC' || change.syncKind !== 'initial'
}
