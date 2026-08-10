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
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

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
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none',
          background: `linear-gradient(to right, ${fade}, transparent)`,
          opacity: edges.left ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none',
          background: `linear-gradient(to left, ${fade}, transparent)`,
          opacity: edges.right ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
    </div>
  )
}
