// Тарифы (этап «квоты + ручные счета», миграция 0037).
// Учитель БЕЗ подписки = внутренний/бета-аккаунт: лимиты не применяются,
// my_plan() возвращает пусто. Назначение тарифа — только админ (Админка).
import { supabase } from './supabase'

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
  { code: 'free', label: 'Бесплатный · до 3 учеников' },
  { code: 'solo', label: 'Соло · 690 ₽/мес · до 15' },
  { code: 'pro', label: 'Про · 1 690 ₽/мес · до 40' },
  { code: 'school', label: 'Школа · 4 490 ₽/мес · безлимит' },
] as const

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
  return `Достигнут лимит тарифа: ${max} учеников. Чтобы добавить ещё, обновите тариф — напишите нам или администратору.`
}

// ── Экран «По пользователям» (админка, миграция 0039) ────────────────────────
export interface UserActivityRow {
  actor_kind: string        // teacher | admin | student | anon
  actor_id: string
  name: string
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
  plan_code: string | null
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
