/**
 * Предоценки ДЗ ИИ (hw_ai_grades, миграция 0116) для экрана проверки.
 *
 * Учитель читает только свои строки (RLS). Пишет их функция hw-grade, а
 * решение учителя отмечает hw_ai_grade_confirm() — после того как проверка
 * уже записана прежним путём (reviewHomework).
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type AiGradeStatus =
  | 'pending' | 'working' | 'graded' | 'confirmed' | 'changed' | 'error' | 'skipped' | 'dismissed'

export interface AiGradeElement { text: string; verdict: 'yes' | 'partial' | 'no'; quote: string; ref: string; counted: boolean }
export interface AiGradeTask {
  n: number; kim_n: number | null; max_points: number; points: number
  elements: AiGradeElement[]; note: string
}

export interface AiGrade {
  id: string
  progressId: string
  status: AiGradeStatus
  /** Предложение в шкале экрана проверки, 0–100. */
  score: number | null
  primary: number | null
  max: number | null
  comment: string
  teacherNote: string
  tasks: AiGradeTask[]
  error: string
}

/** Предоценки по строкам lesson_progress. Пока ИИ проверяет — опрос раз в 20 с. */
export function useAiGrades(progressIds: string[]): { byProgress: Map<string, AiGrade>; reload: () => Promise<void> } {
  const [byProgress, setByProgress] = useState<Map<string, AiGrade>>(new Map())
  const key = [...progressIds].sort().join(',')

  const load = useCallback(async () => {
    if (!key) { setByProgress(new Map()); return }
    const { data, error } = await supabase
      .from('hw_ai_grades')
      .select('id, progress_id, status, score, primary_score, max_score, comment, result, error')
      .in('progress_id', key.split(','))
    if (error) { console.error('[useAiGrades]', error); return }
    setByProgress(new Map((data ?? []).map((r: any) => [r.progress_id, {
      id: r.id,
      progressId: r.progress_id,
      status: r.status,
      score: r.score,
      primary: r.primary_score,
      max: r.max_score,
      comment: r.comment ?? '',
      teacherNote: r.result?.teacher_note ?? '',
      tasks: Array.isArray(r.result?.tasks) ? r.result.tasks : [],
      error: r.error ?? '',
    } satisfies AiGrade])))
  }, [key])

  useEffect(() => { void load() }, [load])

  const waiting = [...byProgress.values()].some(g => g.status === 'pending' || g.status === 'working')
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => { void load() }, 20_000)
    return () => clearInterval(id)
  }, [waiting, load])

  return { byProgress, reload: load }
}

/** Учитель поставил балл после предоценки: confirmed, если совпал с ИИ, иначе changed. */
export async function confirmAiGrade(id: string, score: number): Promise<boolean> {
  const { error } = await supabase.rpc('hw_ai_grade_confirm', { p_id: id, p_score: score })
  if (error) { console.error('[confirmAiGrade]', error); return false }
  return true
}
