import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { teacherStudentHash } from '../lib/teacherStudentRoute'

export type NotifType =
  // legacy / local types
  | 'homework_assigned'
  | 'homework_graded'
  | 'homework_submitted'
  | 'lesson_unlocked'
  | 'quiz_available'
  | 'student_joined'
  | 'deadline_approaching'
  | 'achievement'
  // DB-backed event types (see 0005_notifications.sql, 0006_notifications_teacher_events.sql)
  | 'hw_returned'
  | 'hw_graded'
  | 'hw_submitted'
  | 'test_assigned'
  | 'test_completed'
  | 'payment_due'
  | 'fill_journal'
  // перенос и отмена занятия (0121_schedule_reschedule.sql)
  | 'lesson_moved'
  | 'lesson_cancelled'
  // вышла новая версия модуля расшифровки (lib/transcriptionModuleUpdate.ts)
  | 'module_update'

export type NotifLink = { page?: string; tab?: string; lessonRef?: string; subject?: string; studentId?: string; assignmentId?: string; homeworkId?: string; scheduleId?: string }

/** Куда ведёт «Открыть»: полный адрес кабинета + вкладка конструктора, если нужна. */
export type NotifAction = { label: string; page?: string; tab?: string }

export type Notification = {
  id: string
  type: NotifType
  title: string
  body: string
  createdAt: number
  read: boolean
  live: boolean
  action?: NotifAction
  /** Deep-link payload (e.g. lessonRef) — used by the popup to navigate on click. */
  link?: NotifLink | null
  /** Создано в браузере (журнал, напоминание дневника), в базе его нет. */
  local?: boolean
}

/** Row shape coming from public.notifications (DB / realtime payload). */
export type NotifRow = {
  id: string
  recipient_id: string
  recipient_role: 'student' | 'teacher'
  type: string
  title: string
  body: string
  link: NotifLink | null
  read: boolean
  created_at: string
}

const LOCAL_READ_KEY = 'notif_local_read'
function getLocalRead(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LOCAL_READ_KEY) || '[]')) } catch { return new Set() }
}
function persistLocalRead(ids: string[]) {
  try {
    const existing = getLocalRead()
    ids.forEach(id => existing.add(id))
    localStorage.setItem(LOCAL_READ_KEY, JSON.stringify([...existing]))
  } catch {}
}

/**
 * Отправить запрос в Supabase. PostgREST-билдер ЛЕНИВЫЙ: сеть дёргается только
 * внутри `.then()`, поэтому `void supabase.from(...).update(...)` не отправляет
 * ничего вообще (прочитанное не сохранялось и возвращалось после F5).
 */
function runUpdate(ctx: string, q: PromiseLike<{ error: unknown }>) {
  q.then(({ error }) => { if (error) console.error(`[notifications:${ctx}]`, error) })
}

/**
 * Адрес кабинета учителя для уведомления. Старые записи несут адреса, которых
 * в навигации нет (`teacher/testing`, `teacher/homework`) — сводим их к живым.
 */
function teacherTarget(row: NotifRow): NotifAction | undefined {
  const link = row.link
  const open = t('Открыть')
  if ((row.type === 'student_joined' || row.type === 'payment_due') && link?.studentId)
    return { label: open, page: teacherStudentHash(link.studentId) }
  if (row.type === 'test_completed' || link?.page === 'teacher/testing')
    return { label: open, page: '#/teacher/constructor', tab: link?.tab ?? 'testing' }
  if (row.type === 'hw_submitted' || link?.page === 'teacher/homework')
    return { label: open, page: '#/teacher/gradebook' }
  if (link?.page) return { label: open, page: link.page.startsWith('#') ? link.page : `#/${link.page}` }
  return undefined
}

/** Событие для конструктора: открыть вкладку, даже если он уже на экране. */
export const CONSTRUCTOR_TAB_EVENT = 'iskra:constructor-tab'

/** Перейти по действию уведомления (колокольчик, тост, таблетка — одно место). */
export function followNotifAction(action: NotifAction | undefined): boolean {
  if (!action?.page) return false
  if (action.tab && action.page.startsWith('#/teacher/profile')) {
    // Раздел профиля («Интеграции»): страница читает его при открытии,
    // а уже открытая — ловит событие.
    try { sessionStorage.setItem('profile_section', action.tab) } catch {}
    window.dispatchEvent(new CustomEvent('iskra:profile-section', { detail: action.tab }))
  } else if (action.tab) {
    try { localStorage.setItem('constructor-active-tab', action.tab) } catch {}
    window.dispatchEvent(new CustomEvent(CONSTRUCTOR_TAB_EVENT, { detail: action.tab }))
  }
  window.location.hash = action.page
  return true
}

function rowToNotif(row: NotifRow, live: boolean): Notification {
  const action = row.recipient_role === 'teacher' ? teacherTarget(row) : undefined
  return {
    id: row.id,
    type: row.type as NotifType,
    title: row.title,
    body: row.body,
    createdAt: Date.parse(row.created_at),
    read: row.read,
    live,
    action,
    link: row.link,
  }
}

type State = {
  notifications: Notification[]
  /** Все получатели этого кабинета: у ученика — каждая строка-трек человека. */
  recipientIds: string[]

  /** Local-only insert (kept for any in-app, non-persisted notification). */
  add: (n: Omit<Notification, 'id' | 'createdAt' | 'read' | 'live'>) => string
  /** Replace the list with rows fetched from the DB (historical, not "live"). */
  hydrate: (rows: NotifRow[]) => void
  /** Insert a single realtime row as a live notification (rings the bell, toasts). */
  ingest: (row: NotifRow) => void
  /** Apply a realtime UPDATE (e.g. read-state synced from another device). */
  applyUpdate: (row: NotifRow) => void
  setRecipients: (ids: string[]) => void
  reset: () => void

  markRead: (id: string) => void
  markAllRead: () => void
  dismissLive: (id: string) => void
  unreadCount: () => number
  /** Replace all local fill_journal notifications with fresh ones. */
  syncJournalNotifs: (items: Array<{ id: string; title: string; body: string }>) => void
}

export const useNotificationsStore = create<State>()((set, get) => ({
  notifications: [],
  recipientIds: [],

  add: (n) => {
    const id = crypto.randomUUID()
    set(state => ({
      notifications: [{
        ...n,
        id,
        createdAt: Date.now(),
        read: false,
        live: true,
        local: true,
      }, ...state.notifications],
    }))
    return id
  },

  // Локальные (журнал, напоминания дневника) в базе не лежат: загрузка истории
  // их не заменяет, иначе они пропадали, если ответ приходил позже них.
  hydrate: (rows) => set(state => ({
    notifications: [
      ...state.notifications.filter(n => n.local),
      ...rows.map(r => rowToNotif(r, false)),
    ].sort((a, b) => b.createdAt - a.createdAt),
  })),

  ingest: (row) => set(state => {
    if (state.notifications.some(n => n.id === row.id)) return state
    return { notifications: [rowToNotif(row, true), ...state.notifications] }
  }),

  applyUpdate: (row) => set(state => ({
    notifications: state.notifications.map(n =>
      n.id === row.id ? { ...n, read: row.read, title: row.title, body: row.body } : n
    ),
  })),

  setRecipients: (ids) => set({ recipientIds: ids }),
  // Локальные (напоминания дневника, журнал) в базе не лежат: при пересоздании
  // подписки — охват ученика догрузился — они не должны пропадать.
  reset: () => set(state => ({ notifications: state.notifications.filter(n => n.local), recipientIds: [] })),

  markRead: (id) => {
    const local = get().notifications.find(n => n.id === id)?.local
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
    if (id.startsWith('journal-')) {
      persistLocalRead([id])
    } else if (!local) {
      runUpdate('markRead', supabase.from('notifications').update({ read: true }).eq('id', id))
    }
  },

  markAllRead: () => {
    const dbIds = get().notifications
      .filter(n => !n.read && !n.local)
      .map(n => n.id)
    set(state => {
      const updated = state.notifications.map(n => ({ ...n, read: true }))
      const localIds = updated.filter(n => n.id.startsWith('journal-')).map(n => n.id)
      if (localIds.length) persistLocalRead(localIds)
      return { notifications: updated }
    })
    const rids = get().recipientIds
    // По получателям — если они известны; иначе по списку id (кабинет мог
    // отрисовать уведомления до того, как initNotifications их выставил).
    if (rids.length) {
      runUpdate('markAllRead', supabase.from('notifications').update({ read: true }).in('recipient_id', rids).eq('read', false))
    } else if (dbIds.length) {
      runUpdate('markAllRead', supabase.from('notifications').update({ read: true }).in('id', dbIds))
    }
  },

  dismissLive: (id) => set(state => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, live: false } : n
    ),
  })),

  unreadCount: () => get().notifications.filter(n => !n.read).length,

  syncJournalNotifs: (items) => set(state => {
    const prevById = new Map(
      state.notifications.filter(n => n.type === 'fill_journal').map(n => [n.id, n])
    )
    const localRead = getLocalRead()
    const kept = state.notifications.filter(n => n.type !== 'fill_journal')
    const fresh: Notification[] = items.map(it => {
      const id = `journal-${it.id}`
      return {
        id,
        type: 'fill_journal' as NotifType,
        title: it.title,
        body: it.body,
        createdAt: prevById.get(id)?.createdAt ?? Date.now(),
        read: localRead.has(id) || (prevById.get(id)?.read ?? false),
        live: false,
        local: true,
        action: { label: t('Заполнить'), page: '#/teacher/gradebook' },
      }
    })
    return { notifications: [...fresh, ...kept] }
  }),
}))
