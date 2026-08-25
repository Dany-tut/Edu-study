import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { useDashboard } from '../store/dashboardStore'
import { useTint } from '../store/tintStore'
import { isTintLevel, type TintLevel } from './courseTint'

type SavedPrefs = {
  avatarId?: string
  widgetColumns?: 1 | 2 | 3
  widgetOrder?: number[]
  pomoTimerMode?: 'timer' | 'stopwatch'
  pomoFocusDuration?: number
  /** Глубина перекраски под курс. */
  tintLevel?: TintLevel
  /** Личные цвета предметов ученика: id → hex. Бьют учительские. */
  subjectColors?: Record<string, string>
}

// Loads student preferences from students.preferences on mount and syncs
// back to Supabase whenever they change.
export function useStudentPrefsSync() {
  const setAvatarId = useDashboard(s => s.setAvatarId)
  const setWidgetColumns = useDashboard(s => s.setWidgetColumns)
  const setWidgetOrder = useDashboard(s => s.setWidgetOrder)
  const setHiddenWidgets = useDashboard(s => s.setHiddenWidgets)

  const setTintLevel = useTint(s => s.setLevel)
  const setStudentColors = useTint(s => s.setStudentColors)
  const setTeacherColors = useTint(s => s.setTeacherColors)

  const avatarId = useDashboard(s => s.avatarId)
  const widgetColumns = useDashboard(s => s.widgetColumns)
  const widgetOrder = useDashboard(s => s.widgetOrder)
  const pomoTimerMode = useDashboard(s => s.pomoTimerMode)
  const pomoFocusDuration = useDashboard(s => s.pomoFocusDuration)
  const tintLevel = useTint(s => s.level)
  const subjectColors = useTint(s => s.studentColors)

  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount
  useEffect(() => {
    const session = getStudentSession()
    if (!session?.id) return
    supabase
      .from('students')
      .select('preferences, hidden_widgets')
      .eq('id', session.id)
      .single()
      .then(({ data }: { data: { preferences: SavedPrefs; hidden_widgets: number[] | null } | null }) => {
        if (!data) return
        // Teacher-controlled hard-hide — applied even when the student has no
        // saved preferences yet (a freshly-created student).
        setHiddenWidgets(Array.isArray(data.hidden_widgets) ? data.hidden_widgets : [])
        const p = data.preferences as SavedPrefs
        if (p) {
          if (p.avatarId) setAvatarId(p.avatarId)
          if (p.widgetColumns) setWidgetColumns(p.widgetColumns)
          if (p.widgetOrder?.length) setWidgetOrder(p.widgetOrder)
          if (isTintLevel(p.tintLevel)) setTintLevel(p.tintLevel)
          if (p.subjectColors) setStudentColors(p.subjectColors)
        }
        loaded.current = true
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // База цветов учителя. Своя строка profiles ученику не видна (политики 0026),
  // поэтому карту отдаёт RPC по его student-id. Легаси-вход без auth-пользователя
  // не пройдёт гейт и просто останется на цветах реестра.
  useEffect(() => {
    const session = getStudentSession()
    if (!session?.id) return
    supabase.rpc('subject_colors_for_student', { p_student: session.id })
      .then(({ data }: { data: Record<string, string> | null }) => {
        if (data && typeof data === 'object') setTeacherColors(data)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save on change (debounced 1.5s, skip before initial load returns)
  useEffect(() => {
    if (!loaded.current) return
    const session = getStudentSession()
    if (!session?.id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase
        .from('students')
        .update({ preferences: { avatarId, widgetColumns, widgetOrder, pomoTimerMode, pomoFocusDuration, tintLevel, subjectColors } })
        .eq('id', session.id)
        .then(() => {})
    }, 1500)
  }, [avatarId, widgetColumns, widgetOrder, pomoTimerMode, pomoFocusDuration, tintLevel, subjectColors])
}
