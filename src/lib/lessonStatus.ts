import { type Lesson, type LessonStatus } from '../data/mockData'
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
