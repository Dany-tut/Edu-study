import { getLessonScheduleState } from './lessonStatus'
import type { Lesson } from '../data/mockData'
import { lessonStudyProgress } from './lessonStudyProgress'
import { parseVideoSource } from './videoSource'

/** Keep existing work reachable; only a new assignment requires lesson credit. */
export function homeworkNeedsVideo(lesson: Lesson, ref = lesson.id): boolean {
  if (lesson.kind === 'test' || lessonStudyProgress(lesson).completed) return false
  if (['submitted', 'completed', 'returned'].includes(lesson.status) || lesson.result?.attemptId || lesson.result?.draft) return false
  try {
    const raw = localStorage.getItem(`student-dashboard:homework:${ref}`)
    if (raw) {
      const draft = JSON.parse(raw)
      const hasAnswers = Object.values(draft.basicAnswers ?? {})
        .some(value => typeof value === 'string' && value.trim())
      const hasHardWork = draft.hardDraft?.trim() || draft.hardFiles?.length
        || draft.hardPhotos?.length || draft.hardBoard || Object.keys(draft.hardTaskDrafts ?? {}).length
      if (hasAnswers || hasHardWork || draft.basicSubmitted || draft.hardSubmitted) return false
    }
  } catch { /* no saved draft */ }
  const source = parseVideoSource(lesson.videoUrl)
  // An external iframe cannot report coverage. Never trap the student behind it.
  return !!source && source.kind !== 'iframe' && source.kind !== 'audio'
}

/** Когда урок отдаёт домашку.
 *  «В записи» — с момента «Запись доступна с» (дальше её держит просмотр 90%).
 *  «С преподавателем» — как только учитель нажал «Завершить урок»
 *  (schedule_lessons.status = 'completed'); не нажал — по концу урока по
 *  расписанию: начало + выбранная длительность. Старый слот без конца — +90 мин.
 *  Этот замок стоит раньше зачёта видео и черновиков: они не открывают ДЗ раньше.
 */
export function homeworkTimeLocked(lesson: Lesson, now = new Date()): boolean {
  if (lesson.kind === 'test') return false
  const event = getLessonScheduleState(lesson, now)
  if (!event) return false
  if (event.phase === 'cancelled') return true
  if (event.startMs == null || event.phase === 'completed') return false
  if (event.recording) return now.getTime() < event.startMs
  return now.getTime() < (event.endMs ?? event.startMs + 90 * 60_000)
}
