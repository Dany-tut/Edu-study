import { resolveScheduleLesson, scheduleDays, type Lesson, type LessonStatus } from '../data/mockData'
import { lessonTimeState } from './useNow'

// A "current" lesson should stop looking active once its scheduled time today
// has already passed. In that case we surface the missed/recording state.
export function getDisplayLessonStatus(lesson: Lesson, now: Date = new Date()): LessonStatus {
  if (lesson.status !== 'current') return lesson.status

  const today = scheduleDays.find(day => day.isToday)
  if (!today) return lesson.status

  const scheduledLesson = today.lessons.find(entry => resolveScheduleLesson(entry).lesson?.id === lesson.id)
  if (!scheduledLesson) return lesson.status

  return lessonTimeState(today.date, scheduledLesson.time, now).passed ? 'unviewed' : lesson.status
}
