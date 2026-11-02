import type { ProgressMap } from './db'
import type { HomeworkAttempt } from './homeworkResult'
import type { StudentDiaryEntry } from './studentDiary'

export interface JournalAttempt extends HomeworkAttempt {
  student_id: string
  lesson_ref: string
  reviewed_at: string | null
}
export type WorkJournalState = 'passed' | 'low' | 'pending' | 'returned' | 'draft' | 'ungraded'
export interface StudentJournalWork {
  key: string
  entry: StudentDiaryEntry
  hard: boolean
  score: number | null
  latestScore: number | null
  passingScore: number
  state: WorkJournalState
  attempts: HomeworkAttempt[]
  attemptCount: number | null
  comment: string | null
  historyKnown: boolean
}

const finalScore = (score: unknown): score is number =>
  typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100

/** Only assigned, accessible diary entries enter the journal; orphan progress never creates work. */
export function buildStudentWorkJournal(
  entries: StudentDiaryEntry[], progress: ProgressMap, attempts: JournalAttempt[] | null,
  fallbackStudentId: string | null,
): StudentJournalWork[] {
  const byWork = new Map<string, HomeworkAttempt[]>()
  for (const attempt of attempts ?? []) {
    const key = `${attempt.student_id}:${attempt.lesson_ref}`
    const group = byWork.get(key) ?? []
    group.push(attempt); byWork.set(key, group)
  }
  function work(entry: StudentDiaryEntry, hard = false): StudentJournalWork {
    const ref = hard ? `${entry.id}-hard` : entry.id
    const saved = progress[ref]
    const result = hard ? saved?.result : saved?.result ?? entry.lesson.result
    const owner = entry.course.ownerStudentId ?? fallbackStudentId
    const history = [...(attempts === null ? result?.attempts ?? [] : byWork.get(`${owner}:${ref}`) ?? [])]
      .sort((a, b) => a.number - b.number || a.submitted_at.localeCompare(b.submitted_at))
    const status = saved?.status ?? (hard ? 'current' : entry.lesson.status)
    const latest = !result?.draft && !result?.pending && status !== 'returned' && finalScore(result?.percent)
      ? result.percent : null
    const finals = history.filter(a => a.status === 'completed' && finalScore(a.score)).map(a => a.score!)
    if (latest !== null) finals.push(latest)
    if (!result && status === 'completed' && finalScore(saved?.score)) finals.push(saved.score)
    // The store's compact grading projection can know a final best score before history arrives.
    if (finalScore(result?.bestPercent)) finals.push(result.bestPercent)
    const score = finals.length ? Math.max(...finals) : null
    const passingScore = result?.passingScore ?? 80
    const state: WorkJournalState = status === 'returned' ? 'returned'
      : result?.pending || status === 'submitted' ? 'pending'
        : result?.draft ? 'draft'
          : score !== null ? score >= passingScore ? 'passed' : 'low' : 'ungraded'
    const known = attempts !== null || result?.attempts !== undefined
    return { key: `${entry.course.id}:${ref}`, entry, hard, score, latestScore: latest,
      passingScore, state, attempts: history, historyKnown: known,
      attemptCount: attempts !== null ? history.length : result?.attemptCount ?? (known ? history.length : null),
      // Additional/recording work must never inherit the base lesson's review.
      comment: saved?.reviewComment?.trim() || null }
  }
  const rows: StudentJournalWork[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    const item = work(entry, entry.hardOnly === true)
    if (!seen.has(item.key)) { rows.push(item); seen.add(item.key) }
    if (!entry.hardOnly && !entry.extraId && entry.lesson.nodeType !== 'rec' &&
      (entry.lesson.hasHard || entry.lesson.bankHard?.length) && progress[`${entry.id}-hard`]) {
      const hard = work(entry, true)
      if (!seen.has(hard.key)) { rows.push(hard); seen.add(hard.key) }
    }
  }
  return rows
}

export function studentJournalSummary(works: StudentJournalWork[]) {
  const scores = works.flatMap(w => w.score === null ? [] : [w.score])
  return {
    total: works.length, graded: scores.length,
    average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    passed: works.filter(w => w.score !== null && w.score >= w.passingScore).length,
    improve: works.filter(w => w.score !== null && w.score < w.passingScore).length,
    ungraded: works.filter(w => w.score === null).length,
  }
}
