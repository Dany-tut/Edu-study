/** A learner's own understanding, independent of grades and attendance. */
export interface LessonSelfAssessment {
  value: number
  assessedAt: string
}

export function isSelfAssessmentValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4
}

export function parseLessonSelfAssessment(raw: unknown): LessonSelfAssessment | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Partial<LessonSelfAssessment>
  return isSelfAssessmentValue(a.value) && typeof a.assessedAt === 'string' && Number.isFinite(Date.parse(a.assessedAt))
    ? { value: a.value, assessedAt: a.assessedAt } : null
}
