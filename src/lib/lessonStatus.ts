import { type Lesson, type LessonStatus } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { useStudentData } from '../store/studentDataStore'
import { useStudentTz } from './studentTz'
import { convertWallTime, wallDateTimeInTz } from './teacherTz'
import { lessonStudyProgress } from './lessonStudyProgress'
import { canRetakeHomework, gradedWorkLabel } from './homeworkResult'

export type LessonDisplayStatus = LessonStatus | 'test_passed' | 'test_low' | 'submitted_unknown'
export type TrackLessonStatus = LessonDisplayStatus | 'today'

const LESSON_STATUS_LABELS: Record<Exclude<LessonDisplayStatus, 'test_passed' | 'test_low'>, string> = {
  completed: 'Выполнено', returned: 'Возвращено на доработку', unviewed: 'Запись доступна',
  submitted: 'Отправлено на проверку', current: 'Урок доступен', locked: 'Недоступно',
  submitted_unknown: 'Работа отправлена',
}

export function lessonStatusLabel(status: TrackLessonStatus, kind?: Lesson['kind']): string {
  if (status === 'today') return 'Сегодня'
  if (status === 'test_passed' || status === 'test_low') return gradedWorkLabel(status === 'test_passed', kind)
  if (status === 'current' && kind === 'test') return 'Тест доступен'
  return LESSON_STATUS_LABELS[status]
}

export const trackStepLabel = {
  resume: 'Продолжить ДЗ', retake: 'Пересдать ДЗ', review: 'На проверке', watch: 'Смотреть запись',
} as const

/** The circle remembers a graded attempt; the caption describes what to do now. */
export function lessonTrackStep(lesson: Lesson, status: TrackLessonStatus): keyof typeof trackStepLabel | null {
  if (status === 'locked') return null
  if (status === 'submitted') return 'review'
  if (lesson.kind === 'test') return null
  const result = lesson.result
  if (result?.draft && result.attemptId && !result.passed) return 'resume'
  if ((status === 'test_low' || status === 'returned') && canRetakeHomework(result, lesson.status)) return 'retake'
  if ((status === 'unviewed' || status === 'completed' || status === 'test_passed') &&
      lesson.videoUrl?.trim() && !lessonStudyProgress(lesson).completed) return 'watch'
  return null
}

// Submission/review status is authoritative. Calendar presentation only affects open lessons.
export function getDisplayLessonStatus(lesson: Lesson, now: Date = new Date()): LessonDisplayStatus {
  const status = getTrackLessonStatus(lesson, now)
  return status === 'today' ? 'current' : status
}

export function getTrackLessonStatus(lesson: Lesson, now: Date = new Date()): TrackLessonStatus {
  if (lesson.status === 'submitted' || lesson.status === 'completed') {
    const result = lesson.result
    if (result?.pending) return 'submitted'
    if (result?.passed) return 'test_passed'
    if (result?.percent != null) return result.percent < result.passingScore ? 'test_low' : 'test_passed'
    if (lesson.status === 'submitted' && result?.grading !== 'teacher') return 'submitted_unknown'
  }
  // Locked and current lessons both depend on whether the lesson sits on the
  // calendar, so resolve its scheduled slot (any day in the window) once.
  const status = lesson.status === 'unviewed' && lessonStudyProgress(lesson).completed ? 'current' : lesson.status
  if (status !== 'locked' && status !== 'current') return status

  // Test nodes don't have recordings to view — a locked test must stay locked
  // regardless of whether its scheduled date has passed (the gate in db.ts sets
  // status = 'locked' when prerequisites aren't met; this must not be overridden).
  if (lesson.kind === 'test' && status === 'locked') return 'locked'

  const slot = lessonScheduleSlot(lesson)
  if (!slot) return status

  const { day: today, time } = wallDateTimeInTz(now.toISOString(), useStudentTz.getState().tz)
  if (slot.date > today) return status

  // An unknown end time doesn't make a lesson a recording as soon as it starts.
  const endDate = slot.endDate ?? slot.date
  const ended = endDate < today || (endDate === today && !!slot.endTime && slot.endTime <= time)
  if (ended && lesson.kind !== 'test' && lesson.videoUrl?.trim() && !lessonStudyProgress(lesson).completed) return 'unviewed'
  return slot.date === today ? 'today' : 'current'
}

function lessonScheduleSlot(lesson: Lesson) {
  const { scheduleDays, subjects } = useStudentData.getState()
  let slot: { date: string; time: string; endDate?: string; endTime?: string } | null = null
  for (const day of scheduleDays) {
    const entry = day.lessons.find(e => resolveScheduleLesson(e, subjects).lesson?.id === lesson.id)
    if (entry) { slot = { date: day.date, time: entry.time, endDate: entry.endDate, endTime: entry.endTime }; break }
  }

  // Course dates survive the short calendar window; an old lesson must not re-lock.
  const tz = useStudentTz.getState().tz
  if (!slot && lesson.scheduledDate) {
    const raw = lesson.scheduledDate
    const dot = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    const date = dot ? `${dot[3]}-${dot[2]}-${dot[1]}` : raw
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // A date without a time is a calendar day, not midnight in another zone.
      if (!lesson.scheduledTime?.trim()) return { date, time: '', endDate: undefined, endTime: undefined }
      const local = convertWallTime(date, lesson.scheduledTime, 'Europe/Moscow', tz)
      slot = { date: local.day, time: local.time }
    }
  }
  return slot
}

const lessonDateLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
export function lessonScheduleDate(lesson: Lesson, format: 'short' | 'long'): string | null {
  const date = lessonScheduleSlot(lesson)?.date
  if (!date) return null
  const [, month, day] = date.split('-')
  return format === 'short' ? `${day}.${month}` : lessonDateLong.format(new Date(`${date}T00:00:00Z`))
}

export { scheduleRowStatus, type ScheduleRowStatus } from './scheduleAttendance'
