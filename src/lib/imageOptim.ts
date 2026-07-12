// ─── Оптимизация изображений перед сохранением в БД ───────────────────────────
//
// Фото и доски лежат как base64 data URL в JSONB (lesson_progress.attachments и
// т.п.) и едят квоту Postgres. Здесь — единая точка сжатия:
//   • Фото — ужимаем до разумного размера по длинной стороне и кодируем в WebP
//     (с откатом в JPEG). Камерные снимки на 3–5 МБ превращаются в ~100–300 КБ.
//   • Доски и разметка — НЕ уменьшаем (иначе линии станут пиксельными), только
//     перекодируем canvas в WebP высокого качества; для штриховой графики это
//     заметно меньше PNG без потери чёткости. WebP сохраняет прозрачность.
//
// Всё «best-effort»: если что-то не получилось или результат вышел больше
// оригинала — возвращаем исходник… но с ЖЁСТКИМ потолком на итоговый base64
// (PHOTO_CAP_BYTES / CANVAS_CAP_BYTES): что не влезло — итеративно дожимаем
// (даунскейл ×0.8 + понижение качества до полов), а если не влезает даже так —
// бросаем ImageTooLargeError. Без потолка один вставленный скан съедает квоту БД.

// Потолки на итоговый data URL (длина строки ≈ байты, base64 — ASCII).
import { t } from './i18n'

export const PHOTO_CAP_BYTES = 1_500_000   // ~1.5 МБ на фото
export const CANVAS_CAP_BYTES = 3_000_000  // ~3 МБ на доску/разметку
const MIN_DIM = 800      // ниже по длинной стороне не ужимаем
const MIN_QUALITY = 0.5  // ниже качество не роняем

export class ImageTooLargeError extends Error {
  constructor() {
    super(t('Файл слишком большой — уменьшите изображение'))
    this.name = 'ImageTooLargeError'
  }
}

let _webp: boolean | null = null
export function supportsWebp(): boolean {
  if (_webp !== null) return _webp
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    _webp = c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    _webp = false
  }
  return _webp
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

type Drawable = HTMLImageElement | HTMLCanvasElement

function sourceSize(source: Drawable): [number, number] {
  return source instanceof HTMLImageElement
    ? [source.naturalWidth, source.naturalHeight]
    : [source.width, source.height]
}

// Кодирует источник с ограничением длинной стороны maxDim. keepAlpha — для
// досок/разметки (прозрачность важна): фолбэк PNG вместо JPEG, если WebP
// недоступен.
function encodeScaled(source: Drawable, maxDim: number, quality: number, keepAlpha: boolean): string | null {
  const [w, h] = sourceSize(source)
  if (!w || !h) return null
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  try {
    const c = document.createElement('canvas')
    c.width = tw; c.height = th
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, tw, th)
    const type = supportsWebp() ? 'image/webp' : keepAlpha ? 'image/png' : 'image/jpeg'
    return c.toDataURL(type, quality)
  } catch {
    return null
  }
}

// Итеративный дожим под потолок: на каждом шаге понижаем качество и уменьшаем
// длинную сторону (×0.8), пока не влезем в cap или не упрёмся в полы
// (MIN_DIM / MIN_QUALITY). Не влезло даже на полах — ImageTooLargeError.
function shrinkToCap(source: Drawable, startDim: number, startQuality: number, cap: number, keepAlpha: boolean): string {
  const [w, h] = sourceSize(source)
  let dim = Math.min(startDim, Math.max(w, h, 1))
  let q = startQuality
  for (let i = 0; i < 12; i++) {
    const out = encodeScaled(source, dim, q, keepAlpha)
    if (out && out.length <= cap) return out
    const atMinDim = dim <= MIN_DIM
    const atMinQ = q <= MIN_QUALITY
    if (atMinDim && atMinQ) break
    if (!atMinQ) q = Math.max(MIN_QUALITY, Math.round((q - 0.1) * 100) / 100)
    if (!atMinDim) dim = Math.max(MIN_DIM, Math.round(dim * 0.8))
  }
  throw new ImageTooLargeError()
}

// Фото: даунскейл до maxDim по длинной стороне + WebP/JPEG. Принимает File или
// уже готовый data URL (напр. вставленную в редактор картинку). Результат
// гарантированно ≤ PHOTO_CAP_BYTES, иначе — ImageTooLargeError.
export async function optimizePhoto(
  input: File | string,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<string> {
  const { maxDim = 1600, quality = 0.82 } = opts
  let src: string
  try {
    src = typeof input === 'string' ? input : await readFileAsDataUrl(input)
  } catch {
    return typeof input === 'string' ? input : ''
  }
  // GIF/SVG и прочее, что нельзя/не нужно ресемплить — отдаём как есть, пока
  // влезает в потолок. Сверх потолка — растеризуем и дожимаем как обычное фото
  // (анимация потеряется, но это лучше отлупа или разбухшей БД).
  const isGifSvg =
    (typeof input !== 'string' && /image\/(gif|svg)/i.test(input.type)) ||
    (typeof input === 'string' && /^data:image\/(gif|svg)/i.test(src))
  if (isGifSvg && src.length <= PHOTO_CAP_BYTES) return src

  let img: HTMLImageElement | null = null
  try { img = await loadImage(src) } catch { img = null }
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    // Не декодируется — пережать не можем; исходник допустим только в лимите.
    if (src.length <= PHOTO_CAP_BYTES) return src
    throw new ImageTooLargeError()
  }

  // Обычный проход: если результат вышел хуже исходника — берём исходник.
  const out = encodeScaled(img, maxDim, quality, false)
  const best = out && out.length < src.length ? out : src
  if (best.length <= PHOTO_CAP_BYTES) return best
  // Не влезли в потолок — итеративный дожим.
  return shrinkToCap(img, maxDim, quality, PHOTO_CAP_BYTES, false)
}

// Доска/разметка прямо из canvas: WebP высокого качества, БЕЗ изменения размера,
// пока влезает в CANVAS_CAP_BYTES. Сверх потолка — итеративный дожим (качество +
// даунскейл; линии станут чуть мягче, но это лучше отлупа или разбухшей БД).
// Не влезло даже на полах — ImageTooLargeError.
export function optimizeCanvas(canvas: HTMLCanvasElement, quality = 0.95): string {
  let out: string | null = null
  try {
    if (supportsWebp()) {
      const webp = canvas.toDataURL('image/webp', quality)
      if (webp.startsWith('data:image/webp')) {
        const png = canvas.toDataURL()
        out = webp.length < png.length ? webp : png
      }
    }
    if (!out) out = canvas.toDataURL()
  } catch {
    out = null
  }
  if (out && out.length <= CANVAS_CAP_BYTES) return out
  return shrinkToCap(canvas, Math.max(canvas.width, canvas.height), Math.min(quality, 0.9), CANVAS_CAP_BYTES, true)
}
