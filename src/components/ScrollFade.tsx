import { useState } from 'react'

/**
 * Wraps a scrollable list with top/bottom gradient fades that appear only
 * when there is content hidden above/below (fade fades in on scroll).
 *
 * `bg` should match the container's background so the gradient blends in.
 * For glass dropdowns pass `rgba(var(--glass-rgb), 0.96)`.
 * Defaults to `var(--color-bg)` (page background).
 */
export default function ScrollFade({
  children,
  maxHeight,
  bg = 'var(--color-bg)',
  fadeHeight = 24,
}: {
  children: React.ReactNode
  maxHeight: number
  bg?: string
  fadeHeight?: number
}) {
  const [edges, setEdges] = useState({ top: false, bottom: false })

  function update(el: HTMLElement) {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setEdges(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={el => { if (el) update(el) }}
        onScroll={e => update(e.currentTarget)}
        style={{ maxHeight, overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: fadeHeight, pointerEvents: 'none',
        background: `linear-gradient(to bottom, ${bg}, transparent)`,
        opacity: edges.top ? 1 : 0, transition: 'opacity 0.18s ease',
        borderRadius: 'inherit',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: fadeHeight, pointerEvents: 'none',
        background: `linear-gradient(to top, ${bg}, transparent)`,
        opacity: edges.bottom ? 1 : 0, transition: 'opacity 0.18s ease',
        borderRadius: 'inherit',
      }} />
    </div>
  )
}
