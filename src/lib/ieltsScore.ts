// ─────────────────────────────────────────────────────────────────────────────
// Подсчёт пробника IELTS: ответы → сырой балл → band → итог
//
// ТАБЛИЦЫ ПЕРЕВОДА. Официальной таблицы нет: она меняется от версии к версии
// теста, чтобы уравнять трудность. Ниже — распространённые ориентиры, по
// которым готовят к экзамену (их же печатают подготовительные пособия); пробник
// честно называет свой балл ориентировочным. Для Reading — Academic: у General
// Training таблица другая, строже.
//
// ИТОГ. Среднее четырёх секций, округлённое к ближайшей половине; ровно .25
// поднимается до .5, ровно .75 — до целого. Это правило опубликовано
// организаторами, тут ничего не приблизительно.
// ─────────────────────────────────────────────────────────────────────────────

import type { MockQuestion } from '../data/ieltsMocks'

/** [минимум верных, band] по убыванию. */
const LISTENING_BANDS: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5],
  [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
]

const READING_ACADEMIC_BANDS: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5],
  [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
]

function bandFrom(table: [number, number][], raw: number): number {
  for (const [min, band] of table) if (raw >= min) return band
  return 0
}

export const listeningBand = (raw: number) => bandFrom(LISTENING_BANDS, raw)
export const readingBand = (raw: number) => bandFrom(READING_ACADEMIC_BANDS, raw)

/**
 * Сколько верных нужно на целевой балл — подсказка «до 7.0 не хватило трёх».
 * undefined — балл недостижим по этой таблице.
 */
export function rawFor(section: 'listening' | 'reading', band: number): number | undefined {
  const table = section === 'listening' ? LISTENING_BANDS : READING_ACADEMIC_BANDS
  const row = [...table].reverse().find(([, b]) => b >= band)
  return row?.[0]
}

/** Округление IELTS: к ближайшей половине, .25 и .75 — вверх. */
export function roundBand(x: number): number {
  const whole = Math.floor(x)
  const frac = x - whole
  if (frac < 0.25) return whole
  if (frac < 0.75) return whole + 0.5
  return whole + 1
}

/** Итог по секциям, которые есть. Меньше четырёх — итога нет. */
export function overallBand(bands: (number | null | undefined)[]): number | null {
  const got = bands.filter((b): b is number => typeof b === 'number')
  if (got.length < 4) return null
  return roundBand(got.reduce((a, b) => a + b, 0) / got.length)
}

/**
 * Writing: Task 2 весит вдвое больше Task 1. Итог секции округляется так же,
 * как общий, — к ближайшей половине.
 */
export function writingBand(task1: number | null, task2: number | null): number | null {
  if (task1 == null && task2 == null) return null
  if (task1 == null) return task2
  if (task2 == null) return task1
  return roundBand((task1 + 2 * task2) / 3)
}

/**
 * Нормализация ответа. Регистр, крайние пробелы, двойные пробелы, концевая
 * точка и знак фунта — не в счёт. Орфография — в счёт: на экзамене слово с
 * ошибкой не засчитывается. Артикль в начале снимается: «a passport» и
 * «passport» на бланке засчитываются одинаково, если артикль не нарушает
 * лимит слов.
 */
export function normAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[£$€]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;!?]+$/, '')
    .replace(/^(a|an|the) /, '')
}

export function isCorrect(q: MockQuestion, given: string | undefined): boolean {
  if (!given?.trim()) return false
  const g = normAnswer(given)
  return q.answer.some(a => normAnswer(a) === g)
}

export function rawScore(questions: MockQuestion[], answers: Record<number, string>): number {
  return questions.reduce((n, q) => n + (isCorrect(q, answers[q.n]) ? 1 : 0), 0)
}

/** Число слов так, как его считает компьютерный экзамен: по пробелам. */
export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

/** Band одной цифрой для подписи: 7 → «7.0», 6.5 → «6.5». */
export const fmtBand = (b: number | null | undefined) => (b == null ? '—' : b.toFixed(1))
