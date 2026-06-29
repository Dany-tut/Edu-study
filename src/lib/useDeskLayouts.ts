import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'

export type LayoutItem = {
  i: string        // react-grid-layout id
  type: string     // widget type key
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxH?: number
}

export type Desk = {
  id: string
  name: string
  icon: string
  items: LayoutItem[]
}

export type DeskConfig = {
  desks: Desk[]
  activeDeskId: string
}

export const DEFAULT_DESKS: Desk[] = [
  {
    id: 'today',
    name: 'Сегодня',
    icon: 'layout-dashboard',
    items: [
      { i: 'today-stats',     type: 'today-stats',     x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2, maxH: 2 },
      { i: 'today-schedule',  type: 'today-schedule',  x: 0, y: 2, w: 7,  h: 5, minW: 4, minH: 3 },
      { i: 'today-reminders', type: 'today-reminders', x: 7, y: 2, w: 5,  h: 5, minW: 3, minH: 3 },
      { i: 'today-tasks',     type: 'today-tasks',     x: 0, y: 7, w: 7,  h: 5, minW: 4, minH: 3 },
    ],
  },
  {
    id: 'finances',
    name: 'Финансы',
    icon: 'wallet',
    items: [
      { i: 'finance-kpi',      type: 'finance-kpi',      x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2, maxH: 2 },
      { i: 'finance-overdue',  type: 'finance-overdue',  x: 0, y: 2, w: 6,  h: 5, minW: 4, minH: 3 },
      { i: 'finance-activity', type: 'finance-activity', x: 6, y: 2, w: 6,  h: 5, minW: 4, minH: 3 },
    ],
  },
  {
    id: 'students',
    name: 'Ученики',
    icon: 'users',
    items: [
      { i: 'student-stats',      type: 'student-stats',      x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2, maxH: 2 },
      { i: 'groups-list',        type: 'groups-list',        x: 0, y: 2, w: 6,  h: 5, minW: 4, minH: 3 },
      { i: 'attention-students', type: 'attention-students', x: 6, y: 2, w: 6,  h: 5, minW: 4, minH: 3 },
    ],
  },
]

export const DEFAULT_CONFIG: DeskConfig = {
  desks: DEFAULT_DESKS,
  activeDeskId: 'today',
}

export function useDeskLayouts() {
  const [config, setConfig] = useState<DeskConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return }
      const { data: row } = await supabase
        .from('desk_layouts')
        .select('desks, active_desk_id')
        .eq('teacher_id', data.user.id)
        .maybeSingle()
      if (row && Array.isArray(row.desks) && row.desks.length > 0) {
        // Merge: if a saved desk has no items but DEFAULT_DESKS has defaults for it, apply them
        const builtInIds = new Set(DEFAULT_DESKS.map(d => d.id))
        const merged = (row.desks as Desk[]).map(d => {
          // Always reset built-in desk items to current defaults so layout
          // changes (new widgets, updated sizes) take effect on next load.
          if (builtInIds.has(d.id)) {
            const def = DEFAULT_DESKS.find(dd => dd.id === d.id)
            if (def) return { ...d, items: def.items }
          }
          return d
        })
        const mergedConfig = { desks: merged, activeDeskId: row.active_desk_id }
        setConfig(mergedConfig)
        // Force-save corrected layout so stale Supabase values don't come back on next load
        supabase.from('desk_layouts').upsert(
          { teacher_id: data.user.id, desks: mergedConfig.desks, active_desk_id: mergedConfig.activeDeskId },
          { onConflict: 'teacher_id' }
        )
      }
      setLoading(false)
    })
  }, [])

  const persistConfig = useCallback(async (next: DeskConfig) => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    await supabase.from('desk_layouts').upsert(
      { teacher_id: data.user.id, desks: next.desks, active_desk_id: next.activeDeskId },
      { onConflict: 'teacher_id' }
    )
  }, [])

  const update = useCallback((next: DeskConfig) => {
    setConfig(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persistConfig(next), 1000)
  }, [persistConfig])

  const setActiveDesk = useCallback((id: string) => {
    update({ ...config, activeDeskId: id })
  }, [config, update])

  const addDesk = useCallback((name: string) => {
    const id = `desk-${Date.now()}`
    const next = {
      ...config,
      desks: [...config.desks, { id, name, icon: 'layout-grid', items: [] }],
      activeDeskId: id,
    }
    update(next)
  }, [config, update])

  const removeDesk = useCallback((id: string) => {
    if (id === 'today') return
    const next = {
      desks: config.desks.filter(d => d.id !== id),
      activeDeskId: config.activeDeskId === id ? 'today' : config.activeDeskId,
    }
    update(next)
  }, [config, update])

  const updateDeskItems = useCallback((deskId: string, items: LayoutItem[]) => {
    update({
      ...config,
      desks: config.desks.map(d => d.id === deskId ? { ...d, items } : d),
    })
  }, [config, update])

  const addWidget = useCallback((deskId: string, item: LayoutItem) => {
    const desk = config.desks.find(d => d.id === deskId)
    if (!desk) return
    update({
      ...config,
      desks: config.desks.map(d =>
        d.id === deskId ? { ...d, items: [...d.items, item] } : d
      ),
    })
  }, [config, update])

  const removeWidget = useCallback((deskId: string, itemId: string) => {
    update({
      ...config,
      desks: config.desks.map(d =>
        d.id === deskId ? { ...d, items: d.items.filter(i => i.i !== itemId) } : d
      ),
    })
  }, [config, update])

  const resetDesk = useCallback((deskId: string) => {
    const def = DEFAULT_DESKS.find(d => d.id === deskId)
    if (!def) return
    update({
      ...config,
      desks: config.desks.map(d => d.id === deskId ? { ...def } : d),
    })
  }, [config, update])

  const activeDesk = config.desks.find(d => d.id === config.activeDeskId) ?? config.desks[0]

  return {
    config, loading, activeDesk,
    setActiveDesk, addDesk, removeDesk,
    updateDeskItems, addWidget, removeWidget, resetDesk,
  }
}
