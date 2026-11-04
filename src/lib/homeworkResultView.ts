// Состояние модалки «Результат ДЗ» сразу после сдачи.
//
// Раньше «сдано ли» и «есть ли хард» были одним флагом: без хард-уровня
// passed становился null, и ДЗ на 100 из 100 рисовалось как недобор —
// «Пока 100 из 100 баллов», жёлтая полоса и «0 до открытия харда».
// Здесь это две независимые оси: зачёт по порогу и наличие харда.

export type HomeworkResultState = 'pending' | 'passed' | 'below'

export interface HomeworkResultView {
  state: HomeworkResultState
  /** CTA «Приступить к харду» и текст про открывшийся хард. */
  offerHard: boolean
  /** Полоса порога: подпись про хард только если он есть. */
  gap: number
}

export function homeworkResultView({ context, score, passingScore, hasHard }: {
  context: 'basic' | 'hard'
  /** undefined — оценки ещё нет (ручная проверка). */
  score?: number
  passingScore?: number
  hasHard: boolean
}): HomeworkResultView {
  if (context === 'hard' || score === undefined) return { state: 'pending', offerHard: false, gap: 0 }
  const threshold = passingScore ?? 80
  const passed = score >= threshold
  return {
    state: passed ? 'passed' : 'below',
    offerHard: passed && hasHard,
    gap: Math.max(0, threshold - score),
  }
}
