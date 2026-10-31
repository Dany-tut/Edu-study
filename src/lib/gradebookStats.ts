export type JournalAttendance = {
  student_id: string
  lesson_date: string
  present: boolean
  grade: number | null
}

export type JournalProgress = {
  student_id: string
  lesson_ref: string
  status: string
  score: number | null
  attachments?: unknown
  updated_at?: string
}

export type JournalLesson = { short_id: string; title: string; kind: string | null }

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function journalLessonRef(ref: string): string {
  return ref.replace(/^video-/, '').replace(/-hard$/, '').split('~')[0]
}

export function journalWorkKind(ref: string): 'homework' | 'course' | 'hard' | 'video' | null {
  if (ref.startsWith('course-reset:') || ref.startsWith('trainer-')) return null
  if (ref.startsWith('video-')) return 'video'
  if (ref.endsWith('-hard')) return 'hard'
  return ref.startsWith('hw-') ? 'homework' : 'course'
}

/** Saved course/homework scores already use 0–100; Testly raw points are separate. */
export function journalResult(row: JournalProgress) {
  const payload = object(row.attachments)
  const answers = payload.v === 'basic-1' && Array.isArray(payload.rows) ? payload.rows.map(object) : []
  const tests = answers.filter(a => a.type === 'testly').map(a => object(a.testly))
  const pending = tests.some(test => test.pending === true)
    || (row.status !== 'completed' && answers.some(a => a.verdict === 'review'))
  const scored = ['submitted', 'returned', 'completed'].includes(row.status)
  const percent = journalWorkKind(row.lesson_ref) !== 'hard' && scored && typeof row.score === 'number'
    && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100 ? row.score : null
  const points = tests.flatMap(test => typeof test.got === 'number' && Number.isFinite(test.got) && test.got >= 0
    && typeof test.max === 'number' && Number.isFinite(test.max) && test.max > 0
    ? [{ got: test.got, max: test.max, pending: test.pending === true }] : [])
  return { percent, pending, points, videoCompleted: object(payload.video).completed === true }
}

export function average(values: (number | null)[], precision = 0): number | null {
  const scores = values.filter((v): v is number => v !== null && Number.isFinite(v))
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10 ** precision) / 10 ** precision : null
}

export function studentJournalStats(id: string, attendance: JournalAttendance[], progress: JournalProgress[]) {
  const lessons = attendance.filter(r => r.student_id === id)
  const homework = progress.filter(r => r.student_id === id && r.lesson_ref.startsWith('hw-') && !r.lesson_ref.endsWith('-hard'))
  const accepted = homework.filter(r => r.status === 'completed')
  const course = progress.filter(r => r.student_id === id && journalWorkKind(r.lesson_ref) === 'course')
  const work = [...homework, ...course]
  const hard = progress.filter(r => r.student_id === id && journalWorkKind(r.lesson_ref) === 'hard')
  return {
    attendance: average(lessons.map(r => r.present ? 100 : 0)),
    grade: average(lessons.map(r => r.grade), 1),
    hwScore: average(accepted.map(r => r.score)),
    completed: work.filter(r => r.status === 'completed').length,
    pending: work.filter(r => r.status === 'submitted').length,
    returned: work.filter(r => r.status === 'returned').length,
    lessons: lessons.length,
    courseScore: average(course.filter(r => r.status === 'completed' || r.status === 'submitted')
      .map(r => { const result = journalResult(r); return result.pending ? null : result.percent })),
    courseCompleted: course.filter(r => r.status === 'completed').length,
    courseSubmitted: course.filter(r => ['completed', 'submitted', 'returned'].includes(r.status)).length,
    courseTotal: course.length,
    hardCompleted: hard.filter(r => r.status === 'completed').length,
    hardTotal: hard.length,
  }
}
