import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

let lastHiddenAt = -Infinity
export const tooltipDelay = () => performance.now() - lastHiddenAt < 300 ? 0 : 400
export const tooltipHidden = () => { lastHiddenAt = performance.now() }

/** Shared portal for explicit and legacy title hints; stays inside the viewport. */
export function TooltipBubble({ anchor, label, keys, id }: { anchor: HTMLElement; label: string; keys?: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number; below: boolean; arrowLeft: number } | null>(null)
  useLayoutEffect(() => {
    const bubble = ref.current
    if (!bubble) return
    const r = anchor.getBoundingClientRect()
    const b = bubble.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - 8))
    const below = r.bottom + 10 + b.height <= window.innerHeight - 8
    const top = Math.max(8, Math.min(below ? r.bottom + 10 : r.top - b.height - 10, window.innerHeight - b.height - 8))
    const arrowLeft = Math.max(12, Math.min(r.left + r.width / 2 - left, b.width - 12)) - 12
    setPosition({ left, top, below, arrowLeft })
  }, [anchor, label, keys])
  return createPortal(<div ref={ref} id={id} role="tooltip" style={{
    position: 'fixed', left: position?.left ?? 8, top: position?.top ?? 8, visibility: position ? 'visible' : 'hidden', zIndex: 4000,
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
    background: 'var(--color-bg-2)', color: 'var(--color-text)',
    fontSize: 12, fontWeight: 600, lineHeight: 1.4,
    width: 'max-content', whiteSpace: 'pre-line', overflowWrap: 'anywhere', maxWidth: 'min(360px, calc(100vw - 16px))', boxSizing: 'border-box', pointerEvents: 'none',
    filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.28)) drop-shadow(0 1px 3px rgba(0,0,0,0.14))',
  }}>
    <svg aria-hidden="true" focusable="false" width="24" height="10" viewBox="0 0 24 10"
      data-tooltip-pointer={position?.below ? 'top' : 'bottom'}
      style={{ position: 'absolute', left: position?.arrowLeft ?? 0,
        ...(position?.below ? { top: -9 } : { bottom: -9, transform: 'rotate(180deg)' }),
        fill: 'var(--color-bg-2)', overflow: 'visible',
      }}>
      <path d="M0 10 C5 10 7 8 10 3 Q12 -1 14 3 C17 8 19 10 24 10 Z" />
    </svg>
    <span style={{ minWidth: 0 }}>{label}</span>{keys && <span style={{ opacity: 0.55, fontWeight: 500, flexShrink: 0 }}>{keys}</span>}</div>, document.body)
}

/** Custom hints on hover and keyboard focus; never intercept touch or clicks. */
export default function Tooltip({ label, keys, children }: { label: string; keys?: string; children: ReactElement<Record<string, unknown>> }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const id = useId()
  const visible = useRef(false)
  const hide = () => { clearTimeout(timer.current); if (visible.current) tooltipHidden(); visible.current = false; setAnchor(null) }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => { document.removeEventListener('keydown', key); window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide) }
  }, [])
  const show = (el: HTMLElement) => { clearTimeout(timer.current); timer.current = setTimeout(() => { visible.current = true; setAnchor(el) }, tooltipDelay()) }
  const p = children.props
  const child = cloneElement(children, {
    title: '', 'data-custom-tooltip': true,
    'aria-label': (p['aria-label'] as string | undefined) ?? label,
    'aria-describedby': [p['aria-describedby'], anchor ? id : null].filter(Boolean).join(' ') || undefined,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') show(e.currentTarget); (p.onPointerEnter as ((e: unknown) => void) | undefined)?.(e) },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { hide(); (p.onPointerLeave as ((e: unknown) => void) | undefined)?.(e) },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget); (p.onFocus as ((e: unknown) => void) | undefined)?.(e) },
    onBlur: (e: React.FocusEvent<HTMLElement>) => { hide(); (p.onBlur as ((e: unknown) => void) | undefined)?.(e) },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { hide(); (p.onPointerDown as ((e: unknown) => void) | undefined)?.(e) },
  })
  return <>{child}{anchor && <TooltipBubble anchor={anchor} label={label} keys={keys} id={id} />}</>
}
