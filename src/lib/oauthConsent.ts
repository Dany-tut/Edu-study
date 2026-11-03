import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'

/** Bind approval/denial to the account shown on the consent screen. */
export async function decideOAuthConsent(authorizationId: string, allow: boolean, expectedUserId: string, signal: AbortSignal) {
  const { data: { session }, error } = await supabase.auth.getSession()
  signal.throwIfAborted()
  if (error || !session || session.user.id !== expectedUserId) throw new Error('account_changed')
  // The shared SDK method reads the current session again and cannot accept a
  // signal. A captured bearer prevents a cross-tab account change retargeting it.
  const response = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`, {
    method: 'POST', signal,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: allow ? 'approve' : 'deny' }),
  })
  if (!response.ok) throw new Error('authorization_failed')
  const result = await response.json()
  signal.throwIfAborted()
  if (typeof result.redirect_url !== 'string' || !result.redirect_url) throw new Error('authorization_failed')
  return result.redirect_url as string
}
