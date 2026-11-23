/** Text-only alignment. No DOM rewriting, value writes, control movement or input hooks. */
type Entry = { element: HTMLElement; visible: boolean; ink?: { font: string; text: string; epoch: number; offset: number } }
const entries = new Map<HTMLElement, Entry>()
const pending = new Set<HTMLElement>()
const cache = new Map<string, number>()
let context: CanvasRenderingContext2D | null = null
let resize: ResizeObserver | undefined
let intersection: IntersectionObserver | undefined
let microtask = false
let frame = 0
let started = false
let fontEpoch = 0

/** A shared baseline for captions, rather than a different baseline for every word.
 * Center between capitals/digits and descender-bearing words using the actual font. */
export function opticalTextOffset(fontAscent: number, fontDescent: number, capAscent: number, descender: number, fontSize: number) {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0
  const delta = -(fontAscent - fontDescent - capAscent + descender / 2) / 2
  return Number.isFinite(delta) ? Math.max(-fontSize * .15, Math.min(fontSize * .15, delta)) : 0
}

function measure(element: HTMLElement): number {
  const text = element.textContent ?? ''
  if (!text.trim()) return 0
  const css = getComputedStyle(element)
  const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`
  // Multi-line/card compositions keep their shared baseline rather than centering
  // the tallest letter from a middle line as if the entire block were one word.
  const lineHeight = parseFloat(css.lineHeight) || parseFloat(css.fontSize) * 1.2
  const multipleLines = element.dataset.opticalAlign === 'ink' &&
    (element.getClientRects().length > 1 || element.getBoundingClientRect().height > lineHeight * 1.5)
  const ink = element.dataset.opticalAlign === 'ink' && !multipleLines
  const entry = entries.get(element)
  if (ink) {
    const memo = entry?.ink
    if (memo?.font === font && memo.text === text && memo.epoch === fontEpoch) return memo.offset
  } else {
    const cached = cache.get(font)
    if (cached !== undefined) return cached
  }
  let result = 0
  try {
    context ??= document.createElement('canvas').getContext('2d')
    if (!context) return 0
    context.font = font
    const metrics = context.measureText('HНgpру0123456789')
    const capitals = context.measureText('HН'), descenders = context.measureText('gpру')
    // Baseline captions reserve half a descender; pill ink alignment reserves the full visible glyph bounds.
    const visible = ink ? context.measureText(text) : null
    result = opticalTextOffset(metrics.fontBoundingBoxAscent, metrics.fontBoundingBoxDescent,
      visible?.actualBoundingBoxAscent ?? capitals.actualBoundingBoxAscent,
      visible ? visible.actualBoundingBoxDescent * 2 : descenders.actualBoundingBoxDescent, parseFloat(css.fontSize))
  } catch { return 0 }
  if (ink && entry) {
    // Caption memo belongs to this mounted element; no user text is retained in
    // the cross-screen font cache after unmount.
    entry.ink = { font, text, epoch: fontEpoch, offset: result }
  } else {
    if (cache.size >= 256) cache.delete(cache.keys().next().value!)
    cache.set(font, result)
  }
  return result
}

function flush() {
  microtask = false
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  // Read every pending label before writing any position: no read/write layout loop.
  const writes: Array<[HTMLElement, number]> = []
  for (const element of pending) {
    const entry = entries.get(element)
    if (!entry || !element.isConnected) continue
    if (!entry.visible) continue
    writes.push([element, measure(element)])
  }
  pending.clear()
  for (const [element, offset] of writes) {
    const value = `${Math.round(offset * 1000) / 1000}px`
    if (element.style.getPropertyValue('--iskra-control-text-offset') !== value) element.style.setProperty('--iskra-control-text-offset', value)
  }
}

function queue(element: HTMLElement, immediate = false) {
  pending.add(element)
  if (immediate) {
    if (!microtask) { microtask = true; queueMicrotask(flush) }
  } else if (!frame) frame = requestAnimationFrame(flush)
}

function start() {
  if (started) return
  started = true
  if (typeof ResizeObserver !== 'undefined') resize = new ResizeObserver(records => { for (const { target } of records) queue(target as HTMLElement) })
  if (typeof IntersectionObserver !== 'undefined') intersection = new IntersectionObserver(records => {
    for (const record of records) {
      const element = record.target as HTMLElement, entry = entries.get(element)
      if (entry) { entry.visible = record.isIntersecting; if (entry.visible) queue(element) }
    }
  }, { rootMargin: '200px' })
  const refresh = () => { for (const entry of entries.values()) if (entry.visible) queue(entry.element) }
  window.addEventListener('resize', refresh, { passive: true })
  document.fonts?.addEventListener('loadingdone', () => { ++fontEpoch; cache.clear(); refresh() })
}

export function trackOpticalText(element: HTMLElement) {
  start()
  const bounds = element.getBoundingClientRect()
  const visible = bounds.bottom >= -200 && bounds.top <= window.innerHeight + 200 && bounds.width > 0 && bounds.height > 0
  entries.set(element, { element, visible })
  resize?.observe(element); intersection?.observe(element)
  queue(element, true)
  return () => { element.style.removeProperty('--iskra-control-text-offset'); entries.delete(element); pending.delete(element); resize?.unobserve(element); intersection?.unobserve(element) }
}

export function refreshOpticalText(element: HTMLElement) { if (entries.has(element)) queue(element, true) }
