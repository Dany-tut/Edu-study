import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { useDashboard } from '../store/dashboardStore'

type SavedPrefs = {
  avatarId?: string
  widgetColumns?: 1 | 2 | 3
  widgetOrder?: number[]
  pomoTimerMode?: 'timer' | 'stopwatch'
  pomoFocusDuration?: number
}

// Loads student preferences from students.preferences on mount and syncs
// back to Supabase whenever they change.
export function useStudentPrefsSync() {
  const setAvatarId = useDashboard(s => s.setAvatarId)
  const setWidgetColumns = useDashboard(s => s.setWidgetColumns)
  const setWidgetOrder = useDashboard(s => s.setWidgetOrder)

  const avatarId = useDashboard(s => s.avatarId)
  const widgetColumns = useDashboard(s => s.widgetColumns)
  const widgetOrder = useDashboard(s => s.widgetOrder)
  const pomoTimerMode = useDashboard(s => s.pomoTimerMode)
  const pomoFocusDuration = useDashboard(s => s.pomoFocusDuration)

  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount
  useEffect(() => {
    const session = getStudentSession()
    if (!session?.id) return
    supabase
      .from('students')
      .select('preferences')
      .eq('id', session.id)
      .single()
      .then(({ data }: { data: { preferences: SavedPrefs } | null }) => {
        if (!data?.preferences) return
        const p = data.preferences as SavedPrefs
        if (p.avatarId) setAvatarId(p.avatarId)
        if (p.widgetColumns) setWidgetColumns(p.widgetColumns)
        if (p.widgetOrder?.length) setWidgetOrder(p.widgetOrder)
        loaded.current = true
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
        .update({ preferences: { avatarId, widgetColumns, widgetOrder, pomoTimerMode, pomoFocusDuration } })
        .eq('id', session.id)
    }, 1500)
  }, [avatarId, widgetColumns, widgetOrder, pomoTimerMode, pomoFocusDuration])
}
