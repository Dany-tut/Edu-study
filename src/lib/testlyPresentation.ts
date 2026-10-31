import type { TestlyAttempt } from './testlyModule'
import { testlyDoneAt, testlyScoreOf, type TestlyScore } from '../data/taskTypes'

/** Заполненность — число ответов; результат — доля набранных баллов. */
export function testlyPresentation(attempt: TestlyAttempt | null, value: string | undefined) {
  const doneAt = attempt?.state === 'started' ? null
    : attempt?.state === 'submitted' ? (attempt.submittedAt ?? '') : testlyDoneAt(value)
  const savedScore = testlyScoreOf(value)
  const validScore = (score: TestlyScore | null): score is TestlyScore => !!score
    && Number.isFinite(score.got) && Number.isFinite(score.max) && score.max > 0 && score.got >= 0
  const freshScore = attempt?.state === 'submitted' && attempt.got != null && attempt.max != null
    ? { got: attempt.got, max: attempt.max, pending: !!attempt.pending, review: attempt.review } : null
  const score = attempt?.state === 'started' ? null
    : validScore(freshScore) ? freshScore : validScore(savedScore) ? savedScore : null
  const pending = doneAt !== null && (attempt?.state === 'submitted' ? !!attempt.pending : !!score?.pending)
  const started = doneAt === null && attempt?.state === 'started'
  const total = attempt?.total
  const count = attempt?.answered
  const progress = (started || doneAt !== null) && typeof total === 'number' && Number.isFinite(total) && total > 0
    && typeof count === 'number' && Number.isFinite(count)
    ? { total: Math.floor(total), answered: Math.max(0, Math.min(Math.floor(total), Math.floor(count))) } : null
  return {
    doneAt, score, started, pending,
    progress: progress && progress.total > 0 ? { ...progress, percent: Math.round(progress.answered / progress.total * 100) } : null,
    percent: score ? Math.round(score.got / score.max * 100) : null,
  }
}
