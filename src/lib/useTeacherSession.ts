import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getSessionUser } from './owner'

/** Demo fallbacks are allowed only after the absence of a session is known. */
export function useTeacherSession() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    let active = true
    let changed = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true
      if (active) setSignedIn(!!session?.user)
    })
    void getSessionUser().then(user => { if (active && !changed) setSignedIn(!!user) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  return signedIn
}
