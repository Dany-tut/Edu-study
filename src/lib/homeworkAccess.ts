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
  return !!source && source.kind !== 'iframe' && source.kind !== 'gdrive' && source.kind !== 'audio'
}
