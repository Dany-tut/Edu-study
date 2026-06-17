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

  if (lesson.status !== 'current') return lesson.status

  const { scheduleDays, subjects } = useStudentData.getState()
  const today = scheduleDays.find(day => day.isToday)
  if (!today) return lesson.status

  const scheduledLesson = today.lessons.find(entry => resolveScheduleLesson(entry, subjects).lesson?.id === lesson.id)
  if (!scheduledLesson) return lesson.status

  return lessonTimeState(today.date, scheduledLesson.time, now).passed ? 'unviewed' : lesson.status
}
