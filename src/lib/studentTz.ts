import { create } from 'zustand'
import { browserTz } from './teacherTz'
import { supabase } from './supabase'
import { getAuthUser } from './owner'

const LOCAL_KEY = 'iskra:student-timezone'
type StudentTzState = {
  tz: string
  mode: 'auto' | 'manual'
  loaded: boolean
  load: () => Promise<void>
  setTz: (tz: string) => Promise<boolean>
  setMode: (mode: 'auto' | 'manual') => Promise<boolean>
}

export const useStudentTz = create<StudentTzState>((set, get) => ({
  tz: 'Europe/Moscow', mode: 'auto', loaded: false,
  async load() {
    if (get().loaded) return
    const user = await getAuthUser()
    const meta = user?.user_metadata ?? {}
    let local: { tz?: string; mode?: 'auto' | 'manual' } = {}
    try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') } catch { /* ignore corrupt local preference */ }
    const mode = (meta.timezone_mode ?? local.mode) === 'manual' ? 'manual' : 'auto'
    const tz = mode === 'manual' ? (meta.timezone ?? local.tz ?? browserTz()) : browserTz()
    set({ mode, tz, loaded: true })
    if (user && !meta.timezone_mode && !meta.timezone && !local.tz && !local.mode) void supabase.auth.updateUser({ data: { timezone: tz, timezone_mode: 'auto' } })
  },
  async setTz(tz) {
    set({ tz, mode: 'manual' })
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ tz, mode: 'manual' })) } catch { /* private mode */ }
    const { error } = await supabase.auth.updateUser({ data: { timezone: tz, timezone_mode: 'manual' } })
    return !error
  },
  async setMode(mode) {
    const tz = mode === 'auto' ? browserTz() : get().tz
    set({ mode, tz })
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ tz, mode })) } catch { /* private mode */ }
    const { error } = await supabase.auth.updateUser({ data: { timezone: tz, timezone_mode: mode } })
    return !error
  },
}))
