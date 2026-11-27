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
    // Один жест (включая инерцию трекпада) целиком принадлежит ряду, если он
    // начал листать ряд: иначе у края хвост жеста уезжал в страницу, и вместе
    // с вкладками прокручивалась лента (Дани, 27.11.2026, админка). Новый жест
    // у края — снова странице. Пауза между событиями одного жеста < 120 мс.
    let ownedUntil = 0
    const own = (e: WheelEvent) => { ownedUntil = e.timeStamp + 120; e.preventDefault() }
    const onWheel = (e: WheelEvent) => {
      // Programmatically centered strips must not move with wheel gestures.
      if (!/^(auto|scroll)$/.test(getComputedStyle(el).overflowX)) return
      const maxX = el.scrollWidth - el.clientWidth
      if (e.timeStamp < ownedUntil && maxX > 1) {
        const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        own(e)
        el.scrollLeft = Math.max(0, Math.min(maxX, el.scrollLeft + dx))
        return
      }
      // Свайп трекпада вбок: листаем ряд сами. Браузеру его не отдаём — у
      // диагонального свайпа вертикальная доля прокручивала страницу.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (maxX <= 1) return
        own(e)
        el.scrollLeft = Math.max(0, Math.min(maxX, el.scrollLeft + e.deltaX))
        return
      }
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
      own(e)
      el.scrollLeft = next
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])
}
