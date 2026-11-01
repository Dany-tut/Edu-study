import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Fade only overflowing text; keep the full label in the DOM and title. */
export default function FadeText({ children, style, className, enabled = true }: {
  children: ReactNode
  style?: CSSProperties
  className?: string
  enabled?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [enabled])

  const mask = enabled && overflow ? 'linear-gradient(to right, #000 calc(100% - 20px), transparent)' : undefined
  return <span ref={ref} className={className} title={typeof children === 'string' ? children : undefined} style={{
    display: 'block', minWidth: 0, maxWidth: '100%', ...style,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: enabled ? 'clip' : 'ellipsis',
    maskImage: mask, WebkitMaskImage: mask,
  }}>{enabled ? <span style={{ display: 'block', width: 'max-content', minWidth: '100%' }}>{children}</span> : children}</span>
}
