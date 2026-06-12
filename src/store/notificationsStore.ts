import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotifType =
  | 'homework_assigned'
  | 'homework_graded'
  | 'homework_submitted'
  | 'lesson_unlocked'
  | 'quiz_available'
  | 'student_joined'
  | 'deadline_approaching'
  | 'achievement'

export type Notification = {
  id: string
  type: NotifType
  title: string
  body: string
  createdAt: number
  read: boolean
  live: boolean  // true = пришло в текущей сессии → показать toast
  action?: { label: string; page?: string }
}

type State = {
  notifications: Notification[]
  add: (n: Omit<Notification, 'id' | 'createdAt' | 'read' | 'live'>) => string
  markRead: (id: string) => void
  markAllRead: () => void
  dismissLive: (id: string) => void
  unreadCount: () => number
}

export const useNotificationsStore = create<State>()(
  persist(
    (set, get) => ({
      notifications: [],

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

      markRead: (id) => set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),

      markAllRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      })),

      dismissLive: (id) => set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, live: false } : n
        ),
      })),

      unreadCount: () => get().notifications.filter(n => !n.read).length,
    }),
    {
      name: 'edu-notifications',
      // On rehydrate — all stored notifications lose live flag (they're "old")
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notifications = state.notifications.map(n => ({ ...n, live: false }))
        }
      },
    }
  )
)
