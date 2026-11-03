import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'
import { authTransport, fenceAuthCommit } from './authTransport'
import { abortable } from './abortable'
import { requireStaffAccess } from './staffAccess'

// Password/code verification happens in memory. Only a still-active attempt
// may commit the resulting session to the application's shared Auth client.
async function authenticate<T = void>(signal: AbortSignal, verify: (auth: SupabaseClient['auth']) => PromiseLike<{ data: { session: Session | null }; error: unknown }>, prepare?: (client: SupabaseClient, session: Session) => Promise<T>) {
  signal.throwIfAborted()
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `iskra:auth-request:${crypto.randomUUID()}` },
    global: { fetch: authTransport(fetch, SUPABASE_URL, signal) },
  })
  const { data, error } = await abortable(verify(client.auth), signal)
  signal.throwIfAborted()
  if (error) throw error
  if (!data.session) throw new Error('Missing Auth session')
  // Resolve the destination before committing shared Auth. A failed or cancelled
  // profile read must not turn a student into a teacher or leave a login behind.
  const prepared = prepare ? await abortable(prepare(client, data.session), signal) : undefined
  signal.throwIfAborted()
  const release = fenceAuthCommit(data.session.access_token, signal)
  // Retain the fence until the SDK settles, even when the UI has cancelled.
  const commit = supabase.auth.setSession(data.session).finally(release)
  const result = await abortable(commit, signal)
  if (result.error) throw result.error
  return prepared
}

export const passwordSignIn = (email: string, password: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.signInWithPassword({ email, password }))
export const verifyEmailCode = (email: string, token: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.verifyOtp({ email, token, type: 'email' }))

export const teacherPasswordSignIn = (email: string, password: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.signInWithPassword({ email, password }), client => requireStaffAccess(client, signal))
export const teacherVerifyEmailCode = (email: string, token: string, signal: AbortSignal) =>
  authenticate(signal, auth => auth.verifyOtp({ email, token, type: 'email' }), client => requireStaffAccess(client, signal))

type SignInStudentProfile = { id: string; name: string; group_id: string | null }
export async function studentPasswordSignIn(email: string, password: string, signal: AbortSignal) {
  const profile = await authenticate(signal, auth => auth.signInWithPassword({ email, password }), async (client, session) => {
    const { data, error } = await client.from('students')
      .select('id, name, group_id, created_at')
      .eq('auth_user_id', session.user.id)
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .limit(1).abortSignal(signal).retry(false)
    if (error) throw error
    return (data?.[0] as SignInStudentProfile | undefined) ?? null
  })
  return profile ?? null
}
