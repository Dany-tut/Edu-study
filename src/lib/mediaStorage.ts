// Media storage — the first active use of Supabase Storage from the client.
// Audio (listening stimuli, voice answers) is too heavy for base64-in-JSONB, so
// it lives in the private `task-media` bucket (migration 0049) and is played back
// via short-lived signed URLs. Images keep their existing base64/JSONB path.
//
// What gets PERSISTED in task/answer data is the returned storage PATH (stable),
// never a signed URL (expires). Resolve the path to a URL at render time with
// getMediaUrl().

import { supabase } from './supabase'

const BUCKET = 'task-media'

export type MediaCategory = 'stimulus' | 'voice'

/** Matches the bucket's file_size_limit (20 MB). Guarded client-side for a nicer error. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024

/** Thrown when a blob exceeds the bucket limit, so callers can show a friendly message. */
export class MediaTooLargeError extends Error {
  constructor(public bytes: number) {
    super(`Media too large: ${(bytes / 1024 / 1024).toFixed(1)} MB (max ${(MAX_MEDIA_BYTES / 1024 / 1024).toFixed(0)} MB)`)
    this.name = 'MediaTooLargeError'
  }
}

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
}

/** Strip codec suffixes so `audio/webm;codecs=opus` maps to `audio/webm`. */
function baseMime(type: string): string {
  return (type || '').split(';')[0].trim().toLowerCase()
}

/**
 * Upload an audio blob to the private bucket and return its storage PATH
 * (`{category}/{uid}/{uuid}.{ext}`). Persist that path; resolve to a playable
 * URL later with getMediaUrl(). Throws MediaTooLargeError / auth / upload errors.
 */
export async function uploadMedia(blob: Blob, category: MediaCategory): Promise<string> {
  if (blob.size > MAX_MEDIA_BYTES) throw new MediaTooLargeError(blob.size)

  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Not authenticated')

  const mime = baseMime(blob.type)
  const ext = EXT_BY_MIME[mime] ?? 'webm'
  const path = `${category}/${uid}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mime || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  return path
}

/**
 * Resolve a stored path to a short-lived signed URL for playback (default 1h).
 * Returns null on failure so callers can render a graceful fallback.
 */
export async function getMediaUrl(path: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) { console.error('[mediaStorage] createSignedUrl failed', error); return null }
  return data.signedUrl
}

/** Delete a media object by path (owner-only via RLS). Returns success. */
export async function deleteMedia(path: string): Promise<boolean> {
  if (!path) return true
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) { console.error('[mediaStorage] remove failed', error); return false }
  return true
}
