// ─────────────────────────────────────────────────────────────────────────────
// Внешние упражнения (embed): что можно вставить в домашку
//
// ЗАЧЕМ БЕЛЫЙ СПИСОК, А НЕ ЛЮБОЙ АДРЕС. Встроенная страница исполняется в
// браузере ученика. Пустить туда произвольный адрес значит открыть чужому
// сайту окно в наш кабинет: он видит переход, ставит свои куки, а при
// неудачной песочнице пробует и достучаться до родителя. Поэтому вставляем
// только площадки, которые сами предназначены для встраивания заданий, а всё
// остальное отдаём КНОПКОЙ — она открывает новую вкладку, и ученик уходит
// туда явно.
//
// ЧТО НЕ ДЕЛАЕТ ЭТОТ ФАЙЛ. Не приносит результат: у Wordwall и Quizlet его
// неоткуда взять без их платного API. Задание засчитывается прохождением —
// ровно как просмотр видео.
// ─────────────────────────────────────────────────────────────────────────────

/** Площадка, которую пускаем в рамку. Домен и всё, что под ним. */
interface EmbedHost {
  /** Как показать ученику, откуда упражнение. */
  label: string
  /** Домен площадки; поддомены разрешены. */
  host: string
  /** Приведение обычной ссылки к встраиваемой. Без неё берётся адрес как есть. */
  toEmbed?: (u: URL) => string
}

const HOSTS: EmbedHost[] = [
  {
    label: 'Wordwall', host: 'wordwall.net',
    // Ссылка на упражнение — /resource/<id>/<slug>; встраиваемая — /play/<id>.
    toEmbed: u => {
      const m = u.pathname.match(/\/resource\/(\d+)/)
      return m ? `https://wordwall.net/embed/${m[1]}?themeId=1&templateId=3` : u.toString()
    },
  },
  {
    label: 'Quizlet', host: 'quizlet.com',
    // Набор карточек — /<id>/<slug>; встраиваемый — тот же адрес с /embed.
    toEmbed: u => (u.pathname.includes('/embed') ? u.toString() : `${u.origin}${u.pathname.replace(/\/$/, '')}/embed`),
  },
  { label: 'Genially', host: 'genial.ly' },
  { label: 'Genially', host: 'genially.com' },
  { label: 'LearningApps', host: 'learningapps.org' },
  { label: 'Miro', host: 'miro.com' },
  { label: 'H5P', host: 'h5p.org' },
  { label: 'LiveWorksheets', host: 'liveworksheets.com' },
]

export interface EmbedTarget {
  /** Можно ли показать прямо в рамке. */
  kind: 'frame' | 'link'
  /** Что открывать: адрес встраивания либо исходная ссылка. */
  url: string
  /** Подпись площадки — ученик должен видеть, куда его ведут. */
  label: string
}

/**
 * Разобрать ссылку учителя. Возвращает undefined, если это вообще не адрес, —
 * тогда задание нечего показывать, и редактор скажет об этом.
 */
export function parseEmbed(raw: string | undefined): EmbedTarget | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  let u: URL
  try { u = new URL(value) } catch { return undefined }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined

  const host = u.hostname.replace(/^www\./i, '').toLowerCase()
  const known = HOSTS.find(h => host === h.host || host.endsWith(`.${h.host}`))
  if (!known) return { kind: 'link', url: u.toString(), label: u.hostname.replace(/^www\./i, '') }
  return { kind: 'frame', url: known.toEmbed ? known.toEmbed(u) : u.toString(), label: known.label }
}

/** Список площадок для подсказки в редакторе — чтобы не гадать, что примут. */
export const EMBED_HOST_LABELS = Array.from(new Set(HOSTS.map(h => h.label)))
