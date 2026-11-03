import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { columnWindow } from './columnWindow'

export function useColumnWindow(scroller: RefObject<HTMLDivElement | null>, count: number, position: RefObject<{ left: number; top: number }>) {
  const [range, setRange] = useState(() => columnWindow(count, position.current.left, 1280, 145))
  const metrics = useRef({ column: 156, frozen: 176 })
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const css = getComputedStyle(el.parentElement!)
      metrics.current = { column: parseFloat(css.getPropertyValue('--work-col')) || 156,
        frozen: parseFloat(css.getPropertyValue('--student-col')) || 176 }
      const next = columnWindow(count, el.scrollLeft, el.clientWidth - metrics.current.frozen, metrics.current.column)
      setRange(previous => previous.start === next.start && previous.end === next.end ? previous : next)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    el.scrollLeft = position.current.left
    el.scrollTop = position.current.top
    update()
    const resize = new ResizeObserver(schedule)
    resize.observe(el)
    el.addEventListener('scroll', schedule, { passive: true })
    return () => { cancelAnimationFrame(raf); resize.disconnect(); el.removeEventListener('scroll', schedule) }
  }, [count, scroller, position])
  const reveal = useCallback((index: number) => {
    const el = scroller.current
    if (!el || index < 0) return
    const { column, frozen } = metrics.current
    const left = index * column, right = left + column
    if (left < el.scrollLeft) el.scrollLeft = left
    else if (right > el.scrollLeft + el.clientWidth - frozen) el.scrollLeft = right - el.clientWidth + frozen
    const next = columnWindow(count, el.scrollLeft, el.clientWidth - frozen, column)
    setRange(previous => previous.start === next.start && previous.end === next.end ? previous : next)
  }, [count, scroller])
  return { ...range, reveal }
}
