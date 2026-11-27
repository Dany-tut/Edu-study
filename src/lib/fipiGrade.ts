// ─── Проверка заданий банка ФИПИ в тренажёре ────────────────────────────────
//
// Задание ФИПИ лежит в task_bank как обычная строка, а всё, что нужно для
// бланка, — в payload.fipi (см. FipiPayload). Ответ хранится в task.answer
// ровно в формате бланка ЕГЭ/ОГЭ:
//   select   — цифры под буквами подряд: «4543»;
//   check    — номера выбранных вариантов по возрастанию: «25»;
//   text     — как вписывают в бланк: «2,24», «3142», «рибосома»;
//   extended — пусто: часть 2 проверяет сам ученик по критериям.
//
// ПРАВИЛА БАЛЛОВ — те же названия, что у Тестли (lib/tests.ts, scoringFor):
// all_or_nothing, per_item, ege_minus_one («одна ошибка — минус балл»),
// one_error_minus_one, criteria. Так один и тот же ключ задания значит одно и
// то же в обоих продуктах.

import type { Task } from '../data/taskBankData'

export type FipiKind = 'select' | 'check' | 'text' | 'extended'

export interface FipiCriterion { label: string; text: string; max: number }

export interface FipiPayload {
  kind: FipiKind
  /** select: подписи клеток бланка (А, Б, В… или X, Y) */
  cells?: string[]
  /** select: какие цифры можно вписать (из вариантов ФИПИ) */
  digits?: string[]
  /** check: варианты ответа (HTML) по порядку номеров — если ФИПИ дал их отдельно */
  options?: string[]
  /** check: сколько вариантов (номера 1…n). У ФИПИ варианты обычно внутри условия. */
  n?: number
  /** extended: эталон «содержание верного ответа» */
  reference?: string
  /** extended: критерии оценивания */
  criteria?: FipiCriterion[]
  /** Общий текст группы заданий (HTML) */
  groupHtml?: string
  /** Откуда ключ: сверен с ключом ФИПИ или поставлен ИИ (часть 2 — всегда ИИ) */
  answerSource?: 'fipi' | 'ai'
  /** Формат старше КИМ 2026, но по содержанию задание относится к линии */
  oldFormat?: boolean
}

export function fipiOf(task: Pick<Task, 'payload'>): FipiPayload | null {
  const f = (task.payload as { fipi?: FipiPayload } | undefined)?.fipi
  return f && typeof f === 'object' && f.kind ? f : null
}

export interface FipiResult {
  got: number
  max: number
  /** select: индексы неверных клеток; check: номера лишних и пропущенных */
  wrong: number[]
  /** Ответ засчитан полностью */
  full: boolean
}

/** Нормализация короткого ответа: регистр, пробелы, точка = запятая, ё = е. */
export function normShort(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, '').replace(/\./g, ',')
}

function byWrong(scoring: Task['scoring'], max: number, wrong: number, total: number): number {
  if (!total) return 0
  switch (scoring) {
    case 'per_item': return Math.max(0, Math.round(((total - wrong) / total) * max * 100) / 100)
    case 'ege_minus_one':
    case 'one_error_minus_one': return wrong === 0 ? max : wrong === 1 ? Math.max(0, max - 1) : 0
    default: return wrong === 0 ? max : 0
  }
}

/**
 * Проверить ответ ученика. value — строка в формате бланка (как task.answer).
 * Для части 2 (extended) не вызывается: там балл — сумма отмеченных критериев.
 */
export function gradeFipi(task: Pick<Task, 'answer' | 'maxPoints' | 'scoring' | 'payload'>, value: string): FipiResult {
  const f = fipiOf(task)
  const max = task.maxPoints ?? 1
  const key = task.answer ?? ''
  if (!f || f.kind === 'extended') return { got: 0, max, wrong: [], full: false }
  if (f.kind === 'select') {
    const want = [...key.replace(/\s/g, '')]
    const got = [...value.replace(/\s/g, '')]
    const wrong = want.map((d, i) => (got[i] === d ? -1 : i)).filter(i => i >= 0)
    const g = byWrong(task.scoring, max, wrong.length, want.length)
    return { got: g, max, wrong, full: wrong.length === 0 }
  }
  if (f.kind === 'check') {
    const want = new Set([...key.replace(/\D/g, '')])
    const got = new Set([...value.replace(/\D/g, '')])
    const extra = [...got].filter(d => !want.has(d))
    const missing = [...want].filter(d => !got.has(d))
    const wrong = [...extra, ...missing].map(Number).sort((a, b) => a - b)
    // ФИПИ: «одна ошибка» — одна цифра неверна, ИЛИ лишняя, ИЛИ отсутствует.
    // Замена одной цифры другой — это ОДНА ошибка (в Тестли считалась двумя).
    const errors = Math.max(extra.length, missing.length)
    const g = byWrong(task.scoring, max, errors, want.size)
    return { got: g, max, wrong, full: errors === 0 }
  }
  // text: несколько допустимых ответов через «|»; число сверяем по значению
  const variants = key.split('|').map(normShort).filter(Boolean)
  const v = normShort(value)
  const num = (s: string) => (/^-?\d+(,\d+)?$/.test(s) ? Number(s.replace(',', '.')) : NaN)
  const ok = variants.some(w => w === v || (!Number.isNaN(num(w)) && num(w) === num(v)))
  return { got: ok ? max : 0, max, wrong: ok ? [] : [0], full: ok }
}

/** Правило баллов для линии: 1 балл — всё или ничего; больше — «одна ошибка — минус балл». */
export function scoringForLine(kind: FipiKind, points: number): NonNullable<Task['scoring']> {
  if (kind === 'extended') return 'criteria'
  if (points <= 1 || kind === 'text') return 'all_or_nothing'
  return 'ege_minus_one'
}
