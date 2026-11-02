import { supabase } from './supabase'

/** Authenticated request; the returned media ticket, never the user's JWT,
 * is used by <video> range requests. Nothing is written to the lesson. */
export async function resolveDriveVideo(fileId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('drive-video', { body: { fileId } })
  if (error || typeof data?.ticket !== 'string') throw new Error('drive_unavailable')
  const url = new URL('/functions/v1/drive-video', import.meta.env.VITE_SUPABASE_URL)
  url.searchParams.set('ticket', data.ticket)
  return url.toString()
}
