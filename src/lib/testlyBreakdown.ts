import { testlyPoints } from './testlyModule'

export interface TestlyQuestionBreakdown {
  n: number
  prompt: string
  answer: string
  correct: string
  got: number
  max: number
  status: 'correct' | 'partial' | 'wrong' | 'unanswered'
  image?: string
  explanation?: string
}

export interface TestlyBreakdownSnapshot {
  testId: string
  testTitle: string
  got: number
  max: number
  submittedAt: string
  attemptNumber: number
  questions: TestlyQuestionBreakdown[]
}

export function questionStatusLabel(status: TestlyQuestionBreakdown['status']): string {
  switch (status) {
    case 'correct': return 'Верно'
    case 'partial': return 'Частично'
    case 'wrong': return 'Неверно'
    case 'unanswered': return 'Без ответа'
  }
}

export function breakdownSummary(questions: TestlyQuestionBreakdown[]) {
  const wrong = questions.filter(q => q.status === 'wrong' || q.status === 'partial')
  const correct = questions.filter(q => q.status === 'correct')
  const unanswered = questions.filter(q => q.status === 'unanswered')
  return { wrong, correct, unanswered, total: questions.length }
}

export function breakdownScoreLabel(got: number, max: number): string {
  return testlyPoints(got, max)
}
