// Spaced-repetition scheduling (SM-2, the SuperMemo / Anki-family algorithm).
//
// A card carries: ease factor (EF), current interval in days, repetition count, and lapse
// count. After each review the student grades recall; SM-2 stretches the interval for items
// recalled well and resets items that were forgotten. This is the most evidence-backed lever
// for long-term retention (distributed practice + retrieval practice).

import { t } from './i18n'

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5

// Student-facing buttons map onto SM-2 grades.
export const GRADE_BUTTONS: { grade: ReviewGrade; label: string; tone: 'bad' | 'hard' | 'good' | 'easy' }[] = [
  { grade: 1, label: t('Не помню'), tone: 'bad' },
  { grade: 3, label: t('Трудно'),   tone: 'hard' },
  { grade: 4, label: t('Хорошо'),   tone: 'good' },
  { grade: 5, label: t('Легко'),    tone: 'easy' },
]

export interface SrsState {
  ease: number          // EF, ≥ 1.3
  intervalDays: number  // current interval
  reps: number          // consecutive successful reviews
  lapses: number        // times forgotten
  dueAt: string         // ISO date when the card is next due
}

export const INITIAL_SRS: Omit<SrsState, 'dueAt'> = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 }

const DAY_MS = 86_400_000

/** Apply one review with the given grade. `nowMs` is passed in (no hidden clock) so callers
 *  control time and the function stays pure/testable. */
export function review(state: Omit<SrsState, 'dueAt'>, grade: ReviewGrade, nowMs: number): SrsState {
  let { ease, intervalDays, reps, lapses } = state

  if (grade < 3) {
    // Lapse: reset progress, show again tomorrow.
    reps = 0
    lapses += 1
    intervalDays = 1
  } else {
    reps += 1
    if (reps === 1) intervalDays = 1
    else if (reps === 2) intervalDays = 6
    else intervalDays = Math.round(intervalDays * ease)
    // EF update (SM-2 formula), floored at 1.3.
    ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))
  }

  const dueAt = new Date(nowMs + intervalDays * DAY_MS).toISOString()
  return { ease: Math.round(ease * 1000) / 1000, intervalDays, reps, lapses, dueAt }
}

/** Human-readable next interval for UI ("через 3 дня"). */
export function intervalLabel(days: number): string {
  if (days <= 0) return t('сегодня')
  if (days === 1) return t('завтра')
  if (days < 5) return `${t('через')} ${days} ${t('дня')}`
  if (days < 30) return `${t('через')} ${days} ${t('дней')}`
  const m = Math.round(days / 30)
  return m === 1 ? t('через месяц') : `${t('через')} ${m} ${t('мес.')}`
}
