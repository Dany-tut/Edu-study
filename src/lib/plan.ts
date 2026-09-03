// Тарифы (этап «квоты + ручные счета», миграция 0037).
// Учитель БЕЗ подписки = внутренний/бета-аккаунт: лимиты не применяются,
// my_plan() возвращает пусто. Назначение тарифа — только админ (Админка).
import { supabase } from './supabase'
import { t, type Lang } from './i18n'

export interface MyPlan {
  plan_code: string
  plan_name: string
  price_rub: number
  max_students: number | null
  expires_at: string | null
  status: string
  students_used: number
}

export interface TeacherPlanRow {
  teacher_id: string
  plan_code: string
  plan_name: string
  expires_at: string | null
  status: string
}

export const PLAN_OPTIONS = [
  { code: null, label: 'Без тарифа (бета)' },
  { code: 'free', label: 'Бесплатный · до 2 учеников' },
  { code: 'basic', label: 'Базовый · 490 ₽/мес · до 5' },
  { code: 'pro', label: 'Про · 990 ₽/мес · до 15' },
  { code: 'school', label: 'Школа · 2 490 ₽/мес · до 30' },
  { code: 'unlimited', label: 'Безлимит · 4 990 ₽/мес · безлимит' },
] as const

// Тарифы для витрины (мобильный экран «Тариф»). Оплата пока не подключена —
// выбор тарифа = заявка в «Обратную связь», админ назначает вручную.
export interface PlanTier {
  code: 'free' | 'basic' | 'pro' | 'school' | 'unlimited'
  name: string
  priceRub: number
  priceUsd: number
  maxStudents: number | null
  tagline: string
  features: string[]
}

export const PLAN_TIERS: PlanTier[] = [
  {
    code: 'free', name: 'Бесплатный', priceRub: 0, priceUsd: 0, maxStudents: 2,
    tagline: 'Попробовать платформу',
    features: ['До 2 учеников', 'Курсы и тренажёр', 'Проверка домашних заданий'],
  },
  {
    code: 'basic', name: 'Базовый', priceRub: 490, priceUsd: 6, maxStudents: 5,
    tagline: 'Для старта',
    features: ['До 5 учеников', 'Все возможности «Бесплатного»', 'Журнал и финансы'],
  },
  {
    code: 'pro', name: 'Про', priceRub: 990, priceUsd: 12, maxStudents: 15,
    tagline: 'Для репетитора',
    features: ['До 15 учеников', 'Все возможности «Базового»', 'Аналитика по ученикам', 'Группы и назначенные ДЗ'],
  },
  {
    code: 'school', name: 'Школа', priceRub: 2490, priceUsd: 29, maxStudents: 30,
    tagline: 'Для практики на потоке',
    features: ['До 30 учеников', 'Все возможности «Про»', 'Приоритетная поддержка'],
  },
  {
    code: 'unlimited', name: 'Безлимит', priceRub: 4990, priceUsd: 59, maxStudents: null,
    tagline: 'Для школы или центра',
    features: ['Без лимита учеников', 'Все возможности «Школы»', 'Несколько преподавателей', 'Персональный менеджер'],
  },
]

// Цена тарифа в валюте локали: RU → рубли, EN → доллары. `full`=false отдаёт
// только сумму («990 ₽» / «$12»); для нулевой цены сумму «0 ₽» / «$0».
export function planPrice(tier: { priceRub: number; priceUsd: number }, lang: Lang): string {
  return lang === 'en'
    ? `$${tier.priceUsd}`
    : `${tier.priceRub.toLocaleString('ru-RU')} ₽`
}

/** Подпись периода: «мес» / «mo» (через словарь). */
export function planPeriod(): string { return t('мес') }

/** Тариф текущего учителя; null = подписка не назначена (лимитов нет). */
export async function fetchMyPlan(): Promise<MyPlan | null> {
  const { data, error } = await supabase.rpc('my_plan')
  if (error) { console.error('fetchMyPlan:', error); return null }
  const row = Array.isArray(data) ? data[0] : null
  return (row as MyPlan | undefined) ?? null
}

/** Все назначенные подписки (только админ). */
export async function fetchTeacherPlans(): Promise<Map<string, TeacherPlanRow>> {
  const { data, error } = await supabase.rpc('admin_teacher_plans')
  const map = new Map<string, TeacherPlanRow>()
  if (error) { console.error('fetchTeacherPlans:', error); return map }
  for (const r of (data ?? []) as TeacherPlanRow[]) map.set(r.teacher_id, r)
  return map
}

/** Назначить/сменить тариф; plan = null снимает подписку. Только админ. */
export async function adminSetTeacherPlan(
  teacherId: string,
  plan: string | null,
  expiresAt?: string | null,
  note?: string | null,
): Promise<string | null> {
  const { error } = await supabase.rpc('admin_set_teacher_plan', {
    p_teacher: teacherId,
    p_plan: plan,
    p_expires: expiresAt ?? null,
    p_note: note ?? null,
  })
  return error ? error.message : null
}

/**
 * Квота учеников: триггер students_enforce_limit кидает "STUDENT_LIMIT:<max>".
 * Возвращает max из сообщения об ошибке или null, если ошибка не про лимит.
 */
export function parseStudentLimitError(err: unknown): number | null {
  const msg = (err as { message?: string } | null)?.message ?? String(err ?? '')
  const m = msg.match(/STUDENT_LIMIT:(\d+)/)
  return m ? Number(m[1]) : null
}

export function studentLimitMessage(max: number): string {
  return `${t('Достигнут лимит тарифа:')} ${max} ${t('учеников. Чтобы добавить ещё, обновите тариф — напишите нам или администратору.')}`
}

// ── Экран «По пользователям» (админка, миграция 0039) ────────────────────────
export interface UserActivityRow {
  actor_kind: string        // teacher | admin | student | anon
  actor_id: string
  name: string
  email: string | null   // настоящая из auth.users, иначе ученический логин
  sessions: number
  active_min: number        // ≈ heartbeat-минуты (вкладка открыта)
  events: number
  logins: number
  last_seen: string | null
  first_seen: string | null
}

export interface TeacherUsageRow {
  teacher_id: string
  name: string
  email: string | null
  plan_code: string | null
  expires_at: string | null
  total_students: number
  active_students: number
  active_min: number
  sessions: number
  last_seen: string | null
}

export async function fetchUserActivity(days = 30): Promise<UserActivityRow[]> {
  const { data, error } = await supabase.rpc('admin_user_activity', { p_days: days })
  if (error) { console.error('fetchUserActivity:', error); return [] }
  return (data ?? []) as UserActivityRow[]
}

export async function fetchTeacherUsage(days = 30): Promise<TeacherUsageRow[]> {
  const { data, error } = await supabase.rpc('admin_teacher_usage', { p_days: days })
  if (error) { console.error('fetchTeacherUsage:', error); return [] }
  return (data ?? []) as TeacherUsageRow[]
}
