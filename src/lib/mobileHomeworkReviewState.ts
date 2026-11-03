import type { HwSubmission } from './useHomework'

/** lesson_progress keeps its id across resubmissions; the attempt is the review identity. */
export function homeworkReviewAttemptKey(submission: Pick<HwSubmission, 'id' | 'answers' | 'submittedAt'>): string {
  return JSON.stringify([submission.id, submission.answers?.attemptId || submission.submittedAt || null])
}

/** A linked assignment can have both hw-* and course rows. Review the newest student submission once. */
export function latestHomeworkSubmissions(submissions: HwSubmission[]): HwSubmission[] {
  const latest = new Map<string, HwSubmission>()
  for (const submission of submissions) {
    const previous = latest.get(submission.studentId)
    const time = Date.parse(submission.submittedAt)
    const previousTime = previous ? Date.parse(previous.submittedAt) : NaN
    if (!previous || Number.isFinite(time) && (!Number.isFinite(previousTime) || time > previousTime)) {
      latest.set(submission.studentId, submission)
    }
  }
  return [...latest.values()]
}
