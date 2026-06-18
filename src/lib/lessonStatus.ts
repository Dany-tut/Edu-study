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

  const { scheduleDays, subjects } = useStudentData.getState()
  let slot: { date: string; time: string } | null = null
  for (const day of scheduleDays) {
    const entry = day.lessons.find(e => resolveScheduleLesson(e, subjects).lesson?.id === lesson.id)
    if (entry) { slot = { date: day.date, time: entry.time }; break }
  }

  // Not on the calendar → keep the raw status (locked stays locked).
  if (!slot) return lesson.status

  // On the calendar: an upcoming/today slot reads as the active lesson (purple
  // ▶); once its time has passed it becomes a missed recording. This applies to
  // lessons the teacher placed in the schedule but hasn't explicitly unlocked.
  return lessonTimeState(slot.date, slot.time, now).passed ? 'unviewed' : 'current'
}
