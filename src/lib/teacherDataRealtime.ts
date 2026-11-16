import { supabase } from './supabase'

export type TeacherDataTable =
  | 'students'
  | 'groups'
  | 'homework'
  | 'lesson_progress'
  | 'lesson_attendance'
  | 'schedule_lessons'
  | 'teacher_lesson_sessions'
  | 'courses'
  | 'course_modules'

export type TeacherDataChange = {
  table: TeacherDataTable
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC'
  newRecord: Record<string, unknown>
  oldRecord: Record<string, unknown>
}

type Listener = (change: TeacherDataChange) => void

const tables: TeacherDataTable[] = [
  'students', 'groups', 'homework', 'lesson_progress', 'lesson_attendance',
  'schedule_lessons', 'teacher_lesson_sessions', 'courses', 'course_modules',
]
const listeners = new Set<{ tables: Set<TeacherDataTable>; callback: Listener }>()
let channel: ReturnType<typeof supabase.channel> | null = null
let stopTimer: ReturnType<typeof setTimeout> | null = null

function start() {
  if (channel) return
  channel = supabase.channel(`teacher-data-${crypto.randomUUID()}`)
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
      const change: TeacherDataChange = {
        table,
        eventType: payload.eventType,
        newRecord: (payload.new ?? {}) as Record<string, unknown>,
        oldRecord: (payload.old ?? {}) as Record<string, unknown>,
      }
      for (const listener of listeners) {
        if (listener.tables.has(table)) listener.callback(change)
      }
    })
  }
  channel.subscribe(status => {
    // Re-read each live view after initial join and every reconnect. This closes
    // the snapshot/subscription race and recovers changes sent while offline.
    if (status !== 'SUBSCRIBED') return
    for (const table of tables) {
      const change: TeacherDataChange = { table, eventType: 'SYNC', newRecord: {}, oldRecord: {} }
      for (const listener of listeners) {
        if (listener.tables.has(table)) listener.callback(change)
      }
    }
  })
}

/**
 * One Realtime channel for the teacher workspace. Screens subscribe only to
 * the tables they display, while the transport is shared across all hooks.
 */
export function subscribeTeacherDataChanges(tablesToWatch: TeacherDataTable[], callback: Listener) {
  const entry = { tables: new Set(tablesToWatch), callback }
  listeners.add(entry)
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
  start()
  return () => {
    listeners.delete(entry)
    if (!listeners.size && channel && !stopTimer) {
      // Avoid tearing down/recreating the socket during React StrictMode remounts.
      stopTimer = setTimeout(() => {
        stopTimer = null
        if (listeners.size || !channel) return
        const current = channel
        channel = null
        void supabase.removeChannel(current)
      }, 2_000)
    }
  }
}

/** Coalesce initial-sync and burst events for shared list queries. */
export function subscribeTeacherDataReload(tablesToWatch: TeacherDataTable[], reload: () => void, delayMs = 120) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const unsubscribe = subscribeTeacherDataChanges(tablesToWatch, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; reload() }, delayMs)
  })
  return () => {
    unsubscribe()
    if (timer) clearTimeout(timer)
  }
}
