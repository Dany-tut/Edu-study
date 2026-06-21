import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
  | 'payment_due'

export type NotifLink = { page?: string; lessonRef?: string; subject?: string; studentId?: string; assignmentId?: string }

export type Notification = {
  id: string
  type: NotifType
  title: string
  body: string
  createdAt: number
  read: boolean
  live: boolean
  action?: { label: string; page?: string }
  /** Deep-link payload (e.g. lessonRef) — used by the popup to navigate on click. */
  link?: NotifLink | null
}

/** Row shape coming from public.notifications (DB / realtime payload). */
export type NotifRow = {
  id: string
  recipient_id: string
  recipient_role: 'student' | 'teacher'
  type: string
  title: string
  body: string
  link: { page?: string; lessonRef?: string; subject?: string; studentId?: string; assignmentId?: string } | null
  read: boolean
  created_at: string
}

function rowToNotif(row: NotifRow, live: boolean): Notification {
  // Only teacher rows get a navigable action (student routes are not deep-linkable yet).
  const action =
    row.recipient_role === 'teacher' && row.link?.page
      ? { label: 'Открыть', page: row.link.page }
      : undefined
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
  recipientId: string | null

  /** Local-only insert (kept for any in-app, non-persisted notification). */
  add: (n: Omit<Notification, 'id' | 'createdAt' | 'read' | 'live'>) => string
  /** Replace the list with rows fetched from the DB (historical, not "live"). */
  hydrate: (rows: NotifRow[]) => void
  /** Insert a single realtime row as a live notification (rings the bell, toasts). */
  ingest: (row: NotifRow) => void
  /** Apply a realtime UPDATE (e.g. read-state synced from another device). */
  applyUpdate: (row: NotifRow) => void
  setRecipient: (id: string | null) => void
  reset: () => void

  markRead: (id: string) => void
  markAllRead: () => void
  dismissLive: (id: string) => void
  unreadCount: () => number
}

export const useNotificationsStore = create<State>()((set, get) => ({
  notifications: [],
  recipientId: null,

  add: (n) => {
    const id = crypto.randomUUID()
    set(state => ({
      notifications: [{
        ...n,
        id,
        createdAt: Date.now(),
        read: false,
        live: true,
      }, ...state.notifications],
    }))
    return id
  },

  hydrate: (rows) => set({
    notifications: rows
      .map(r => rowToNotif(r, false))
      .sort((a, b) => b.createdAt - a.createdAt),
  }),

  ingest: (row) => set(state => {
    if (state.notifications.some(n => n.id === row.id)) return state
    return { notifications: [rowToNotif(row, true), ...state.notifications] }
  }),

  applyUpdate: (row) => set(state => ({
    notifications: state.notifications.map(n =>
      n.id === row.id ? { ...n, read: row.read, title: row.title, body: row.body } : n
    ),
  })),

  setRecipient: (id) => set({ recipientId: id }),
  reset: () => set({ notifications: [], recipientId: null }),

  markRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
    // Persist (DB-backed rows have uuid ids; local-only rows simply no-op server-side).
    void supabase.from('notifications').update({ read: true }).eq('id', id)
  },

  markAllRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    }))
    const rid = get().recipientId
    if (rid) void supabase.from('notifications').update({ read: true }).eq('recipient_id', rid).eq('read', false)
  },

  dismissLive: (id) => set(state => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, live: false } : n
    ),
  })),

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}))
