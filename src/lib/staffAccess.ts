import type { SupabaseClient } from '@supabase/supabase-js'

/** Use the existing server role check, including legacy accounts without metadata. */
export async function checkStaffAccess(client: SupabaseClient, signal: AbortSignal) {
  signal.throwIfAborted()
  const { data, error } = await client.rpc('is_staff').abortSignal(signal)
  signal.throwIfAborted()
  if (error) throw Object.assign(new Error('Staff access check failed'), { code: 'staff_access_check_failed' })
  return data === true
}

export async function requireStaffAccess(client: SupabaseClient, signal: AbortSignal) {
  if (!await checkStaffAccess(client, signal)) {
    throw Object.assign(new Error('Staff account required'), { code: 'staff_access_denied' })
  }
}
