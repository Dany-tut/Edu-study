// Public Google Drive videos only. Never forward browser cookies or accept URLs.
export const DRIVE_ID = /^[\w-]{20,160}$/
const CHUNK = 8 * 1024 * 1024
const encoder = new TextEncoder()

export function boundedVideoRange(range: string | null): string {
  if (!range) return `bytes=0-${CHUNK - 1}`
  const m = /^bytes=(\d+)-(\d*)$/.exec(range)
  if (!m) throw new Error('invalid_range')
  const start = Number(m[1])
  const end = m[2] ? Number(m[2]) : start + CHUNK - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) throw new Error('invalid_range')
  return `bytes=${start}-${Math.min(end, start + CHUNK - 1)}`
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unbase64url(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}
async function signingKey(secret: string) {
  // Domain separation: this key is never used as an Auth JWT signing key.
  const material = await crypto.subtle.digest('SHA-256', encoder.encode(`iskra:drive-video:v1:${secret}`))
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
export async function signVideoTicket(id: string, userId: string, secret: string, now = Date.now()): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ id, uid: userId, exp: Math.floor(now / 1000) + 6 * 3600 })))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload))
  return `${payload}.${base64url(new Uint8Array(signature))}`
}
export async function verifyVideoTicket(ticket: string, secret: string, now = Date.now()): Promise<string | null> {
  try {
    if (ticket.length > 1000) return null
    const [payload, signature, extra] = ticket.split('.')
    if (!payload || !signature || extra) return null
    if (
      !await crypto.subtle.verify('HMAC', await signingKey(secret), unbase64url(signature), encoder.encode(payload))
    ) return null
    const data = JSON.parse(new TextDecoder().decode(unbase64url(payload)))
    if (
      !DRIVE_ID.test(data.id) || typeof data.uid !== 'string' || !Number.isFinite(data.exp) || data.exp <= now / 1000
    ) return null
    return data.id
  } catch {
    return null
  }
}

/** Google may return a large-file confirmation form instead of media. Only its
 * UUID is read; the action URL and any other HTML are deliberately ignored. */
export async function fetchDriveVideo(
  id: string,
  range: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!DRIVE_ID.test(id)) throw new Error('invalid_id')
  const url = new URL('https://drive.usercontent.google.com/download')
  url.search = new URLSearchParams({ id, export: 'download', confirm: 't' }).toString()
  const get = () => fetcher(url, { headers: { Range: range }, signal, redirect: 'error' })
  let response = await get()
  if (response.headers.get('content-type')?.includes('text/html')) {
    // Don't buffer an arbitrarily large response in an Edge worker.
    const reader = response.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      while (html.length < 32768) {
        const { value, done } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
      }
      await reader.cancel()
    }
    const uuid = html.match(/name="uuid"\s+value="([\w-]{10,100})"/)?.[1]
    if (!uuid) throw new Error('drive_unavailable')
    url.searchParams.set('uuid', uuid)
    response = await get()
  }
  const mime = response.headers.get('content-type') ?? ''
  if (response.status === 416) return response
  if (
    response.status !== 206 || !/^video\//i.test(mime) ||
    !/^bytes \d+-\d+\/\d+$/.test(response.headers.get('content-range') ?? '')
  ) {
    await response.body?.cancel()
    throw new Error('drive_unavailable')
  }
  return response
}
