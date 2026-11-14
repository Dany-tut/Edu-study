import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getViewAs } from './teacherView'

export type FriendsTab = 'contacts' | 'requests' | 'search' | 'profile'
export type PersonCard = { personKey?: string; handle: string; name?: string; role?: 'teacher' | 'student' | 'member'; avatarId?: string; avatarPath?: string | null; relationship?: 'my_teacher' | 'my_student' | null }
export type Contact = PersonCard & { id: string; state: 'incoming' | 'outgoing' | 'friend' }
type Snapshot = { handle: string | null; searchable: boolean; contacts: Contact[] }

export async function friendsAction<T>(account: string, operation: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc('desktop_people', { expected_account: account, operation, payload })
  if (error) throw new Error(error.code === '23505' ? 'Этот ник занят. Выбери другой.' : 'Не удалось выполнить действие. Попробуй ещё раз.')
  return data as T
}

export function useDesktopFriends(enabled = true) {
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
    if (!enabled) {
      current.current = null
      version.current++
      setAccount(null); setSnapshot(null); setTab(null); setError('')
      return
    }
    let active = true
    let authRevision = 0
    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const id = !getViewAs() && !session?.user.is_anonymous ? session?.user.id ?? null : null
      if (current.current === id) return
      current.current = id
      version.current++
      setTab(null); setSnapshot(null); setError(''); setAccount(id)
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authRevision++
      applySession(session)
    })
    const initialRevision = authRevision
    void supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
      // A newer auth event wins over a slower initial session lookup.
      if (active && !sessionError && authRevision === initialRevision) applySession(sessionData.session)
    })
    return () => { active = false; data.subscription.unsubscribe(); current.current = null; version.current++ }
  }, [enabled])
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
