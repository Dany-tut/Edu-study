/**
 * Предоценки ДЗ ИИ (hw_ai_grades, миграция 0116) для экрана проверки.
 *
 * Учитель читает только свои строки (RLS). Пишет их функция hw-grade, а
 * решение учителя отмечает hw_ai_grade_confirm() — после того как проверка
 * уже записана прежним путём (reviewHomework).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type AiGradeStatus =
  | 'pending' | 'working' | 'graded' | 'confirmed' | 'changed' | 'error' | 'skipped' | 'dismissed'

export interface AiGradeElement { text: string; verdict: 'yes' | 'partial' | 'no'; quote: string; from?: 'text' | 'photo'; ref: string; counted: boolean }
export interface AiGradeTask {
  n: number; kim_n: number | null; max_points: number; points: number
  /** Сложное задание: ключ вкладки и оценка 1–5 по проценту первичных. */
  key?: string; mark?: number
  elements: AiGradeElement[]; comment: string; note: string
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
  attemptId?: string
  submittedAt?: string
  nextRetryAt?: string | null
}

/** Предоценки по строкам lesson_progress. Пока ИИ проверяет — опрос раз в 10 с. */
export function useAiGrades(progressIds: string[]): { byProgress: Map<string, AiGrade>; reload: () => Promise<void>; error: string; loading: boolean } {
  const [byProgress, setByProgress] = useState<Map<string, AiGrade>>(new Map())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const key = [...new Set(progressIds)].sort().join(',')
  const activeKey = useRef(key)
  const sequence = useRef(0)
  activeKey.current = key
  const load = useCallback(async () => {
    const seq = ++sequence.current
    if (!key) { setByProgress(new Map()); setLoading(false); setError(''); return }
    const { data, error: failure } = await supabase.from('hw_ai_grades')
      .select('id, progress_id, status, score, primary_score, max_score, comment, result, error, submitted_at, next_retry_at')
      .in('progress_id', key.split(','))
    if (activeKey.current !== key || seq !== sequence.current) return
    setLoading(false)
    if (failure) { setError('unavailable'); return }
    setError('')
    setByProgress(new Map((data ?? []).map(r => [r.progress_id, {
      id:r.id, progressId:r.progress_id, status:r.status, score:r.score,
      primary:r.primary_score, max:r.max_score, comment:r.comment ?? '',
      teacherNote:r.result?.teacher_note ?? '', tasks:Array.isArray(r.result?.tasks) ? r.result.tasks : [],
      error:r.error ?? '', attemptId:r.result?.attempt_id ?? undefined,
      submittedAt:r.submitted_at, nextRetryAt:r.next_retry_at,
    } satisfies AiGrade])))
  }, [key])
  useEffect(() => { setByProgress(new Map()); setLoading(!!key); void load() }, [key,load])
  const waiting = !!key && (byProgress.size < key.split(',').length || !!error || [...byProgress.values()].some(g => g.status === 'pending' || g.status === 'working' || !!g.nextRetryAt))
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => { void load() }, 10_000)
    return () => clearInterval(id)
  }, [waiting,load])
  return { byProgress, reload:load, error, loading }
}

export type AiRequestResult = { ok: boolean; error?: string }
export async function requestAiGrade(progressId: string, retry = false): Promise<AiRequestResult> {
  try {
    const { data, error } = await supabase.functions.invoke('hw-grade-run', { body:{ action:retry ? 'retry' : 'start', progressId } })
    if (error) {
      const context = error.context
      if (context instanceof Response) {
        const body = await context.json().catch(() => ({}))
        return { ok:false, error:body.error || 'unavailable' }
      }
      return { ok:false, error:'unavailable' }
    }
    return data?.ok ? { ok:true } : { ok:false, error:data?.error || 'unavailable' }
  } catch { return { ok:false, error:'unavailable' } }
}

/** Учитель поставил балл после предоценки: confirmed, если совпал с ИИ, иначе changed. */
export async function confirmAiGrade(id: string, score: number): Promise<boolean> {
  const { error } = await supabase.rpc('hw_ai_grade_confirm', { p_id: id, p_score: score })
  if (error) { console.error('[confirmAiGrade]', error); return false }
  return true
}
