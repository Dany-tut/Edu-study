import { useState, useRef, useEffect, type ReactNode } from 'react'

/**
 * Horizontal scroller with edge fades that appear only when content is hidden
 * past that edge. Native scrollbar hidden — the fade is the affordance.
 *
 * Use for chip/tab rows that must stay on ONE line: when the row no longer
 * fits, the extra chips go off-screen under the fade instead of wrapping onto
 * a second and third line (which shoves everything below out of the layout).
 *
 * `fade` must match the surface behind the row so the gradient blends in.
 *
 * NB: an absolutely-positioned floating pill (useFloatingPill) must live in an
 * inner wrapper INSIDE `children`, not on the scroller itself — the pill's
 * offsets resolve against the scroll content, and measuring against the
 * scrolling box would drift by scrollLeft.
 */
export default function HScrollFade({
  children,
  gap = 8,
  fade = 'var(--color-bg)',
  padX = 0,
  padTop = 3,
  padBottom = 7,
  fadeWidth = 40,
  style,
  scrollStyle,
}: {
  children: ReactNode
  gap?: number
  /** Color the edge fade blends into — match the surface behind the row. */
  fade?: string
  padX?: number
  padTop?: number
  padBottom?: number
  fadeWidth?: number
  /** Merged into the outer (relative) wrapper. */
  style?: React.CSSProperties
  /** Merged into the inner scrollable element. */
  scrollStyle?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = (el: HTMLElement) => {
    // Скрытую строку не меряем. Десктопная и мобильная вёрстки живут в DOM
    // одновременно, и невидимая ветка стоит под display:none: там clientWidth и
    // scrollWidth равны нулю, «справа ничего не спрятано» — и замер, случившийся
    // в этот момент, гасил фейд насовсем, потому что после появления строки
    // ширина её собственной коробки уже не менялась.
    if (el.clientWidth === 0) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // Колесо мыши даёт только deltaY, и без перевода в горизонталь длинный ряд
  // листался бы одним перетаскиванием. Трекпад со своим deltaX браузер крутит
  // сам — туда не лезем. На краю ряда колесо отдаём странице: иначе прокрутка
  // упиралась бы в строку под курсором и лист вставал. Слушатель нативный, не
  // onWheel: React вешает wheel на корень пассивным, и preventDefault из
  // пропа-обработчика браузер бы не принял.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
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
  }, [])

  // Content and width both change without a scroll event (course list loads,
  // window resizes, a pill grows), so re-measure on every commit + on resize.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    update(el)
    const observer = new ResizeObserver(() => update(el))
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    return () => observer.disconnect()
  })

  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        ref={ref}
        className="no-scrollbar"
        onScroll={e => update(e.currentTarget)}
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padX,
          paddingRight: padX,
          ...scrollStyle,
        }}
      >
        {children}
      </div>
      {/* zIndex обязателен: вкладки внутри ряда сидят на zIndex 1–3 (пилюля,
          активная кнопка), и фейд без своего слоя уезжает ПОД текст — градиент
          есть, а на экране его не видно. */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none', zIndex: 5,
          background: `linear-gradient(to right, ${fade}, transparent)`,
          opacity: edges.left ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none', zIndex: 5,
          background: `linear-gradient(to left, ${fade}, transparent)`,
          opacity: edges.right ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
    </div>
  )
}
