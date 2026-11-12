import { useEffect, type RefObject } from 'react'
import { measureWork } from './platformPerformance'

export function scrollFadeMask(position: number, viewport: number, content: number, horizontal = false, fadeWidth = 18) {
  if (content <= viewport + 1) return 'none'
  const start = position > 1, end = content - viewport - position > 1
  const size = Math.min(fadeWidth, viewport / 5)
  return `linear-gradient(to ${horizontal ? 'right' : 'bottom'}, ${start ? 'transparent' : '#000'}, #000 ${start ? size : 0}px, #000 calc(100% - ${end ? size : 0}px), ${end ? 'transparent' : '#000'})`
}

/** Follow the actual scrolling element, including responsive layout changes. */
export function useScrollFades(ref: RefObject<HTMLElement | null>, enabled = true, selector = '*', horizontalFadeWidth = 18) {
  useEffect(() => {
    const root = ref.current
    if (!enabled || !root) return
    let frame = 0
    const originals = new Map<HTMLElement, string>()
    const update = () => {
      frame = 0
      for (const el of [root, ...root.querySelectorAll<HTMLElement>(selector)]) {
        const css = getComputedStyle(el)
        if (!/auto|scroll/.test(css.overflowX + css.overflowY)) continue
        const vertical = /auto|scroll/.test(css.overflowY) ? scrollFadeMask(el.scrollTop, el.clientHeight, el.scrollHeight) : 'none'
        const rtl = css.direction === 'rtl'
        const x = rtl ? el.scrollWidth - el.clientWidth + el.scrollLeft : el.scrollLeft
        const horizontal = /auto|scroll/.test(css.overflowX) ? scrollFadeMask(x, el.clientWidth, el.scrollWidth, true, horizontalFadeWidth) : 'none'
        if (!originals.has(el)) originals.set(el, el.style.maskImage)
        el.style.maskImage = [vertical, horizontal].filter(mask => mask !== 'none').join(', ') || originals.get(el) || 'none'
        el.style.maskComposite = 'intersect'
      }
      for (const [el, original] of originals) {
        if (!root.contains(el) || !/auto|scroll/.test(getComputedStyle(el).overflowX + getComputedStyle(el).overflowY)) {
          el.style.maskImage = original; el.style.removeProperty('mask-composite'); originals.delete(el)
        }
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => measureWork('scroll-fades.update', update)) }
    const resize = new ResizeObserver(schedule)
    const observe = () => measureWork('scroll-fades.observe', () => { resize.observe(root); root.querySelectorAll(selector).forEach(el => { resize.observe(el); if(el.firstElementChild) resize.observe(el.firstElementChild) }); schedule() })
    const mutation = new MutationObserver(observe)
    mutation.observe(root, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class']})
    root.addEventListener('scroll', schedule, {capture:true, passive:true})
    window.addEventListener('resize', schedule)
    observe()
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect()
      root.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule)
      originals.forEach((mask, el) => { el.style.maskImage = mask; el.style.removeProperty('mask-composite') })
    }
  }, [ref, enabled, selector, horizontalFadeWidth])
}
