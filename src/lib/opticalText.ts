/** Text-only alignment. No control rewriting, value writes, control movement or input hooks. */
type Entry = { element: HTMLElement; visible: boolean }
const entries = new Map<HTMLElement, Entry>()
const pending = new Set<HTMLElement>()
const cache = new Map<string, number>()
const baselines = new Map<string, number>()
let context: CanvasRenderingContext2D | null = null
let resize: ResizeObserver | undefined
let intersection: IntersectionObserver | undefined
let microtask = false
let frame = 0
let started = false

/** A shared baseline for captions, rather than a different baseline for every word.
 * Center between capitals/digits and descender-bearing words using the actual font. */
export function opticalTextOffset(fontAscent: number, fontDescent: number, capAscent: number, descender: number, fontSize: number) {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0
  const delta = -(fontAscent - fontDescent - capAscent + descender / 2) / 2
  return Number.isFinite(delta) ? Math.max(-fontSize * .15, Math.min(fontSize * .15, delta)) : 0
}

/** Canvas font bounds omit browser leading/rounding for explicit line heights.
 * Measure a neutral, isolated line once per font/line-height; never touch a control. */
function lineBaseline(font: string, lineHeight: string): number | undefined {
  const key = `${font}\0${lineHeight}`
  const cached = baselines.get(key)
  if (cached !== undefined) return cached
  if (!document.body) return undefined
  const line = document.createElement('span'), marker = document.createElement('span')
  line.style.cssText = 'all:initial;position:fixed;left:0;top:0;display:inline-block;white-space:pre;visibility:hidden;pointer-events:none;contain:layout style paint;'
  line.style.font = font
  line.style.lineHeight = lineHeight
  line.setAttribute('aria-hidden', 'true')
  line.textContent = 'HНgpру0123456789'
  marker.style.cssText = 'all:initial;font:inherit;display:inline-block;vertical-align:baseline;width:0;height:0;line-height:0;overflow:hidden;'
  line.append(marker)
  try {
    document.body.append(line)
    const bounds = line.getBoundingClientRect()
    const value = marker.getBoundingClientRect().top - bounds.top - bounds.height / 2
    if (!bounds.height || !Number.isFinite(value)) return undefined
    if (baselines.size >= 256) baselines.delete(baselines.keys().next().value!)
    baselines.set(key, value)
    return value
  } catch { return undefined } finally { line.remove() }
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
  // Один сдвиг на шрифт, а не на слово: соседние вкладки и сегменты
  // («Группы» / «Главная», «По учителям» / «Ученики») стоят на одной базовой
  // линии. Центр по словам поднимал слова с «у/р» и опускал слова без них.
  const key = ink ? `ink\0${font}\0${css.lineHeight}` : font
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  let result = 0
  try {
    context ??= document.createElement('canvas').getContext('2d')
    if (!context) return 0
    context.font = font
    const metrics = context.measureText('HНgpру0123456789')
    const capitals = context.measureText('HН'), descenders = context.measureText('gpру')
    const size = parseFloat(css.fontSize)
    result = opticalTextOffset(metrics.fontBoundingBoxAscent, metrics.fontBoundingBoxDescent,
      capitals.actualBoundingBoxAscent, descenders.actualBoundingBoxDescent, size)
    if (ink) {
      // Таблетка: середина между центром заглавных и центром строчных
      // (docs: «мерить обе середины — Н и х») ставится в центр строки.
      const baseline = lineBaseline(font, css.lineHeight)
      const lower = context.measureText('хнаox').actualBoundingBoxAscent
      if (baseline !== undefined) result = Math.max(-size * .15, Math.min(size * .15,
        (capitals.actualBoundingBoxAscent + lower) / 4 - baseline))
    }
  } catch { return 0 }
  if (cache.size >= 256) cache.delete(cache.keys().next().value!)
  cache.set(key, result)
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
  document.fonts?.addEventListener('loadingdone', () => { cache.clear(); baselines.clear(); refresh() })
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
