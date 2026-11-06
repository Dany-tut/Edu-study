/**
 * Пакетное подтверждение предоценок ИИ и сводка расхождений ИИ с учителем
 * (миграция 20261106120000_hw_ai_corrections_batch).
 *
 * Что «уверенно», решает база (iskra_private.hw_ai_grade_doubt): балл есть,
 * в заданиях КИМ все элементы — «есть» с найденной цитатой или «нет», без
 * «частично», без цитат с фото, без авторских заданий и не по линии, где
 * учитель недавно дважды поправлял ИИ. Здесь только подписи причин.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type AiDoubt = 'hard' | 'no_score' | 'author' | 'photo' | 'partial' | 'quote' | 'line'

export const DOUBT_LABEL: Record<AiDoubt, string> = {
  hard: 'сложные задания',
  no_score: 'нет балла по критериям',
  author: 'авторские задания',
  photo: 'решение на фото',
  partial: 'частично верные элементы',
  quote: 'цитата не нашлась в ответе',
  line: 'линия, где вы часто поправляете ИИ',
}

export interface AiBatchItem { id: string; progressId: string; score: number | null; doubt: AiDoubt | null }
export interface AiBatchPreview { sure: AiBatchItem[]; disputed: AiBatchItem[] }

const EMPTY: AiBatchPreview = { sure: [], disputed: [] }

export async function fetchAiBatchPreview(): Promise<AiBatchPreview> {
  const { data, error } = await supabase.rpc('hw_ai_grade_batch_preview')
  if (error) throw error
  const items = ((data ?? []) as { id: string; progress_id: string; score: number | null; doubt: string | null }[])
    .map(r => ({ id: r.id, progressId: r.progress_id, score: r.score, doubt: (r.doubt as AiDoubt | null) ?? null }))
  return { sure: items.filter(i => !i.doubt), disputed: items.filter(i => !!i.doubt) }
}

/** Применяет уверенные. База перепроверяет каждую; возвращает id применённых. */
export async function applyAiBatch(ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  const { data, error } = await supabase.rpc('hw_ai_grade_apply_batch', { p_ids: ids })
  if (error) throw error
  return (data ?? []) as string[]
}

/** Причины спорных: «частично верные элементы — 2, решение на фото — 1». */
export function doubtSummary(items: AiBatchItem[]): { doubt: AiDoubt; count: number }[] {
  const counts = new Map<AiDoubt, number>()
  for (const i of items) if (i.doubt) counts.set(i.doubt, (counts.get(i.doubt) ?? 0) + 1)
  return [...counts].map(([doubt, count]) => ({ doubt, count })).sort((a, b) => b.count - a.count)
}

/** Откуда полоса берёт данные. По умолчанию — база; DEV-стенд подставляет свой. */
export interface AiBatchSource {
  preview: () => Promise<{ preview: AiBatchPreview; known: boolean }>
  apply: (ids: string[]) => Promise<string[]>
  agreement: () => Promise<AiAgreement>
}

export const supabaseAiBatchSource: AiBatchSource = {
  async preview() {
    const [preview, any] = await Promise.all([
      fetchAiBatchPreview(),
      supabase.from('hw_ai_grades').select('id', { count: 'exact', head: true }),
    ])
    return { preview, known: (any.count ?? 0) > 0 }
  },
  apply: applyAiBatch,
  agreement: () => fetchAiAgreement(),
}

/** Превью пакета; перечитывается при reload и при смене очереди (key). */
export function useAiBatchPreview(key: string, source: AiBatchSource = supabaseAiBatchSource) {
  const [preview, setPreview] = useState<AiBatchPreview>(EMPTY)
  const [error, setError] = useState(false)
  /** У учителя вообще есть предоценки ИИ — иначе полосу не показываем. */
  const [known, setKnown] = useState(false)
  const seq = useRef(0)
  const reload = useCallback(async () => {
    const n = ++seq.current
    try {
      const next = await source.preview()
      if (n === seq.current) { setPreview(next.preview); setKnown(next.known); setError(false) }
    } catch { if (n === seq.current) setError(true) }
  }, [source])
  useEffect(() => { void reload() }, [reload, key])
  return { preview, known, error, reload }
}

// ── Сводка: где ИИ расходится с учителем ────────────────────────────────────

export interface AiCorrection {
  gradeId: string; kind: string; kimN: number | null; diff: 'score' | 'comment'
  aiScore: number | null; teacherScore: number | null; aiMark: number | null; teacherMark: number | null
  createdAt: string
}

export interface AiLineStat { kimN: number | null; total: number; over: number; under: number; comment: number }
export interface AiAgreement {
  /** Работ, где учитель утвердил балл ИИ без своего замечания. */
  agreed: number
  /** Работы с поправкой: ИИ завысил / занизил / балл тот же, замечание своё. */
  over: number; under: number; commentOnly: number
  lines: AiLineStat[]
}

/** ИИ завысил (+1), занизил (−1), балл совпал (0). */
export function direction(c: AiCorrection): -1 | 0 | 1 {
  const ai = c.kind === 'hard' ? c.aiMark : c.aiScore
  const teacher = c.kind === 'hard' ? c.teacherMark : c.teacherScore
  if (c.diff !== 'score' || ai == null || teacher == null || ai === teacher) return 0
  return ai > teacher ? 1 : -1
}

/**
 * Плитки считают работы, линии — задания. Работа «завышена», если хоть одно
 * её задание завышено; иначе «занижена»; иначе «только замечание».
 * confirmed — работ, где учитель оставил балл ИИ.
 */
export function summarizeAgreement(corrections: AiCorrection[], confirmed: number): AiAgreement {
  const works = new Map<string, Set<number>>()
  const lines = new Map<string, AiLineStat>()
  for (const c of corrections) {
    const d = direction(c)
    works.set(c.gradeId, (works.get(c.gradeId) ?? new Set()).add(d))
    const k = String(c.kimN ?? 'own')
    const s = lines.get(k) ?? { kimN: c.kimN, total: 0, over: 0, under: 0, comment: 0 }
    s.total++
    if (d > 0) s.over++; else if (d < 0) s.under++; else s.comment++
    lines.set(k, s)
  }
  let over = 0, under = 0, commentOnly = 0
  for (const ds of works.values()) { if (ds.has(1)) over++; else if (ds.has(-1)) under++; else commentOnly++ }
  return {
    agreed: Math.max(0, confirmed - commentOnly), over, under, commentOnly,
    lines: [...lines.values()].sort((a, b) => b.total - a.total || (a.kimN ?? 999) - (b.kimN ?? 999)),
  }
}

export async function fetchAiAgreement(days = 90): Promise<AiAgreement> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const [corrections, decided] = await Promise.all([
    supabase.from('hw_ai_corrections')
      .select('grade_id, kind, kim_n, diff, ai_score, teacher_score, ai_mark, teacher_mark, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    supabase.from('hw_ai_grades').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('confirmed_at', since),
  ])
  if (corrections.error) throw corrections.error
  if (decided.error) throw decided.error
  const rows = (corrections.data ?? []).map(r => ({
    gradeId: r.grade_id, kind: r.kind, kimN: r.kim_n, diff: r.diff, aiScore: r.ai_score, teacherScore: r.teacher_score,
    aiMark: r.ai_mark, teacherMark: r.teacher_mark, createdAt: r.created_at,
  } satisfies AiCorrection))
  return summarizeAgreement(rows, decided.count ?? 0)
}
