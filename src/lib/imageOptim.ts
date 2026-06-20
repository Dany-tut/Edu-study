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
// оригинала — возвращаем исходник.

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

// Фото: даунскейл до maxDim по длинной стороне + WebP/JPEG. Принимает File или
// уже готовый data URL (напр. вставленную в редактор картинку).
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
  // GIF/SVG и прочее, что нельзя/не нужно ресемплить — отдаём как есть.
  if (typeof input !== 'string' && /image\/(gif|svg)/i.test(input.type)) return src
  if (typeof input === 'string' && /^data:image\/(gif|svg)/i.test(src)) return src
  try {
    const img = await loadImage(src)
    const w = img.naturalWidth, h = img.naturalHeight
    if (!w || !h) return src
    const scale = Math.min(1, maxDim / Math.max(w, h))
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))
    const c = document.createElement('canvas')
    c.width = tw; c.height = th
    const ctx = c.getContext('2d')
    if (!ctx) return src
    ctx.drawImage(img, 0, 0, tw, th)
    const type = supportsWebp() ? 'image/webp' : 'image/jpeg'
    const out = c.toDataURL(type, quality)
    return out.length > 0 && out.length < src.length ? out : src
  } catch {
    return src
  }
}

// Доска/разметка прямо из canvas: WebP высокого качества, БЕЗ изменения размера.
export function optimizeCanvas(canvas: HTMLCanvasElement, quality = 0.95): string {
  if (!supportsWebp()) return canvas.toDataURL()
  try {
    const out = canvas.toDataURL('image/webp', quality)
    if (!out.startsWith('data:image/webp')) return canvas.toDataURL()
    const png = canvas.toDataURL()
    return out.length < png.length ? out : png
  } catch {
    return canvas.toDataURL()
  }
}
