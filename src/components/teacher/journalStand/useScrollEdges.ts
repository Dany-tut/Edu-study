import { useLayoutEffect, useRef } from 'react'

/** The sticky chrome stays crisp; consumers paint fades only over the moving content. */
export function useScrollEdges(hasOverlay = false) {
  const viewport = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const view = viewport.current, el = scroller.current
    if (!view || !el) return
    const update = () => {
      const { scrollLeft: x, scrollTop: y, clientWidth, clientHeight } = el
      const edges = [
        x > 1 && 'left', y > 1 && 'top',
        el.scrollWidth - clientWidth - x > 1 && 'right',
        el.scrollHeight - clientHeight - y > 1 && 'bottom',
      ].filter(Boolean).join(' ')
      if (view.dataset.edges !== edges) view.dataset.edges = edges
    }
    const measure = () => {
      const head = el.querySelector('thead')
      if (head) view.style.setProperty('--head-h', head.getBoundingClientRect().height + 'px')
      view.style.setProperty('--bar-x', (el.offsetHeight - el.clientHeight) + 'px')
      view.style.setProperty('--bar-y', (el.offsetWidth - el.clientWidth) + 'px')
      update()
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    const table = el.querySelector('table')
    if (table) ro.observe(table)
    measure()
    el.addEventListener('scroll', update, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', update) }
  }, [hasOverlay])
  return { viewport, scroller }
}
