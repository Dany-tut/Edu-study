import { createClient, type Session } from '@supabase/supabase-js'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'
import { authTransport, fenceAuthCommit } from './authTransport'
import { abortable } from './abortable'

// Password/code verification happens in memory. Only a still-active attempt
// may commit the resulting session to the application's shared Auth client.
async function authenticate(signal: AbortSignal, verify: (auth: ReturnType<typeof createClient>['auth']) => PromiseLike<{ data: { session: Session | null }; error: unknown }>) {
  signal.throwIfAborted()
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `iskra:auth-request:${crypto.randomUUID()}` },
    global: { fetch: authTransport(fetch, SUPABASE_URL, signal) },
  })
  const { data, error } = await abortable(verify(client.auth), signal)
  signal.throwIfAborted()
  if (error) throw error
  if (!data.session) throw new Error('Missing Auth session')
  const release = fenceAuthCommit(data.session.access_token, signal)
  // Retain the fence until the SDK settles, even when the UI has cancelled.
  const commit = supabase.auth.setSession(data.session).finally(release)
  const result = await abortable(commit, signal)
  if (result.error) throw result.error
}

export const passwordSignIn = (email: string, password: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.signInWithPassword({ email, password }))
export const verifyEmailCode = (email: string, token: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.verifyOtp({ email, token, type: 'email' }))
