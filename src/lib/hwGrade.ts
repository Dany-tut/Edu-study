// Разбор развёрнутого ответа моделью по критериям экзамена — клиентская сторона.
//
// Предложение пишет только функция hw-grade (service_role), учитель меняет
// лишь своё решение: status / teacher_points / teacher_marks / teacher_note.
// Поля модели база не даст переписать (триггер hw_grades_freeze_ai, 0103).
//
// Балл при правке считается тем же kimScore, что и в функции: иначе учитель
// видел бы одно число, а в базу ложилось бы другое.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  kimScore,
  type KimItem, type KimVerdict, type ElementMark, type DeductionMark,
} from '../../supabase/functions/_shared/kimScore'

export type { KimVerdict } from '../../supabase/functions/_shared/kimScore'

export type AiElement = { id: string; label?: string; text: string; verdict: KimVerdict; quote: string; why?: string }
export type KimRef = { exam: string; year: number; n: number }

export type HwGrade = {
  id: string
  progress_id: string
  task_key: string
  solution_id: string
  kim_exam: string
  kim_year: number
  kim_n: number
  max_points: number
  ai_elements: AiElement[]
  ai_deductions: DeductionMark[]
  ai_points: number | null
  ai_model: string | null
  ai_at: string | null
  ai_warnings: string[]
  status: 'suggested' | 'confirmed' | 'changed'
  teacher_points: number | null
  teacher_marks: { id: string; verdict: KimVerdict }[] | null
  teacher_note: string | null
  decided_at: string | null
}

/** Итоговый балл строки: решение учителя, иначе предложение модели. */
export const gradePoints = (g: HwGrade): number | null => g.teacher_points ?? g.ai_points

// ─── Рубильник ───────────────────────────────────────────────────────────────
// Оба флага, как в функции. Выключено — панели нет вовсе, экран как раньше.
let flagPromise: Promise<boolean> | null = null
export function hwGradeEnabled(): Promise<boolean> {
  flagPromise ??= (async () => {
    const { data } = await supabase.from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_hw_grade'])
    const on = new Set((data ?? []).filter(f => f.enabled).map(f => f.key))
    return on.has('ai_enabled') && on.has('ai_hw_grade')
  })()
  return flagPromise
}

export function useHwGradeEnabled(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => { let alive = true; void hwGradeEnabled().then(v => { if (alive) setOn(v) }); return () => { alive = false } }, [])
  return on
}

// ─── Атлас ───────────────────────────────────────────────────────────────────
const atlasCache = new Map<string, Promise<KimItem | null>>()
export function kimItem(ref: KimRef): Promise<KimItem | null> {
  const k = `${ref.exam}:${ref.year}:${ref.n}`
  let p = atlasCache.get(k)
  if (!p) {
    p = (async () => {
      const { data } = await supabase.from('kim_atlas').select('*')
        .eq('exam', ref.exam).eq('year', ref.year).eq('n', ref.n).maybeSingle()
      return (data as KimItem | null) ?? null
    })()
    atlasCache.set(k, p)
  }
  return p
}

/** Номера части 2 с правилом — для выбора номера, когда задание не привязано. */
export async function gradableKimItems(): Promise<Pick<KimItem, 'exam' | 'year' | 'n' | 'max_points'>[]> {
  const { data } = await supabase.from('kim_atlas').select('exam, year, n, max_points')
    .eq('part', 2).not('rule', 'is', null).order('exam').order('n')
  return (data ?? []) as Pick<KimItem, 'exam' | 'year' | 'n' | 'max_points'>[]
}

/** Балл после правки учителя: его отметки поверх отметок модели. */
export function rescore(item: KimItem, g: HwGrade, verdicts: Record<string, KimVerdict>): number {
  const marks: ElementMark[] = g.ai_elements.map(e => {
    const v = verdicts[e.id] ?? e.verdict
    // Учитель сам видит работу: его «есть» засчитывается и без цитаты модели.
    return { id: e.id, verdict: v, quote: v === 'yes' ? (e.quote || 'учитель') : e.quote }
  })
  return kimScore(item, g.ai_elements.map(e => e.id), marks, g.ai_deductions).points
}

// ─── Чтение и запись ─────────────────────────────────────────────────────────

export function useHwGrades(progressId: string | null) {
  const [grades, setGrades] = useState<HwGrade[]>([])
  const load = useCallback(async () => {
    if (!progressId) { setGrades([]); return }
    const { data } = await supabase.from('hw_grades').select('*')
      .eq('progress_id', progressId).order('created_at', { ascending: false })
    setGrades((data ?? []) as HwGrade[])
  }, [progressId])
  useEffect(() => { void load() }, [load])
  return { grades, reload: load }
}

export type RequestResult = { ok: true } | { ok: false; error: string; need?: 'kim' | 'key' }

export async function requestHwGrade(progressId: string, taskKey: string, opts: { kim?: KimRef; force?: boolean } = {}): Promise<RequestResult> {
  const { error } = await supabase.functions.invoke('hw-grade', { body: { progressId, taskKey, ...opts } })
  if (!error) return { ok: true }
  // Тело ошибки функции ({ error, need }) лежит в ответе FunctionsHttpError.
  let msg = error.message
  let need: 'kim' | 'key' | undefined
  try {
    const body = await (error as { context?: Response }).context?.json()
    if (body?.error) msg = body.error
    if (body?.need === 'kim' || body?.need === 'key') need = body.need
  } catch { /* не JSON — остаётся общее сообщение */ }
  return { ok: false, error: msg, need }
}

export async function decideHwGrade(id: string, d: {
  status: 'confirmed' | 'changed'
  points: number
  marks?: { id: string; verdict: KimVerdict }[] | null
  note?: string | null
}): Promise<boolean> {
  const { error } = await supabase.from('hw_grades').update({
    status: d.status,
    teacher_points: d.points,
    teacher_marks: d.marks ?? null,
    teacher_note: d.note?.trim() || null,
  }).eq('id', id)
  if (error) console.error('decideHwGrade:', error)
  return !error
}
