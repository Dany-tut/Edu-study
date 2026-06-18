import { useState } from 'react'

/**
 * Wraps a scrollable list with top/bottom gradient fades that appear only
 * when there is content hidden above/below (fade fades in on scroll).
 *
 * `bg` should match the container's background so the gradient blends in.
 * For glass dropdowns pass `rgba(var(--glass-rgb), 0.96)`.
 * Defaults to `var(--color-bg)` (page background).
 *
 * `overlayScrollbar` hides the native bar and draws a thin thumb floating ON TOP
 * of the content, so row hover/active backgrounds run full-width *under* the
 * scroll line instead of stopping short of it. Used by the dropdown menus.
 */
export default function ScrollFade({
  children,
  maxHeight,
  bg = 'var(--color-bg)',
  fadeHeight = 24,
  scrollClassName,
  style,
  scrollStyle,
  overlayScrollbar = false,
}: {
  children: React.ReactNode
  maxHeight: number
  bg?: string
  fadeHeight?: number
  scrollClassName?: string
  /** Merged into the outer (relative) wrapper. */
  style?: React.CSSProperties
  /** Merged into the inner scrollable element. */
  scrollStyle?: React.CSSProperties
  /** Float a thin thumb over the content instead of reserving a native gutter. */
  overlayScrollbar?: boolean
}) {
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const [metrics, setMetrics] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 })

  function update(el: HTMLElement) {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setEdges(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
    if (overlayScrollbar) {
      setMetrics(prev => (
        prev.scrollTop === el.scrollTop && prev.scrollHeight === el.scrollHeight && prev.clientHeight === el.clientHeight
          ? prev
          : { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
      ))
    }
  }

  // Floating thumb geometry (only when overlay mode and content overflows).
  const inset = 4
  const overflowing = metrics.scrollHeight > metrics.clientHeight + 1
  const trackH = Math.max(0, metrics.clientHeight - inset * 2)
  const thumbH = trackH > 0 ? Math.max(24, (metrics.clientHeight / metrics.scrollHeight) * trackH) : 0
  const maxScroll = metrics.scrollHeight - metrics.clientHeight
  const thumbTop = inset + (maxScroll > 0 ? (metrics.scrollTop / maxScroll) * (trackH - thumbH) : 0)

  const innerClass = overlayScrollbar
    ? ['no-scrollbar', scrollClassName].filter(Boolean).join(' ')
    : scrollClassName

  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        className={innerClass}
        ref={el => { if (el) update(el) }}
        onScroll={e => update(e.currentTarget)}
        style={{ maxHeight, overflowY: 'auto', overscrollBehavior: 'contain', ...scrollStyle }}
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
      {overlayScrollbar && overflowing && (
        <div style={{
          position: 'absolute', top: thumbTop, right: 2, width: 5, height: thumbH,
          borderRadius: 999, background: 'var(--scroll-thumb)', pointerEvents: 'none',
          transition: 'opacity 0.18s ease', opacity: edges.top || edges.bottom ? 1 : 0.55,
        }} />
      )}
    </div>
  )
}
