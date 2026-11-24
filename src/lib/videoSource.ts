// Normalises a pasted lesson-recording URL into a playable source. Supports
// three formats side by side:
//   • RuTube  — rutube.ru/video/<id> or /play/embed/<id> (or a bare hex id);
//     приватное — rutube.ru/video/private/<id>/?p=<ключ>
//   • YouTube — youtube.com/watch?v=, youtu.be/, /embed/, /shorts/, /live/
//   • own link — a direct media file (.webm/.mp4/…) OR a teachstream /watch/<id>
//     page (any other http(s) URL is embedded in an iframe as-is)
// The teacher pastes one link; the student player picks the right embed.
export type VideoSource =
  | { kind: 'rutube'; id: string; key?: string } // key — ?p= приватного видео
  | { kind: 'youtube'; id: string }
  | { kind: 'file'; url: string; crossOrigin?: 'anonymous' }   // raw media → native <video>
  | { kind: 'audio'; url: string }  // raw audio → native <audio controls>
  | { kind: 'gdrive'; id: string }  // Google Drive file → signed media gateway
  | { kind: 'iframe'; url: string } // own page (teachstream /watch, …) → iframe

const FILE_RE = /\.(webm|mp4|m4v|mov|ogg|ogv|m3u8)(\?.*)?$/i
// Чисто аудио-расширения. `.ogg` намеренно остаётся видео (так было всегда,
// и в него кладут оба потока); однозначно-аудио контейнер Ogg — это `.oga`.
const AUDIO_RE = /\.(mp3|m4a|aac|wav|opus|oga|flac)(\?.*)?$/i

/** Ссылка ведёт на Google Диск (встраивается страницей Google, без своего плеера). */
/** Публичный адрес бакета R2 с записями уроков и его кеш на нашем VPS.
 *  Cloudflare у российских провайдеров замедлен (обрыв после ~16 КБ), а из ЦОДа
 *  в РФ он работает на полной скорости — поэтому записи из R2 плеер берёт через
 *  nginx-кеш `api.iskra-study.ru/media/…` (docs: design/recordings-import/README.md).
 *  Ссылка в уроке остаётся на r2.dev: при ошибке кеша плеер вернётся к ней. */
const R2_PUBLIC_ORIGIN = 'https://pub-7fc0bdb31ef8477cb024b613af34e1d8.r2.dev/'
const R2_RU_CACHE_ORIGIN = 'https://api.iskra-study.ru/media/'

/** Адрес записи через кеш для РФ, если это файл из нашего R2; иначе undefined. */
export function r2CachedUrl(url: string): string | undefined {
  return url.startsWith(R2_PUBLIC_ORIGIN) ? R2_RU_CACHE_ORIGIN + url.slice(R2_PUBLIC_ORIGIN.length) : undefined
}

export const isDriveLink = (url: string | null | undefined) => !!url && /drive\.google\.com\//i.test(url)

export function parseVideoSource(raw?: string | null): VideoSource | undefined {
  const url = raw?.trim()
  if (!url) return undefined

  // RuTube: /video/<hex>/, /play/embed/<hex>, or a bare hex id. Приватное
  // видео открывается только с ключом из ?p= — без него плеер RuTube покажет
  // «видео недоступно», поэтому ключ несём до самого embed.
  const ru = url.match(/rutube\.ru\/(?:video|play\/embed)\/(?:private\/)?([0-9a-f]+)/i)
  if (ru) {
    const key = url.match(/[?&]p=([\w-]+)/)?.[1]
    return key ? { kind: 'rutube', id: ru[1], key } : { kind: 'rutube', id: ru[1] }
  }
  if (/^[0-9a-f]{16,}$/i.test(url)) return { kind: 'rutube', id: url }

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/, /live/ (11-char id).
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  )
  if (yt) return { kind: 'youtube', id: yt[1] }

  // Google Drive: file/d/<id>/view, open?id=<id>, uc?id=<id>. Встраивать
  // нужно страницу /preview — у неё только проигрыватель файла, без шапки
  // Диска, бокового меню и собственной полосы прокрутки. Голый /view, который
  // вставляли раньше, тянул весь интерфейс Диска вместе с его «Нет доступа».
  const gd = url.match(/drive\.google\.com\/(?:file\/d\/|uc\?[^#]*id=|open\?[^#]*id=)([\w-]{20,})/i)
    || url.match(/drive\.google\.com\/.*[?&]id=([\w-]{20,})/i)
  // Встраиваем страницу Google как есть. Раньше поток шёл через Edge-функцию
  // drive-video ради своего плеера, и каждый просмотр прокачивал весь ролик
  // через трафик Supabase (54 ГБ за полмесяца, 21–23.11.2026). Свой плеер с
  // ускорением — для файла записи в R2 (кнопка «Файл» в редакторе урока).
  if (gd) return { kind: 'iframe', url: `https://drive.google.com/file/d/${gd[1]}/preview` }

  // Direct audio file → native <audio controls>.
  if (AUDIO_RE.test(url)) return { kind: 'audio', url }

  // Direct media file → native <video controls>.
  if (FILE_RE.test(url)) return { kind: 'file', url }

  // Any other http(s) link (e.g. teachstream /watch/<id>) → iframe it.
  if (/^https?:\/\//i.test(url)) return { kind: 'iframe', url }

  return undefined
}

/** Embed src for iframe-based sources, with a start offset in seconds. Only
 *  RuTube and YouTube honour the offset; own pages open at their own start.
 *
 *  У YouTube обязателен enablejsapi=1: без него IFrame API не пускают к плееру,
 *  а на нём держится весь наш корпус — свои кнопки, шкала с главами и текущая
 *  секунда, по которой подсвечивается таймкод (см. LessonVideoPlayer). */
export function videoEmbedSrc(src: VideoSource, startSeconds = 0): string {
  const t = Math.max(0, Math.floor(startSeconds))
  switch (src.kind) {
    case 'rutube': return `https://rutube.ru/play/embed/${src.id}/?${src.key ? `p=${src.key}&` : ''}t=${t}`
    case 'youtube': {
      const params = new URLSearchParams({
        autoplay: '1',
        start: String(t),
        enablejsapi: '1',
        playsinline: '1',
      })
      // origin — требование самого API: без него часть браузеров режет
      // postMessage между страницей и плеером.
      if (typeof window !== 'undefined') params.set('origin', window.location.origin)
      return `https://www.youtube.com/embed/${src.id}?${params.toString()}`
    }
    // У Диска нет внешнего API — смещение старта он не принимает, открывается
    // с нуля. Нам важна только чистая страница проигрывателя.
    case 'gdrive': return `https://drive.google.com/file/d/${src.id}/preview`
    default: return src.url
  }
}
