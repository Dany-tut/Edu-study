import { useEffect, type RefObject } from 'react'

/**
 * Колесо мыши → горизонтальная прокрутка ряда. Мышь шлёт только deltaY, и
 * браузер сам крутит по горизонтали лишь трекпадный deltaX, поэтому ряд с
 * overflowX:auto и спрятанным скроллбаром мышью не листается вовсе — выглядит
 * как «скролл не работает». На краю ряда колесо отдаём странице, иначе лист
 * упирался бы в строку под курсором.
 *
 * Слушатель нативный, не onWheel: React вешает wheel на корень пассивным, и
 * preventDefault из пропа-обработчика браузер бы не принял.
 */
export function useWheelHScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Programmatically centered strips must not move with wheel gestures.
      if (!/^(auto|scroll)$/.test(getComputedStyle(el).overflowX)) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      // A lesson list inside a day owns vertical wheel gestures, including at
      // its ends (overscroll-behavior: contain). Do not turn them into date changes.
      let target = e.target instanceof Element ? e.target : null
      while (target && target !== el) {
        if (target.scrollHeight > target.clientHeight + 1
          && /^(auto|scroll)$/.test(getComputedStyle(target).overflowY)) return
        target = target.parentElement
      }
      const max = el.scrollWidth - el.clientWidth
      if (max <= 1) return
      // deltaMode: 0 — пиксели, 1 — строки, 2 — экраны. Мыши часто шлют строки.
      const step = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1)
      const next = Math.max(0, Math.min(max, el.scrollLeft + step))
      if (next === el.scrollLeft) return
      e.preventDefault()
      el.scrollLeft = next
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])
}
