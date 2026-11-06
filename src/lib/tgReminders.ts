// Напоминания ученикам в Telegram (функция reminders,
// миграция 20261108100000_tg_reminders.sql).
//
// Клиент только читает и просит: права, время и отправку держит сервер.
// Ссылку t.me/<бот>?start=<код> собирает Edge Function tg-link (имя бота
// знает только она), отправку — reminders-send по крону.
import { supabase } from './supabase'
import { getAuthUser } from './owner'

export type TgLinkStatus = {
  linked: boolean
  username: string | null
  firstName: string | null
  blocked: boolean
  /** Живая неиспользованная ссылка действует до… */
  pendingUntil: string | null
}

export async function fetchTgLinkStatus(studentId: string): Promise<TgLinkStatus | null> {
  const { data, error } = await supabase.rpc('tg_link_status', { p_student: studentId })
  if (error) return null
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    linked: row.linked === true,
    username: (row.username as string | null) ?? null,
    firstName: (row.first_name as string | null) ?? null,
    blocked: !!row.blocked_at,
    pendingUntil: (row.pending_until as string | null) ?? null,
  }
}

export async function createTgLink(studentId: string): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('tg-link', { body: { student_id: studentId } })
  if (error || !data?.url) return { error: (data?.error as string) ?? 'failed' }
  return { url: data.url as string }
}

export async function unlinkTg(studentId: string): Promise<boolean> {
  const { error } = await supabase.rpc('tg_unlink', { p_student: studentId })
  return !error
}

export type ReminderSettings = {
  lessonSoon: boolean
  lessonOffsetMin: 30 | 60 | 120
  hwDue: boolean
  hwDueHour: 17 | 18 | 19
  hwLate: boolean
  hwLateMax: 1 | 3 | 5
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  lessonSoon: true, lessonOffsetMin: 60, hwDue: true, hwDueHour: 18, hwLate: true, hwLateMax: 3,
}

export async function fetchReminderSettings(): Promise<ReminderSettings | null> {
  const { data, error } = await supabase.rpc('my_reminder_settings')
  if (error) return null
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
  if (!r) return null
  return {
    lessonSoon: r.lesson_soon === true,
    lessonOffsetMin: Number(r.lesson_offset_min) as ReminderSettings['lessonOffsetMin'],
    hwDue: r.hw_due === true,
    hwDueHour: Number(r.hw_due_hour) as ReminderSettings['hwDueHour'],
    hwLate: r.hw_late === true,
    hwLateMax: Number(r.hw_late_max) as ReminderSettings['hwLateMax'],
  }
}

export async function saveReminderSettings(s: ReminderSettings): Promise<boolean> {
  const { error } = await supabase.rpc('set_my_reminder_settings', {
    p_lesson_soon: s.lessonSoon, p_lesson_offset_min: s.lessonOffsetMin,
    p_hw_due: s.hwDue, p_hw_due_hour: s.hwDueHour,
    p_hw_late: s.hwLate, p_hw_late_max: s.hwLateMax,
  })
  return !error
}

export type ReminderKind = 'lesson_soon' | 'hw_due' | 'hw_late'

export type CommsToday = {
  queued: number
  sent: number
  nextAt: string | null
  upcoming: { at: string; kind: ReminderKind; title: string; body: string; count: number; names: string[] }[]
  failed: { id: string; studentId: string; name: string; kind: ReminderKind; title: string; error: string; at: string }[]
  linked: number
  total: number
  unlinked: { id: string; name: string }[]
}

export function parseCommsToday(raw: unknown): CommsToday | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, any>
  const list = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, any>[]
  return {
    queued: Number(r.queued) || 0,
    sent: Number(r.sent) || 0,
    nextAt: r.next_at ?? null,
    upcoming: list(r.upcoming).map(u => ({ at: u.at, kind: u.kind, title: u.title ?? '', body: u.body ?? '', count: Number(u.count) || 0, names: Array.isArray(u.names) ? u.names : [] })),
    failed: list(r.failed).map(f => ({ id: f.id, studentId: f.student_id, name: f.name ?? '', kind: f.kind, title: f.title ?? '', error: f.error ?? '', at: f.at })),
    linked: Number(r.linked) || 0,
    total: Number(r.total) || 0,
    unlinked: list(r.unlinked).map(u => ({ id: u.id, name: u.name ?? '' })),
  }
}

// DEV: превью без входа учителя (как в parentReports) — 54 ученика, бот ни у кого.
// localStorage['iskra:dev-comms'] = 'busy' — очередь на сегодня и одно «не дошло».
function demoCommsToday(): CommsToday {
  const names = ['Алина Смирнова', 'Алиса Григорьева', 'Анна Морозова', 'Анна Петровна', 'Артём Соколов', 'Биба Бенкенс', 'Биба Бульдозер', 'Виктория Зайцева', 'Галя', 'Даниил Макаренко', 'Дарья Семёнова']
  const unlinked = Array.from({ length: 54 }, (_, i) => ({ id: `demo-s${i}`, name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '') }))
  let busy = false
  try { busy = localStorage.getItem('iskra:dev-comms') === 'busy' } catch { /* без хранилища — пустой день */ }
  if (!busy) return { queued: 0, sent: 0, nextAt: null, upcoming: [], failed: [], linked: 0, total: 54, unlinked }
  const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString() }
  return {
    queued: 7, sent: 3, nextAt: at(15),
    upcoming: [
      { at: at(15), kind: 'lesson_soon', title: 'Урок скоро', body: 'Через час урок «ОВР: метод баланса»', count: 4, names: names.slice(0, 4) },
      { at: at(18), kind: 'hw_due', title: 'ДЗ завтра', body: 'Завтра срок домашки «Клетка, линия 3»', count: 3, names: names.slice(4, 7) },
    ],
    failed: [{ id: 'demo-f1', studentId: 'demo-s3', name: 'Анна Морозова', kind: 'hw_late', title: 'ДЗ просрочено', error: 'blocked', at: at(10) }],
    linked: 12, total: 54, unlinked: unlinked.slice(12),
  }
}

export async function fetchCommsToday(): Promise<CommsToday | null> {
  if (import.meta.env.DEV && !(await getAuthUser())) return demoCommsToday()
  const { data, error } = await supabase.rpc('reminders_today')
  if (error) throw error
  return parseCommsToday(data)
}

/** Причина «не дошло» человеческими словами. */
export function failReason(error: string): string {
  if (error === 'blocked' || error === 'forbidden') return 'заблокировал бота'
  if (error === 'deactivated') return 'удалил аккаунт Telegram'
  if (error === 'chat_not_found') return 'чат с ботом не найден'
  return 'Telegram не принял сообщение'
}
