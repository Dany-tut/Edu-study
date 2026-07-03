import { create } from 'zustand'
import { supabase } from './supabase'
import type { TeacherPage } from '../store/teacherStore'

// ── Nav tabs that can be gated ─────────────────────────────────────────────
// These ids match profiles.hidden_tabs entries and the nav item ids.
export type TeacherTabId = 'home' | 'groups' | 'homework' | 'gradebook' | 'constructor' | 'finances'

export const TEACHER_TABS: { id: TeacherTabId; label: string }[] = [
  { id: 'home',        label: 'Главная' },
  { id: 'groups',      label: 'Группы' },
  { id: 'homework',    label: 'ДЗ' },
  { id: 'gradebook',   label: 'Журнал' },
  { id: 'constructor', label: 'Конструктор' },
  { id: 'finances',    label: 'Финансы' },
]

// Which nav tab a given (sub-)page belongs to. Pages that map to `null` are
// always allowed (self-service / admin-only pages guard themselves).
const PAGE_TAB: Record<TeacherPage, TeacherTabId | null> = {
  home: 'home',
  groups: 'groups',
  student: 'groups',
  homework: 'homework',
  'homework-create': 'homework',
  'homework-review': 'homework',
  'hard-review': 'homework',
  gradebook: 'gradebook',
  constructor: 'constructor',
  'course-editor': 'constructor',
  'lesson-editor': 'constructor',
  finances: 'finances',
  payment: 'finances',
  storage: null,
  admin: null,
  'profile-settings': null,
}

export function pageTab(page: TeacherPage): TeacherTabId | null {
  return PAGE_TAB[page] ?? null
}

// ── Access store ───────────────────────────────────────────────────────────
type AccessState = {
  loaded: boolean
  isAdmin: boolean
  hiddenTabs: string[]
  hiddenWidgets: string[]
  load: () => Promise<void>
  canTab: (id: TeacherTabId) => boolean
  canPage: (page: TeacherPage) => boolean
  canWidget: (type: string) => boolean
}

export const useTeacherAccess = create<AccessState>((set, get) => ({
  loaded: false,
  isAdmin: false,
  hiddenTabs: [],
  hiddenWidgets: [],

  load: async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'
    // Admins are never restricted; skip the profile read for them.
    if (!user || isAdmin) {
      set({ loaded: true, isAdmin: !!isAdmin, hiddenTabs: [], hiddenWidgets: [] })
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('hidden_tabs, hidden_widgets')
      .eq('id', user.id)
      .maybeSingle()
    set({
      loaded: true,
      isAdmin: false,
      hiddenTabs: (data?.hidden_tabs as string[] | null) ?? [],
      hiddenWidgets: (data?.hidden_widgets as string[] | null) ?? [],
    })
  },

  canTab: id => get().isAdmin || !get().hiddenTabs.includes(id),
  canPage: page => {
    const tab = pageTab(page)
    return tab === null || get().canTab(tab)
  },
  canWidget: type => get().isAdmin || !get().hiddenWidgets.includes(type),
}))
