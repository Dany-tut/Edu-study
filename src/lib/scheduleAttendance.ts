import type { ScheduleLesson, Subject } from '../data/mockData'
import { getScheduleState } from './scheduleState'

// Calendar attendance never derives from homework, recordings, or elapsed time.
export type ScheduleRowStatus = 'present' | 'missed' | 'unmarked' | 'pending'

export function scheduleRowStatus(
  row: ScheduleLesson,
  opts: { dayDate: string; isToday: boolean; timeZone?: string },
  _subjects: Subject[],
  now: Date = new Date(),
): ScheduleRowStatus {
  if (row.attendance === false) return 'missed'
  if (row.attendance === true) return 'present'
  return getScheduleState({ ...row, date: opts.dayDate }, now, opts.timeZone ?? 'Europe/Moscow').hasEnded ? 'unmarked' : 'pending'
}
