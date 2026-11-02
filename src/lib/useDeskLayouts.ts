import { useEffect, useState, useCallback, useRef } from 'react'
import { DEFAULT_DESKS } from './defaultDeskLayout'
export { DEFAULT_DESKS } from './defaultDeskLayout'
import { supabase } from './supabase'
import { getOwnerId } from './owner'

export type LayoutItem = {
  i: string        // react-grid-layout id
  type: string     // widget type key
  x: number
  y: number
  w: number
  h: number
  /** Version 2 stores whole cells in the discrete widget grid. */
  gridVersion?: 2
  minW?: number
  minH?: number
  maxH?: number
}

export type Desk = {
  id: string
  name: string
  icon: string
  items: LayoutItem[]
  columns?: number
  preset?: 'balanced'
}

export type DeskConfig = {
  desks: Desk[]
  activeDeskId: string
}

export const DEFAULT_CONFIG: DeskConfig = {
  desks: DEFAULT_DESKS,
  activeDeskId: 'today',
}

export function useDeskLayouts() {
  const [config, setConfig] = useState<DeskConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getOwnerId().then(async uid => {
      if (!uid) { setLoading(false); return }
      const { data: row } = await supabase
        .from('desk_layouts')
        .select('desks, active_desk_id')
        .eq('teacher_id', uid)
        .maybeSingle()
      if (row && Array.isArray(row.desks) && row.desks.length > 0) {
        // Preserve user-saved layouts; only fill in defaults for built-in desks that have no items
        const merged = (row.desks as Desk[]).map(d => {
          if (!d.items || d.items.length === 0) {
            const def = DEFAULT_DESKS.find(dd => dd.id === d.id || dd.name === d.name)
            if (def) return { ...def, id: d.id }
          }
          return d
        })
        setConfig({ desks: merged, activeDeskId: row.active_desk_id })
      }
      setLoading(false)
    })
  }, [])

  const persistConfig = useCallback(async (next: DeskConfig) => {
    const uid = await getOwnerId()
    if (!uid) return
    await supabase.from('desk_layouts').upsert(
      { teacher_id: uid, desks: next.desks, active_desk_id: next.activeDeskId },
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
      desks: config.desks.map(d => d.id === deskId ? { ...d, preset: undefined, items } : d),
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
    const next = {
      ...config,
      desks: config.desks.map(d => d.id === deskId ? { ...def } : d),
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setConfig(next)
    persistConfig(next)
  }, [config, persistConfig])

  const activeDesk = config.desks.find(d => d.id === config.activeDeskId) ?? config.desks[0]

  return {
    config, loading, activeDesk,
    setActiveDesk, addDesk, removeDesk,
    updateDeskItems, addWidget, removeWidget, resetDesk,
  }
}
