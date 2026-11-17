import { supabase } from './supabase'
import { ruFailoverEnabled, supabaseMediaOrigin } from './supabaseFailover'

/** Можно ли повторить поток через российский прокси (он включён в этой сборке). */
export const driveProxyAvailable = ruFailoverEnabled

/** Authenticated request; the returned media ticket, never the user's JWT,
 * is used by <video> range requests. Nothing is written to the lesson.
 * The <video> fetches the stream itself, bypassing the fetch-level RU failover,
 * so the stream URL is built on the origin that failover chose for this session
 * (or on the proxy when `viaProxy` is set after the direct stream failed). */
export async function resolveDriveVideo(fileId: string, opts: { viaProxy?: boolean } = {}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('drive-video', { body: { fileId } })
  if (error || typeof data?.ticket !== 'string') throw new Error('drive_unavailable')
  const origin = supabaseMediaOrigin(import.meta.env.VITE_SUPABASE_URL, opts.viaProxy)
  const url = new URL('/functions/v1/drive-video', origin)
  url.searchParams.set('ticket', data.ticket)
  return url.toString()
}
