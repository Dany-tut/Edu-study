import { supabase } from './supabase'

// Сортировка обратной связи: обращения из формы и Telegram (feedback_items),
// темы со счётчиком (feedback_topics) и недельные сводки (feedback_digests).
// Схема и права — миграция 20261106120000_feedback_triage.sql, разбор моделью —
// Edge Function feedback-triage за флагом ai_feedback_triage.

export type FeedbackKind = 'bug' | 'question' | 'wish' | 'payment' | 'access'

export const FEEDBACK_KINDS: FeedbackKind[] = ['bug', 'question', 'wish', 'payment', 'access']

export const KIND_META: Record<FeedbackKind, { label: string; plural: string; bg: string; color: string }> = {
  bug:      { label: 'Ошибка',    plural: 'Ошибки',    bg: 'var(--color-red-soft)',     color: 'var(--color-red-text)' },
  question: { label: 'Вопрос',    plural: 'Вопросы',   bg: 'var(--color-accent-soft)',  color: 'var(--color-purple-text)' },
  wish:     { label: 'Пожелание', plural: 'Пожелания', bg: 'var(--color-green-soft)',   color: 'var(--color-green-text)' },
  payment:  { label: 'Оплата',    plural: 'Оплата',    bg: 'var(--color-yellow-soft)',  color: 'var(--color-yellow-text)' },
  // Голубой текст на голубой пилюле в светлой теме даёт 4.39:1 — ниже 4.5,
  // поэтому подложка нейтральная: 4.59:1 в светлой, синий остаётся носителем тона.
  access:   { label: 'Доступ',    plural: 'Доступ',    bg: 'var(--color-bg-3)',        color: 'var(--color-blue-pill-text)' },
}

// Тот же список, что в supabase/functions/feedback-triage/triage.ts.
export const TRIAGE_SCREENS = [
  'Главная', 'Расписание', 'Урок', 'Группы', 'Домашние задания', 'Журнал',
  'Курсы', 'Тренажёр', 'Конструктор', 'Финансы', 'Тариф', 'Профиль',
  'Вход', 'Админка', 'Приложение iOS', 'Другое',
] as const

export type FeedbackItem = {
  id: string
  source: 'form' | 'telegram'
  feedback_id: string | null
  tg_thread_id: string | null
  author_label: string | null
  section: string | null
  body: string
  created_at: string
  last_at: string
  kind: FeedbackKind | null
  screen: string | null
  topic_id: string | null
  kind_by: 'model' | 'admin' | null
  topic_by: 'model' | 'admin' | null
  triage_state: 'pending' | 'done' | 'failed'
  triage_error: string | null
}

export type FeedbackTopic = {
  id: string
  kind: FeedbackKind
  screen: string
  title: string
  summary: string | null
  status: 'open' | 'closed'
  source: 'model' | 'admin'
  created_at: string
  updated_at: string
}

export type FeedbackDigest = {
  id: string
  created_at: string
  period_days: number
  model: string
  body: string
  stats: { sentry?: { configured?: boolean; error?: string; issues?: unknown[] } } & Record<string, unknown>
}

export async function fetchTriage(): Promise<{ items: FeedbackItem[]; topics: FeedbackTopic[] }> {
  const [items, topics] = await Promise.all([
    supabase.from('feedback_items')
      .select('id, source, feedback_id, tg_thread_id, author_label, section, body, created_at, last_at, kind, screen, topic_id, kind_by, topic_by, triage_state, triage_error')
      .order('last_at', { ascending: false }).limit(1000),
    supabase.from('feedback_topics').select('*').order('updated_at', { ascending: false }).limit(500),
  ])
  return {
    items: (items.data as FeedbackItem[] | null) ?? [],
    topics: (topics.data as FeedbackTopic[] | null) ?? [],
  }
}

export async function fetchDigests(limit = 12): Promise<FeedbackDigest[]> {
  const { data } = await supabase.from('feedback_digests')
    .select('id, created_at, period_days, model, body, stats')
    .order('created_at', { ascending: false }).limit(limit)
  return (data as FeedbackDigest[] | null) ?? []
}

/** Подняты ли оба рубильника — общий и свой. */
export async function fetchTriageEnabled(): Promise<boolean> {
  const { data } = await supabase.from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_feedback_triage'])
  const on = (k: string) => (data ?? []).find(f => f.key === k)?.enabled === true
  return on('ai_enabled') && on('ai_feedback_triage')
}

const rpcError = (e: { message: string } | null) => (e ? e.message : null)

export async function classifyItem(id: string, kind: FeedbackKind | null, screen: string | null) {
  const { error } = await supabase.rpc('admin_feedback_item_classify', { p_item: id, p_kind: kind, p_screen: screen })
  return rpcError(error)
}

/** topic = null и newTitle = null — убрать из темы. Возвращает id темы. */
export async function moveItem(id: string, topic: string | null, newTitle: string | null = null) {
  const { data, error } = await supabase.rpc('admin_feedback_item_move', { p_item: id, p_topic: topic, p_new_title: newTitle })
  return { topicId: (data as string | null) ?? null, error: rpcError(error) }
}

export async function updateTopic(id: string, patch: { title?: string; kind?: FeedbackKind; screen?: string; status?: 'open' | 'closed' }) {
  const { error } = await supabase.rpc('admin_feedback_topic_update', {
    p_topic: id, p_title: patch.title ?? null, p_kind: patch.kind ?? null,
    p_screen: patch.screen ?? null, p_status: patch.status ?? null,
  })
  return rpcError(error)
}

export async function mergeTopics(from: string, into: string) {
  const { error } = await supabase.rpc('admin_feedback_topic_merge', { p_from: from, p_into: into })
  return rpcError(error)
}

export async function retriageItem(id: string) {
  const { error } = await supabase.rpc('admin_feedback_item_retriage', { p_item: id })
  return rpcError(error)
}

/** Платный вызов модели: только по кнопке. Ошибку функция отдаёт телом. */
export async function runTriage(mode: 'classify' | 'digest'): Promise<{ error: string | null; data?: unknown }> {
  const { data, error } = await supabase.functions.invoke('feedback-triage', { body: { mode, days: 7 } })
  if (error) {
    let msg = error.message
    try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg } catch { /**/ }
    return { error: msg }
  }
  if ((data as { error?: string })?.error) return { error: (data as { error: string }).error }
  return { error: null, data }
}
