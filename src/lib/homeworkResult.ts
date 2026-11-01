import type { BasicAnswersPayload } from './basicAnswers'
import type { Lesson } from '../data/mockData'
import { parseLessonSelfAssessment, type LessonSelfAssessment } from './lessonSelfAssessment'

export function gradedWorkLabel(passed: boolean, kind?: Lesson['kind']): string {
  if (kind === 'test') return passed ? 'Тест сдан' : 'Тест не сдан'
  return passed ? 'ДЗ зачтено' : 'ДЗ не зачтено'
}

export interface HomeworkAttempt {
  id: string
  number: number
  status: string
  score: number | null
  passing_score: number
  submitted_at: string
  review_comment: string | null
}
export interface HomeworkResult {
  selfAssessment?: LessonSelfAssessment | null
  grading: 'auto' | 'teacher' | 'unknown'
  percent: number | null
  passingScore: number
  pending?: boolean
  bestPercent?: number | null
  passed?: boolean
  draft?: boolean
  attemptId?: string
  /** Completed grade recorded before submissions had attempt ids. */
  legacyGraded?: boolean
  testlyKey?: string
  attempts?: HomeworkAttempt[]
  attemptCount?: number
}

/** Only a fully graded homework has a public result, including mixed homework. */
export function homeworkResult(snapshot: unknown, score: number | null | undefined, status?: string, attempts: HomeworkAttempt[] = []): HomeworkResult {
  const a = snapshot as Partial<BasicAnswersPayload> | null
  const rawPercent = typeof score === 'number' && Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score))) : null
  const passingScore = typeof a?.recommendationScore === 'number' && Number.isFinite(a.recommendationScore)
    ? Math.max(0, Math.min(100, a.recommendationScore)) : 80
  const known = a?.v === 'basic-1' && Array.isArray(a.rows) && a.rows.length > 0 && a.rows.every(row => row && typeof row.type === 'string')
  const rows = known ? a!.rows! : []
  const external = rows.filter(row => row.type === 'testly')
  const manual = a?.reviewRequired === true || external.some(row => row.testly?.pending === true)
    || rows.some(row => row.type !== 'testly' && (row.verdict === 'review' || row.verdict === 'skip'))
  const reviewed = !!a?.reviewedAt || (manual && status === 'completed')
  const pending = status !== 'returned' && !a?.draft && manual && !reviewed
  const incomplete = external.some(row => !row.testly || row.testly.returned
    || !Number.isFinite(row.testly.got) || !Number.isFinite(row.testly.max) || !(row.testly.max! > 0))
  const grading = manual ? 'teacher' : known && !incomplete && rawPercent !== null ? 'auto' : 'unknown'
  const percent = !a?.draft && !pending && (reviewed || (known && !incomplete) || status === 'completed') ? rawPercent : null
  const finalScores = attempts.filter(x => x.score !== null && x.status === 'completed').map(x => x.score!)
  if (percent !== null && status !== 'returned') finalScores.push(percent)
  const bestPercent = finalScores.length ? Math.max(...finalScores) : null
  return { grading, percent, passingScore, pending, bestPercent, selfAssessment: parseLessonSelfAssessment(a?.selfAssessment),
    passed: bestPercent !== null && bestPercent >= passingScore,
    draft: a?.draft, attemptId: a?.attemptId, testlyKey: a?.testlyKey, attempts,
    legacyGraded: !a?.attemptId && status === 'completed' && percent !== null && score === percent }
}

export const homeworkDisplayScore = (r?: HomeworkResult): number | null =>
  !r || r.pending ? null : r.bestPercent ?? r.percent

export const isHomeworkSubmissionStatus = (status?: string): boolean =>
  status === 'submitted' || status === 'returned' || status === 'completed'

/** The track keeps the best graded attempt visible while the next attempt is in progress. */
export function gradedTrackResult(lesson: Pick<Lesson, 'status' | 'result'>): { status: 'test_low' | 'test_passed'; percent: number } | null {
  const { status, result } = lesson
  if (!result || !(isHomeworkSubmissionStatus(status) || (status === 'current' && result.draft))) return null
  const percent = result.bestPercent ?? (status === 'returned' ? null : homeworkDisplayScore(result))
  if (percent == null) return null
  return { status: percent >= result.passingScore ? 'test_passed' : 'test_low', percent }
}

export const canRetakeHomework = (r?: HomeworkResult, status?: string): boolean =>
  !!r && (!!r.attemptId || r.legacyGraded === true) && !r.draft && !r.pending && !r.passed &&
  (status === 'returned' || (r.percent !== null && r.percent < r.passingScore))
