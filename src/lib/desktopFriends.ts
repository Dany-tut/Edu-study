import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getViewAs } from './teacherView'

export type FriendsTab = 'contacts' | 'requests' | 'search' | 'profile'
export type Contact = { id: string; handle: string; state: 'incoming' | 'outgoing' | 'friend' }
type Snapshot = { handle: string | null; searchable: boolean; contacts: Contact[] }

export async function friendsAction<T>(account: string, operation: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc('desktop_friends', { expected_account: account, operation, payload })
  if (error) throw new Error(error.code === '23505' ? 'Этот ник занят. Выбери другой.' : 'Не удалось выполнить действие. Попробуй ещё раз.')
  return data as T
}

export function useDesktopFriends() {
  const [account, setAccount] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<FriendsTab | null>(null)
  const current = useRef<string | null>(null)
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const id = current.current
    if (!id) return
    const request = ++version.current
    try {
      const next = await friendsAction<Snapshot>(id, 'snapshot')
      if (version.current === request) { setSnapshot(next); setError('') }
    } catch {
      if (version.current === request) setError('Не удалось загрузить друзей.')
    }
  }, [])
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = !getViewAs() && !session?.user.is_anonymous ? session?.user.id ?? null : null
      if (current.current === id) return
      current.current = id
      version.current++
      setTab(null); setSnapshot(null); setError(''); setAccount(id)
    })
    return () => { data.subscription.unsubscribe(); current.current = null; version.current++ }
  }, [])
  useEffect(() => {
    if (!account) return
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    const interval = window.setInterval(visible, 15000)
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(interval); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible) }
  }, [account, refresh])
  const incoming = snapshot?.contacts.filter(c => c.state === 'incoming') ?? []
  return { account, tab, setTab, snapshot, refresh, error, incoming }
}
export type FriendsModel = ReturnType<typeof useDesktopFriends>
