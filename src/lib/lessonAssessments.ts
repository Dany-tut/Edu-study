import { homeworkDisplayScore, isHomeworkSubmissionStatus } from './homeworkResult'
import type { ProgressMap } from './db'
import type { HardTaskReviewBlock } from './useHomework'
import { isSelfAssessmentValue } from './lessonSelfAssessment'

export interface LessonAssessment {
  score?: number
  emojiIndex: number
  selfAssessedAt?: string
  selfAssessmentAttemptId?: string
  hardAvailable?: boolean
  hardCompleted?: boolean
  hardStatus?: 'submitted' | 'returned' | 'completed'
  hardScore?: number | null
  hardComment?: string
  hardReviewPhotos?: string[]
  hardReviewBoard?: string | null
  hardReviewAnnotation?: { image: string; w: number; h: number } | null
  hardReviewBlocks?: HardTaskReviewBlock[]
}

const isSubmission = (p: ProgressMap[string] | undefined) =>
  isHomeworkSubmissionStatus(p?.status)

/** Restore server self-assessment, keeping legacy local choices when absent. */
export function reconcileLessonAssessments(
  current: Record<string, LessonAssessment>,
  progress: ProgressMap,
  lessonIds: string[],
): Record<string, LessonAssessment> {
  const next = { ...current }
  // Include extra homework, whose refs are not separate course nodes.
  const refs = new Set([...lessonIds, ...Object.keys(current), ...Object.keys(progress)
    .filter(ref => isSubmission(progress[ref]))
    .map(ref => ref.endsWith('-hard') ? ref.slice(0, -5) : ref)])
  for (const id of refs) {
    const basic = progress[id]
    const hard = progress[`${id}-hard`]
    if (!isSubmission(basic) && !isSubmission(hard)) {
      delete next[id]
      continue
    }
    const self = basic?.result?.selfAssessment
    const previous = current[id]
    const sameAttempt = !previous?.selfAssessmentAttemptId || previous.selfAssessmentAttemptId === basic?.result?.attemptId
    const keepLocal = !basic?.result?.draft && sameAttempt
    const a: LessonAssessment = {
      emojiIndex: self?.value ?? (keepLocal && isSelfAssessmentValue(previous?.emojiIndex) ? previous.emojiIndex : -1),
      selfAssessedAt: self?.assessedAt ?? (keepLocal ? previous?.selfAssessedAt : undefined),
      selfAssessmentAttemptId: basic?.result?.attemptId,
    }
    const visibleScore = basic?.result ? homeworkDisplayScore(basic.result) : basic?.status === 'completed' ? basic.score : null
    if (isSubmission(basic) && visibleScore != null) {
      a.score = visibleScore
      a.hardAvailable = visibleScore >= 80
    }
    if (isSubmission(hard)) {
      a.hardStatus = hard.status as LessonAssessment['hardStatus']
      a.hardCompleted = hard.status === 'completed'
      a.hardScore = a.hardCompleted ? hard.score : null
      a.hardComment = hard.reviewComment
      a.hardReviewPhotos = hard.reviewAttachments.photos
      a.hardReviewBoard = hard.reviewAttachments.board
      a.hardReviewAnnotation = hard.reviewAttachments.annotation
      a.hardReviewBlocks = hard.hardReviewBlocks
    }
    next[id] = a
  }
  return next
}

/** Shared by the node, its popover, and the homework entry point. */
export function hardLevelState(a: LessonAssessment | null | undefined) {
  // An existing submitted/reviewed hard attempt remains reachable, as in HomeworkFlow.
  const available = !!a?.hardStatus || (a?.hardAvailable ?? (a?.score != null && a.score >= 80))
  const locked = !available
  const status: NonNullable<LessonAssessment['hardStatus']> | 'available' | 'locked' =
    locked ? 'locked' : (a?.hardStatus ?? 'available')
  return { available, locked, status, visible: available || a?.score != null }
}
