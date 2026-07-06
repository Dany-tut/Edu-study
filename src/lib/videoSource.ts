// Normalises a pasted lesson-recording URL into a playable source. Supports
// three formats side by side:
//   • RuTube  — rutube.ru/video/<id> or /play/embed/<id> (or a bare hex id)
//   • YouTube — youtube.com/watch?v=, youtu.be/, /embed/, /shorts/, /live/
//   • own link — a direct media file (.webm/.mp4/…) OR a teachstream /watch/<id>
//     page (any other http(s) URL is embedded in an iframe as-is)
// The teacher pastes one link; the student player picks the right embed.
export type VideoSource =
  | { kind: 'rutube'; id: string }
  | { kind: 'youtube'; id: string }
  | { kind: 'file'; url: string }   // raw media → native <video>
  | { kind: 'iframe'; url: string } // own page (teachstream /watch, …) → iframe

const FILE_RE = /\.(webm|mp4|m4v|mov|ogg|ogv|m3u8)(\?.*)?$/i

export function parseVideoSource(raw?: string | null): VideoSource | undefined {
  const url = raw?.trim()
  if (!url) return undefined

  // RuTube: /video/<hex>/, /play/embed/<hex>, or a bare hex id.
  const ru = url.match(/rutube\.ru\/(?:video|play\/embed)\/([0-9a-f]+)/i)
  if (ru) return { kind: 'rutube', id: ru[1] }
  if (/^[0-9a-f]{16,}$/i.test(url)) return { kind: 'rutube', id: url }

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/, /live/ (11-char id).
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  )
  if (yt) return { kind: 'youtube', id: yt[1] }

  // Direct media file → native <video controls>.
  if (FILE_RE.test(url)) return { kind: 'file', url }

  // Any other http(s) link (e.g. teachstream /watch/<id>) → iframe it.
  if (/^https?:\/\//i.test(url)) return { kind: 'iframe', url }

  return undefined
}

/** Embed src for iframe-based sources, with a start offset in seconds. Only
 *  RuTube and YouTube honour the offset; own pages open at their own start. */
export function videoEmbedSrc(src: VideoSource, startSeconds = 0): string {
  const t = Math.max(0, Math.floor(startSeconds))
  switch (src.kind) {
    case 'rutube': return `https://rutube.ru/play/embed/${src.id}?t=${t}`
    case 'youtube': return `https://www.youtube.com/embed/${src.id}?autoplay=1&start=${t}`
    default: return src.url
  }
}
