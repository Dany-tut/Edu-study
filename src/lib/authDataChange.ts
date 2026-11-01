import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

/** SIGNED_IN also fires on tab refocus. Only identity/permission changes may
 * discard owner-scoped data; token rotation must not blank mounted screens. */
export function createAuthDataChangeGuard() {
  let previous: string | undefined
  return (event: AuthChangeEvent, session: Session | null): boolean => {
    const user = session?.user
    const scope = user ? JSON.stringify([user.id, user.role, user.app_metadata]) : 'signed-out'
    const changed = previous !== scope || event === 'USER_UPDATED'
    previous = scope
    return changed
  }
}
