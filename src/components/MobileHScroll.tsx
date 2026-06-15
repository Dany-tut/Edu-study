import { useState, useRef, useEffect, type ReactNode } from 'react'

// Horizontal scroller with edge fades that appear only when content is hidden
// past that edge (§1.3). Scrollbar hidden. MOBILE ONLY. Reused by chip rows
// (courses subjects/modules, trainer filters).
export default function MobileHScroll({
  children,
  gap = 8,
  fade = 'var(--color-bg)',
  padX = 16,
}: {
  children: ReactNode
  gap?: number
  /** Color the edge fade blends into — match the surface behind the row. */
  fade?: string
  padX?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = (el: HTMLElement) => {
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  useEffect(() => {
    if (ref.current) update(ref.current)
  })

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        className="no-scrollbar"
        onScroll={e => update(e.currentTarget)}
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          // Vertical breathing room so active-pill shadows aren't clipped.
          paddingTop: 3,
          paddingBottom: 7,
          paddingLeft: padX,
          paddingRight: padX,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, pointerEvents: 'none',
          background: `linear-gradient(to right, ${fade}, transparent)`,
          opacity: edges.left ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, pointerEvents: 'none',
          background: `linear-gradient(to left, ${fade}, transparent)`,
          opacity: edges.right ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
    </div>
  )
}
