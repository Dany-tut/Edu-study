import { useState, useRef, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Fade masks + a floating overlay scrollbar for a scrollable list/panel.
 *
 * The native gutter is hidden (`no-scrollbar` on the scroll element) so content
 * runs full-width and a thin thumb rides ON TOP of it, appearing only while
 * scrolling. Top/bottom gradient fades appear when content is hidden above/below.
 *
 * Usage:
 *   const { ref, fade, thumb, onScroll } = useOverlayScroll()
 *   <div style={{ position: 'relative', ... }}>
 *     <ScrollOverlays fade={fade} thumb={thumb} bg="var(--color-bg-3)" />
 *     <div ref={ref} onScroll={onScroll} className="no-scrollbar"
 *          style={{ overflowY: 'auto', ... }}>…</div>
 *   </div>
 *
 * Uses ResizeObserver + a per-render sync (Claude Preview never fires rAF).
 */
export function useOverlayScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })
  const [thumb, setThumb] = useState({ h: 0, top: 0, show: false, overflow: false })
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null)
  const measure = () => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 1
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setFade(f => (f.top === top && f.bottom === bottom) ? f : { top, bottom })
    const inset = 4
    const overflow = el.scrollHeight > el.clientHeight + 1
    const trackH = Math.max(0, el.clientHeight - inset * 2)
    const h = trackH > 0 && overflow ? Math.max(24, (el.clientHeight / el.scrollHeight) * trackH) : 0
    const maxScroll = el.scrollHeight - el.clientHeight
    const tp = inset + (maxScroll > 0 ? (el.scrollTop / maxScroll) * (trackH - h) : 0)
    setThumb(p => (p.h === h && p.top === tp && p.overflow === overflow) ? p : { ...p, h, top: tp, overflow })
  }
  useEffect(measure)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onScroll = () => {
    measure()
    setThumb(p => p.show ? p : { ...p, show: true })
    if (hide.current) clearTimeout(hide.current)
    hide.current = setTimeout(() => setThumb(p => ({ ...p, show: false })), 900)
  }
  return { ref, fade, thumb, onScroll }
}

/**
 * Drop-in scroll area with the overlay scrollbar baked in: a `position: relative`
 * frame + `<ScrollOverlays>` + a `no-scrollbar` scroller. Content runs full-width
 * (no native gutter) and a thin thumb floats on top. Use instead of a raw
 * `<div style={{ overflowY: 'auto' }}>`.
 *
 *   <OverlayScrollArea style={{ flex: 1 }} padding="28px 36px" bg="var(--color-bg-3)">
 *     …content…
 *   </OverlayScrollArea>
 */
export function OverlayScrollArea({
  children, style, scrollStyle, padding, bg, className,
}: {
  children: ReactNode
  /** applied to the outer relative frame (put flex/size here) */
  style?: CSSProperties
  /** extra styles for the inner scroller */
  scrollStyle?: CSSProperties
  padding?: CSSProperties['padding']
  /** frame background — match the surrounding surface so the fades blend */
  bg?: string
  className?: string
}) {
  const { ref, fade, thumb, onScroll } = useOverlayScroll()
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...style }}>
      <ScrollOverlays fade={fade} thumb={thumb} bg={bg} />
      <div
        ref={ref}
        onScroll={onScroll}
        className={`no-scrollbar${className ? ` ${className}` : ''}`}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding, ...scrollStyle }}
      >
        {children}
      </div>
    </div>
  )
}

function ScrollFadeMask({ side, show, bg = 'rgba(var(--glass-rgb), 0.95)' }: { side: 'top' | 'bottom'; show: boolean; bg?: string }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, height: 36, pointerEvents: 'none', zIndex: 3,
      [side]: -8,
      background: `linear-gradient(to ${side === 'top' ? 'bottom' : 'top'}, ${bg}, transparent)`,
      opacity: show ? 1 : 0, transition: 'opacity 0.18s ease',
    }} />
  )
}

/**
 * The overlay layer (2 fades + floating thumb) to drop as a sibling of the
 * `no-scrollbar` scroll element inside a `position: relative` frame.
 * `bg` should match the frame background so the fade blends in.
 */
export function ScrollOverlays({ fade, thumb, bg }: {
  fade: { top: boolean; bottom: boolean }
  thumb: { h: number; top: number; show: boolean; overflow: boolean }
  bg?: string
}) {
  return (
    <>
      <ScrollFadeMask side="top" show={fade.top} bg={bg} />
      <ScrollFadeMask side="bottom" show={fade.bottom} bg={bg} />
      {thumb.overflow && (
        <div style={{
          position: 'absolute', top: thumb.top, right: 2, width: 5, height: thumb.h,
          borderRadius: 999, background: 'var(--scroll-thumb)', pointerEvents: 'none', zIndex: 4,
          opacity: thumb.show ? 1 : 0, transition: 'opacity 0.3s ease',
        }} />
      )}
    </>
  )
}
