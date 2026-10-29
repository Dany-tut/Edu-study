import { create } from 'zustand'
import { supabase } from './supabase'
import type { TeacherPage } from '../store/teacherStore'
import { getAuthUser } from './owner'

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
  'cards-editor': 'constructor',
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
  /** Вошёл учитель (не админ, не аноним dev-обхода) — у него есть строка в profiles. */
  isTeacher: boolean
  hiddenTabs: string[]
  hiddenWidgets: string[]
  // «Мои предметы» (profiles.subjects): id реестра + свои строкой. EMPTY = ещё не выбрал = все.
  subjects: string[]
  load: () => Promise<void>
  /** Учитель сам меняет свои предметы (профиль, разовое окно). false — не записалось. */
  saveSubjects: (subjects: string[]) => Promise<boolean>
  canTab: (id: TeacherTabId) => boolean
  canPage: (page: TeacherPage) => boolean
  canWidget: (type: string) => boolean
}

export const useTeacherAccess = create<AccessState>((set, get) => ({
  loaded: false,
  isAdmin: false,
  isTeacher: false,
  hiddenTabs: [],
  hiddenWidgets: [],
  subjects: [],

  load: async () => {
    // Роль админа — решение о ПРАВЕ, поэтому здесь нужен проверенный сервером
    // ответ, а не сохранённая сессия. Общий кеш: один запрос на страницу.
    const user = await getAuthUser()
    // Trust ONLY app_metadata (server-controlled). user_metadata is client-editable,
    // so keying admin off it lets a teacher unhide restricted tabs/widgets locally.
    const isAdmin = user?.app_metadata?.role === 'admin'
    // Admins are never restricted; skip the profile read for them.
    if (!user || isAdmin) {
      set({ loaded: true, isAdmin: !!isAdmin, isTeacher: false, hiddenTabs: [], hiddenWidgets: [], subjects: [] })
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('hidden_tabs, hidden_widgets, subjects')
      .eq('id', user.id)
      .maybeSingle()
    set({
      loaded: true,
      isAdmin: false,
      isTeacher: true,
      hiddenTabs: (data?.hidden_tabs as string[] | null) ?? [],
      hiddenWidgets: (data?.hidden_widgets as string[] | null) ?? [],
      subjects: (data?.subjects as string[] | null) ?? [],
    })
  },

  saveSubjects: async subjects => {
    const user = await getAuthUser()
    if (!user) return false
    const prev = get().subjects
    set({ subjects })
    // select: под RLS запрет update не даёт ошибки, только ноль строк.
    const { data, error } = await supabase.from('profiles').update({ subjects }).eq('id', user.id).select('id')
    if (error || !data?.length) { set({ subjects: prev }); return false }
    return true
  },

  canTab: id => get().isAdmin || !get().hiddenTabs.includes(id),
  canPage: page => {
    const tab = pageTab(page)
    return tab === null || get().canTab(tab)
  },
  canWidget: type => get().isAdmin || !get().hiddenWidgets.includes(type),
}))
