import { useState, useRef, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** Высота растворения контента у верхнего/нижнего края скроллера, px. */
const FADE_PX = 30

/**
 * Fade + a floating overlay scrollbar for a scrollable list/panel.
 *
 * The native gutter is hidden (`no-scrollbar` on the scroll element) so content
 * runs full-width and a thin thumb rides ON TOP of it, appearing only while
 * scrolling. Уходящий за край контент растворяется маской НА САМОМ скроллере
 * (`fadeMask`), а не полоской-градиентом поверх него: подложка бывает стеклянной
 * (`rgba(var(--glass-rgb), …)` + backdrop-blur), её реальный цвет — композит,
 * который сплошной заливкой не повторить, и полоска всегда читалась как «чуть не
 * в цвет». Маска красит альфу самого контента и подходит любому фону.
 *
 * Usage:
 *   const { ref, fade, thumb, onScroll, maskStyle } = useOverlayScroll()
 *   <div style={{ position: 'relative', ... }}>
 *     <ScrollOverlays thumb={thumb} />
 *     <div ref={ref} onScroll={onScroll} className="no-scrollbar"
 *          style={{ overflowY: 'auto', ...maskStyle }}>…</div>
 *   </div>
 *
 * Uses ResizeObserver + a per-render sync (Claude Preview never fires rAF).
 */
export function useOverlayScroll() {
  const ref = useRef<HTMLDivElement>(null)
  // 0…1 — насколько растворён край (не булево: за первые FADE_PX прокрутки фейд
  // нарастает плавно, иначе он «щёлкал» бы целиком на первом же пикселе).
  const [fade, setFade] = useState({ top: 0, bottom: 0 })
  const [thumb, setThumb] = useState({ h: 0, top: 0, show: false, overflow: false })
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null)
  const measure = () => {
    const el = ref.current
    if (!el) return
    // Квантуем шагом 0.05, чтобы прокрутка не перерисовывала маску на каждый px.
    const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 20) / 20
    const top = q(el.scrollTop / FADE_PX)
    const bottom = q((el.scrollHeight - el.clientHeight - el.scrollTop) / FADE_PX)
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
  return { ref, fade, thumb, onScroll, maskStyle: fadeMask(fade) }
}

/**
 * Маска для самого скролл-элемента: контент тает в прозрачность у того края, за
 * который он уходит. Цвет подложки не участвует — поэтому одинаково честно
 * работает и на стекле, и на плоском фоне, и под блюр-шапкой.
 */
export function fadeMask(fade: { top: number; bottom: number }, size = FADE_PX): CSSProperties {
  if (fade.top <= 0 && fade.bottom <= 0) return {}
  const img =
    `linear-gradient(to bottom, rgba(0,0,0,${1 - fade.top}) 0, ` +
    `#000 ${size}px, #000 calc(100% - ${size}px), ` +
    `rgba(0,0,0,${1 - fade.bottom}) 100%)`
  return { maskImage: img, WebkitMaskImage: img }
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
  children, style, scrollStyle, padding, className,
}: {
  children: ReactNode
  /** applied to the outer relative frame (put flex/size here) */
  style?: CSSProperties
  /** extra styles for the inner scroller */
  scrollStyle?: CSSProperties
  padding?: CSSProperties['padding']
  className?: string
}) {
  const { ref, fade, thumb, onScroll } = useOverlayScroll()
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...style }}>
      <ScrollOverlays thumb={thumb} />
      <div
        ref={ref}
        onScroll={onScroll}
        className={`no-scrollbar${className ? ` ${className}` : ''}`}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding, ...scrollStyle, ...fadeMask(fade) }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * The floating thumb to drop as a sibling of the `no-scrollbar` scroll element
 * inside a `position: relative` frame. Фейды краёв живут не здесь, а на самом
 * скроллере — см. `fadeMask`/`maskStyle`.
 */
export function ScrollOverlays({ thumb }: {
  thumb: { h: number; top: number; show: boolean; overflow: boolean }
}) {
  return (
    <>
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
