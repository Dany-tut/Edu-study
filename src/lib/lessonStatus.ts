import { type Lesson, type LessonStatus, type ScheduleLesson, type Subject } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { useStudentData } from '../store/studentDataStore'
import { useStudentTz } from './studentTz'
import { convertWallTime } from './teacherTz'
import { lessonStudyProgress } from './lessonStudyProgress'
import { canRetakeHomework, gradedWorkLabel } from './homeworkResult'
import { getScheduleState, pickScheduleFocus, type ScheduleSlot, type ScheduleState } from './scheduleState'

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

export function getTrackLessonStatus(lesson: Lesson, now: Date = new Date(), event = getLessonScheduleState(lesson, now)): TrackLessonStatus {
  if (lesson.status === 'submitted' || lesson.status === 'completed') {
    const result = lesson.result
    if (result?.pending) return 'submitted'
    if (result?.passed) return 'test_passed'
    if (result?.percent != null) return result.percent < result.passingScore ? 'test_low' : 'test_passed'
    if (lesson.status === 'submitted' && result?.grading !== 'teacher') return 'submitted_unknown'
  }
  // Locked and current lessons both depend on whether the lesson sits on the
  // calendar, so resolve its scheduled slot (any day in the window) once.
  const status = lesson.status === 'unviewed' && (event?.isCurrent || lessonStudyProgress(lesson).completed) ? 'current' : lesson.status
  if (status !== 'locked' && status !== 'current') return status

  // Test nodes don't have recordings to view — a locked test must stay locked
  // regardless of whether its scheduled date has passed (the gate in db.ts sets
  // status = 'locked' when prerequisites aren't met; this must not be overridden).
  if (lesson.kind === 'test' && status === 'locked') return 'locked'

  if (!event || event.phase === 'cancelled' || event.phase === 'unknown') return status
  if (event.phase === 'upcoming' && !event.isToday) return status
  // A scheduled end is not a homework grade. An actual recording is required.
  if ((event.hasEnded || event.phase === 'available') && lesson.kind !== 'test' && lesson.videoUrl?.trim() && !lessonStudyProgress(lesson).completed) return 'unviewed'
  if (event.isCurrent) return 'today'
  return event.isToday && !event.hasEnded ? 'today' : 'current'
}

/** One event state is shared by the calendar, mobile home and track. */
export function getStudentScheduleState(row: ScheduleLesson, date: string, now: Date, timeZone: string, subjects: Subject[]) {
  const match = resolveScheduleLesson(row, subjects).lesson
  const state = getScheduleState({
    ...row, date,
    materialOnly: match?.kind === 'test' || match?.nodeType === 'lesson' || (match?.deliveryMode === 'recording' && row.kind !== 'rec'),
  }, now, timeZone)
  return { ...state, recordingAvailable: state.hasEnded && !!match?.videoUrl?.trim() }
}

export function getLessonScheduleState(lesson: Lesson, now: Date = new Date()): ScheduleState | null {
  const slot = lessonScheduleSlot(lesson, now)
  if (!slot) return null
  const state = getScheduleState({
    ...slot,
    materialOnly: lesson.kind === 'test' || lesson.nodeType === 'lesson' || (lesson.deliveryMode === 'recording' && lesson.nodeType !== 'rec'),
  }, now, useStudentTz.getState().tz)
  return { ...state, recordingAvailable: state.hasEnded && !!lesson.videoUrl?.trim() }
}

function lessonScheduleSlot(lesson: Lesson, now = new Date()): ScheduleSlot | null {
  const { scheduleDays, subjects } = useStudentData.getState()
  const tz = useStudentTz.getState().tz
  const candidates = scheduleDays.flatMap(day => day.lessons
    .filter(entry => resolveScheduleLesson(entry, subjects).lesson?.id === lesson.id)
    .map(entry => ({ ...entry, date: day.date })))
  const states = candidates.map(slot => getScheduleState(slot, now, tz))
  const focus = pickScheduleFocus(states)
  let slot: ScheduleSlot | null = focus >= 0 ? candidates[focus] : candidates
    .filter(candidate => candidate.status !== 'cancelled')
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0] ?? candidates[0] ?? null

  // Course dates survive the short calendar window; an old lesson must not re-lock.
  if (!slot && lesson.scheduledDate) {
    const raw = lesson.scheduledDate
    const dot = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    const date = dot ? `${dot[3]}-${dot[2]}-${dot[1]}` : raw
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // A date without a time is a calendar day, not midnight in another zone.
      if (!lesson.scheduledTime?.trim()) return { date, time: '', endDate: undefined, endTime: undefined }
      const local = convertWallTime(date, lesson.scheduledTime, 'Europe/Moscow', tz)
      slot = { date: local.day, time: local.time, startsAt: `${date}T${lesson.scheduledTime.slice(0, 5)}:00+03:00` }
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
