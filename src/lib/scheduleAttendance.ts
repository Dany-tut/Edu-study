import type { ScheduleLesson, Subject } from '../data/mockData'
import { lessonTimeState } from './useNow'

// Calendar attendance never derives from homework, recordings, or elapsed time.
export type ScheduleRowStatus = 'present' | 'missed' | 'unmarked' | 'pending'

export function scheduleRowStatus(
  row: ScheduleLesson,
  opts: { dayDate: string; isToday: boolean },
  _subjects: Subject[],
  now: Date = new Date(),
): ScheduleRowStatus {
  if (row.attendance === false) return 'missed'
  if (row.attendance === true) return 'present'
  return lessonTimeState(opts.dayDate, row.time, now).passed ? 'unmarked' : 'pending'
}
