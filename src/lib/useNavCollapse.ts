import { useEffect, useRef, useState } from 'react'

// Collapses the mobile bottom nav on scroll DOWN and restores it on scroll UP:
// the labels fade out and the dock shrinks a touch, then everything comes back
// when the user scrolls back up (or reaches the top). A capture-phase scroll
// listener catches whichever element is actually scrolling — the window or any
// inner scroll container the mobile screens use — so it works everywhere the
// nav is mounted without each page having to wire it up.
export function useNavCollapse(threshold = 6) {
  const [collapsed, setCollapsed] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document | Window
      const el = t === document || t === window
        ? (document.scrollingElement as HTMLElement | null)
        : (t as HTMLElement)
      const raw = t === document || t === window
        ? window.scrollY
        : (t as HTMLElement).scrollTop
      if (typeof raw !== 'number') return
      // iOS-резинка отдаёт позиции ЗА пределами прокрутки: у нижнего края
      // отскок читался как «скролл вверх», и бар разворачивался сам, пока палец
      // ещё вёл вниз. Обрезаем позицию рамками контейнера — за краями dy = 0.
      const max = el ? Math.max(0, el.scrollHeight - el.clientHeight) : Infinity
      const y = Math.min(Math.max(raw, 0), max)
      const dy = y - lastY.current
      // Ignore micro-scrolls / momentum jitter so the bar doesn't flicker.
      if (Math.abs(dy) < threshold) { lastY.current = y; return }
      if (y <= 4) setCollapsed(false)        // near the top → always expanded
      else if (dy > 0) setCollapsed(true)    // scrolling down → collapse
      else setCollapsed(false)               // scrolling up → expand
      lastY.current = y
    }
    // capture:true so scrolls inside nested containers bubble to us too.
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [threshold])

  return collapsed
}
