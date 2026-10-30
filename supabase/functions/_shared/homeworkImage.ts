// Keep storage paths and student identifiers inside the function. The worker
// receives the same anonymous image bytes as it did for legacy data URLs.
type WorkImage = { name: string; mediaType: string; data: string }
type Download = (path: string) => Promise<{ data: Blob | null; error: unknown }>
const DATA_URL = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,/
const IMAGE_CAP = 5 * 1024 * 1024
const PHOTO_TTL_MS = 7 * 24 * 3600 * 1000
const STORED_PATH = /^([0-9a-f-]{36}\/[0-9a-f-]{36}\/)(\d{13})-[0-9a-f-]{36}\.(webp|jpg|png)$/i

function asBase64(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 32768) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)))
  }
  return btoa(chunks.join(''))
}

export async function loadHomeworkImage(value: unknown, name: string, options: {
  ownerPrefix: string | null; download: Download; now?: number
}): Promise<WorkImage | null> {
  if (typeof value !== 'string') return null
  const legacy = DATA_URL.exec(value)
  if (legacy) {
    if (value.length > IMAGE_CAP) return null
    const mediaType = legacy[1] === 'image/jpg' ? 'image/jpeg' : legacy[1]
    return { name: `${name}.${mediaType.split('/')[1].replace('jpeg', 'jpg')}`, mediaType, data: value.slice(legacy[0].length) }
  }
  if (!value.startsWith('hwp:')) return null
  const path = value.slice(4)
  const match = STORED_PATH.exec(path)
  if (!match || !options.ownerPrefix || match[1] !== options.ownerPrefix) return null
  if ((options.now ?? Date.now()) - Number(match[2]) >= PHOTO_TTL_MS) return null
  try {
    const { data: blob, error } = await options.download(path)
    if (error || !blob || blob.size > IMAGE_CAP) return null
    const mediaType = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }[match[3].toLowerCase()]
    if (!mediaType || blob.type !== mediaType) return null
    return { name: `${name}.${match[3].toLowerCase()}`, mediaType, data: asBase64(new Uint8Array(await blob.arrayBuffer())) }
  } catch {
    return null
  }
}
