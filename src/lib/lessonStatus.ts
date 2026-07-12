import { type Lesson, type LessonStatus, type ScheduleLesson, type Subject } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { lessonTimeState } from './useNow'

// A "current" lesson should stop looking active once its scheduled time today
// has already passed. In that case we surface the missed/recording state.
export function getDisplayLessonStatus(lesson: Lesson, now: Date = new Date()): LessonStatus {
  // If the homework was submitted and then scored by the teacher → show as completed
  if (lesson.status === 'submitted') {
    const assessment = useDashboard.getState().lessonAssessments[lesson.id]
    if (assessment?.score != null) return 'completed'
  }

  // Locked and current lessons both depend on whether the lesson sits on the
  // calendar, so resolve its scheduled slot (any day in the window) once.
  if (lesson.status !== 'locked' && lesson.status !== 'current') return lesson.status

  // Test nodes don't have recordings to view — a locked test must stay locked
  // regardless of whether its scheduled date has passed (the gate in db.ts sets
  // status = 'locked' when prerequisites aren't met; this must not be overridden).
  if (lesson.kind === 'test' && lesson.status === 'locked') return 'locked'

  const { scheduleDays, subjects } = useStudentData.getState()
  let slot: { date: string; time: string } | null = null
  for (const day of scheduleDays) {
    const entry = day.lessons.find(e => resolveScheduleLesson(e, subjects).lesson?.id === lesson.id)
    if (entry) { slot = { date: day.date, time: entry.time }; break }
  }

  // Not on the calendar → keep the raw status (locked stays locked).
  if (!slot) return lesson.status

  // A scheduled lesson only unlocks on its own day — not tomorrow, not a week
  // ahead. Future slots stay locked until the date arrives; this is the
  // schedule-driven equivalent of the teacher's explicit "Открыть урок".
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (slot.date > today) return lesson.status

  // Today (or earlier): an upcoming slot reads as the active lesson (purple ▶);
  // once its time has passed it becomes a missed recording.
  return lessonTimeState(slot.date, slot.time, now).passed ? 'unviewed' : 'current'
}

// The reconciled status of a single calendar row. This is the ONE place that
// decides whether a schedule row reads as "engaged" vs "missed", so the calendar
// and the track can never disagree: it resolves the row to its course lesson and
// trusts the track's status first, falling back to a time check only when the
// student never touched the lesson. Cross-row concerns (which future row is the
// "soonest" highlight) stay with the caller — this judges one row in isolation.
export type ScheduleRowStatus =
  | 'completed'   // done on the track
  | 'submitted'   // sent for review, not yet graded
  | 'returned'    // returned for rework
  | 'missed'      // today, its time has passed, and the student never engaged
  | 'pending'     // future slot, an earlier day, or no track match — nothing to flag

// A row the student demonstrably engaged with — never "missed" regardless of time.
const ENGAGED_STATUSES: LessonStatus[] = ['completed', 'submitted', 'returned']
const isEngaged = (s: LessonStatus | null): boolean => s != null && ENGAGED_STATUSES.includes(s)

function findLessonById(subjects: Subject[], id: string): Lesson | null {
  for (const s of subjects) {
    for (const m of s.modules) {
      const l = m.lessons.find(x => x.id === id)
      if (l) return l
    }
  }
  return null
}

export function scheduleRowStatus(
  row: ScheduleLesson,
  opts: { dayDate: string; isToday: boolean },
  subjects: Subject[],
  now: Date = new Date(),
): ScheduleRowStatus {
  const lesson = resolveScheduleLesson(row, subjects).lesson
  let track = lesson ? getDisplayLessonStatus(lesson, now) : null

  // A recording (`~rec`) node carries no progress of its own — homework and
  // completion live on the sibling lesson node (same short_id, minus `~rec`).
  // Submitting the homework means the student caught up even if they skipped the
  // live session, so a recording row inherits the lesson node's engagement: done
  // homework ⇒ never "missed".
  if (lesson?.nodeType === 'rec' && !isEngaged(track)) {
    const base = findLessonById(subjects, lesson.id.replace(/~rec$/, ''))
    const baseTrack = base ? getDisplayLessonStatus(base, now) : null
    if (isEngaged(baseTrack)) track = baseTrack
  }

  if (isEngaged(track)) return track as ScheduleRowStatus
  const passed = lessonTimeState(opts.dayDate, row.time, now).passed
  return opts.isToday && passed ? 'missed' : 'pending'
}
