import { measureWork } from './platformPerformance'

/** Apply edge fades to actual scroll regions, without adding layout wrappers. */
export function installWidgetScrollFades(root: HTMLElement) {
  const observed = new Set<HTMLElement>()
  const regions = new Set<HTMLElement>()
  let frame = 0
  let stopped = false
  const update = (el: HTMLElement) => {
    const style = getComputedStyle(el)
    const vertical = /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1
    const horizontal = /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1
    if (!vertical && !horizontal) {
      el.removeAttribute('data-scroll-fade')
      return
    }
    const top = vertical && el.scrollTop > 1
    const bottom = vertical && el.scrollHeight - el.clientHeight - el.scrollTop > 1
    // Distance from either edge also works for RTL (negative scrollLeft).
    const rtl = style.direction === 'rtl'
    const distance = rtl ? -el.scrollLeft : el.scrollLeft
    const remaining = el.scrollWidth - el.clientWidth - distance
    const left = horizontal && (rtl ? remaining > 1 : distance > 1)
    const right = horizontal && (rtl ? distance > 1 : remaining > 1)
    const y = Math.min(18, el.clientHeight / 5)
    const x = Math.min(18, el.clientWidth / 5)
    const masks = []
    if (top || bottom) masks.push(`linear-gradient(to bottom, ${top ? 'transparent' : '#000'}, #000 ${top ? y : 0}px, #000 calc(100% - ${bottom ? y : 0}px), ${bottom ? 'transparent' : '#000'})`)
    if (left || right) masks.push(`linear-gradient(to right, ${left ? 'transparent' : '#000'}, #000 ${left ? x : 0}px, #000 calc(100% - ${right ? x : 0}px), ${right ? 'transparent' : '#000'})`)
    el.dataset.scrollFade = [top && 'top', bottom && 'bottom', left && 'left', right && 'right'].filter(Boolean).join(' ')
    const mask = masks.join(', ') || 'none'
    if (el.style.getPropertyValue('--widget-scroll-mask') !== mask) el.style.setProperty('--widget-scroll-mask', mask)
  }
  const scan = () => {
    frame = 0
    if (stopped) return
    regions.clear()
    for (const el of observed) {
      if (!root.contains(el)) { resize.unobserve(el); observed.delete(el) }
    }
    for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
        if (!observed.has(el)) { resize.observe(el); observed.add(el) }
        const style = getComputedStyle(el)
        if (/auto|scroll/.test(style.overflowY + style.overflowX)) {
          regions.add(el)
          update(el)
        } else el.removeAttribute('data-scroll-fade')
      }
  }
  const schedule = () => { if (!frame && !stopped) frame = requestAnimationFrame(() => measureWork('widget-scroll-fades', scan)) }
  const resize = new ResizeObserver(schedule)
  const mutation = new MutationObserver(schedule)
  mutation.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] })
  const onScroll = (event: Event) => {
    if (event.target instanceof HTMLElement && regions.has(event.target)) update(event.target)
  }
  root.addEventListener('scroll', onScroll, { capture: true, passive: true })
  window.addEventListener('resize', schedule)
  schedule()
  return () => {
    stopped = true
    cancelAnimationFrame(frame)
    resize.disconnect()
    mutation.disconnect()
    root.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', schedule)
    regions.forEach(el => { el.removeAttribute('data-scroll-fade'); el.style.removeProperty('--widget-scroll-mask') })
  }
}
