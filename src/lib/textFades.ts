import type { CSSProperties } from 'react'
import { measureWork } from './platformPerformance'

export const TEXT_FADE_PROPERTY = '--iskra-text-fade-lines'
/** The marker travels with reused style objects; only the text-bearing element is measured. */
export const textFadeStyle = {
  textOverflow: 'clip', [TEXT_FADE_PROPERTY]: 1,
} as CSSProperties

/** Keep the complete text in the DOM and limit its visible window without a browser ellipsis. */
export function textFadeLines(value: number | string | undefined): CSSProperties {
  const lines = Number(value)
  return Number.isFinite(lines) && lines > 0 ? {
    [TEXT_FADE_PROPERTY]: lines, display: 'block', whiteSpace: lines === 1 ? 'nowrap' : 'normal', overflow: 'hidden',
    maxHeight: `calc(${lines} * 1lh)`,
  } as CSSProperties : {
    [TEXT_FADE_PROPERTY]: 0, display: 'block', maxHeight: 'none', overflow: 'visible',
  } as CSSProperties
}

type Fade = { image: string; size: string; position: string; repeat: string }
const CLEAR: Fade = { image: '', size: '', position: '', repeat: '' }
export function textFadeMask(width: number, height: number, contentWidth: number, contentHeight: number, lines = 1, rtl = false, lastLineOnly = false): Fade {
  if (width <= 0 || height <= 0 || (contentWidth <= width + 1 && contentHeight <= height + 1)) return CLEAR
  const direction = rtl ? 'to left' : 'to right'
  const edge = Math.min(24, width / 3)
  const lastLine = `linear-gradient(${direction}, #000 calc(100% - ${edge}px), transparent)`
  if (lastLineOnly && contentHeight > height + 1 && lines > 1) {
    const lastHeight = height / lines
    const precedingHeight = height - lastHeight
    return {
      image: `linear-gradient(#000, #000), ${lastLine}`,
      size: `100% ${precedingHeight}px, 100% ${lastHeight}px`,
      position: `0 0, 0 ${precedingHeight}px`, repeat: 'no-repeat',
    }
  }
  // An unbroken word may overflow sideways even in a multi-line text window.
  return contentHeight > height + 1 ? {
    image: `linear-gradient(to bottom, #000 calc(100% - ${Math.min(14, height / 3)}px), transparent)`,
    size: '', position: '', repeat: '',
  } : { image: lastLine, size: '', position: '', repeat: '' }
}

const BASE_SELECTOR = '.text-fade, [data-text-fade], [style*="--iskra-text-fade-lines"]'
const MASK_KEYS = ['mask-image', '-webkit-mask-image', 'mask-size', '-webkit-mask-size', 'mask-position', '-webkit-mask-position', 'mask-repeat', '-webkit-mask-repeat'] as const
let started = false
let refresh: (() => void) | undefined

/** One observer for all text windows, including lazy stylesheets, portals and responsive variants.
 * ScrollFade owns scroll-region masks; this observer only touches explicitly marked text. */
export function startTextFades() {
  if (started || typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return
  started = true
  const elements = new Map<HTMLElement, { original: string[]; written: string; title: boolean }>()
  const changed = new Set<HTMLElement>()
  const roots = new Set<ParentNode>()
  const visible = new Set<HTMLElement>()
  let selector = BASE_SELECTOR
  let frame = 0
  let stylesDirty = true

  function discoverStyles() {
    const selectors = new Set<string>([BASE_SELECTOR])
    const visit = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if ('selectorText' in rule && 'style' in rule) {
          const style = (rule as CSSStyleRule).style
          if (style.getPropertyValue(TEXT_FADE_PROPERTY)) {
            // Pseudo-elements cannot hold a measurable text window.
            const value = (rule as CSSStyleRule).selectorText
            if (!value.includes('::')) selectors.add(value)
          }
        }
        if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try { visit(sheet.cssRules) } catch { /* Cross-origin styles do not contain application markers. */ }
    }
    selector = Array.from(selectors).join(', ')
    stylesDirty = false
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => measureWork('text-fades', flush))
  }
  function restore(element: HTMLElement) {
    const entry = elements.get(element)
    if (!entry) return
    for (let i = 0; i < MASK_KEYS.length; i++) {
      const key = MASK_KEYS[i]
      if (entry.original[i]) element.style.setProperty(key, entry.original[i])
      else element.style.removeProperty(key)
    }
    if (entry.title) element.removeAttribute('title')
    resize.unobserve(element)
    intersection?.unobserve(element)
    visible.delete(element)
    elements.delete(element)
  }
  function collect(root: ParentNode) {
    const found: Element[] = []
    try {
      if (root instanceof HTMLElement && root.matches(selector)) found.push(root)
      found.push(...root.querySelectorAll(selector))
    } catch { return }
    for (const item of found) {
      if (!(item instanceof HTMLElement) || /^(INPUT|TEXTAREA|SELECT)$/.test(item.tagName) || item.isContentEditable) continue
      if (!elements.has(item)) {
        elements.set(item, { original: MASK_KEYS.map(key => item.style.getPropertyValue(key)), written: '', title: false })
        if (intersection) intersection.observe(item)
        else { visible.add(item); resize.observe(item) }
      }
      changed.add(item)
    }
  }
  function flush() {
    frame = 0
    if (stylesDirty) { discoverStyles(); roots.add(document) }
    for (const root of roots) collect(root)
    roots.clear()
    // Drop removed nodes, even when a complete route was replaced.
    for (const element of elements.keys()) if (!element.isConnected) restore(element)
    const updates: Array<{ element: HTMLElement; mask: Fade; text: string; title: boolean }> = []
    for (const element of changed) {
      const entry = elements.get(element)
      // Measuring scrollWidth in a skipped content-visibility subtree forces
      // its rendering. Large journals have thousands of offscreen labels.
      if (!entry || !element.isConnected || !visible.has(element)) continue
      const css = getComputedStyle(element)
      const raw = element.dataset.textFade ?? css.getPropertyValue(TEXT_FADE_PROPERTY)
      const lines = Number(raw || (element.classList.contains('text-fade') ? 1 : 0))
      const clipped = /hidden|clip/.test(css.overflowX) || /hidden|clip/.test(css.overflowY)
      const mask = lines > 0 && clipped
        ? textFadeMask(element.clientWidth, element.clientHeight, element.scrollWidth, element.scrollHeight, lines, css.direction === 'rtl', element.getAttribute('data-text-fade-mode') === 'last-line') : CLEAR
      // A label mask must never hide nested actions or editable controls.
      const hasControls = !!element.querySelector('button, input, textarea, select, [contenteditable="true"]')
      const text = element.textContent?.trim() ?? ''
      updates.push({ element, mask: hasControls ? CLEAR : mask, text, title: !hasControls && !element.hasAttribute('title') || entry.title })
    }
    changed.clear()
    // All layout reads above precede writes; observers skip our own style mutations.
    for (const { element, mask, text, title } of updates) {
      const entry = elements.get(element)!
      const values = [mask.image, mask.image, mask.size, mask.size, mask.position, mask.position, mask.repeat, mask.repeat]
      for (let i = 0; i < MASK_KEYS.length; i++) {
        const value = values[i] || entry.original[i]
        if (element.style.getPropertyValue(MASK_KEYS[i]) !== value) {
          if (value) element.style.setProperty(MASK_KEYS[i], value)
          else element.style.removeProperty(MASK_KEYS[i])
        }
      }
      if (title && text && (mask.image || entry.title)) {
        if (mask.image) element.setAttribute('title', text)
        else element.removeAttribute('title')
        entry.title = !!mask.image
      }
      entry.written = element.getAttribute('style') ?? ''
    }
  }
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) changed.add(entry.target as HTMLElement)
    schedule()
  })
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (entry.isIntersecting) {
        visible.add(element)
        resize.observe(element)
        changed.add(element)
      } else {
        visible.delete(element)
        resize.unobserve(element)
      }
    }
    schedule()
  }, { rootMargin: '160px' })
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target instanceof HTMLElement ? record.target : record.target.parentElement
      if (!target) continue
      if (record.type === 'attributes' && record.attributeName === 'style' && elements.get(target)?.written === (target.getAttribute('style') ?? '')) continue
      if (target.closest('style')) stylesDirty = true
      if (record.type === 'childList') {
        for (const node of Array.from(record.addedNodes)) if (node instanceof HTMLElement) {
          roots.add(node)
          if (node.matches('style, link[rel="stylesheet"]') || node.querySelector('style, link[rel="stylesheet"]')) stylesDirty = true
        }
      }
      roots.add(target)
      for (let parent: HTMLElement | null = target; parent; parent = parent.parentElement) {
        if (elements.has(parent)) changed.add(parent)
      }
    }
    schedule()
  })
  mutations.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'data-text-fade', 'data-text-fade-mode'] })
  const all = () => { for (const element of elements.keys()) changed.add(element); roots.add(document); schedule() }
  refresh = all
  window.addEventListener('resize', all, { passive: true })
  document.addEventListener('load', event => {
    if ((event.target as Element | null)?.matches?.('link[rel="stylesheet"]')) { stylesDirty = true; schedule() }
  }, true)
  document.fonts?.addEventListener('loadingdone', all)
  roots.add(document)
  measureWork('text-fades.initial', flush)
}

/** Components mounted outside the main entry (isolated previews) still use the same observer. */
export function refreshTextFades() { startTextFades(); refresh?.() }
