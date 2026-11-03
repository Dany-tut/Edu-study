import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { refreshTextFades, textFadeLines } from '../lib/textFades'

/** The entire label remains readable to accessibility tools and in the native tooltip. */
export default function FadeText({ children, style, className, lines = 1 }: {
  children: ReactNode
  style?: CSSProperties
  className?: string
  /** Kept for existing callers; text truncation always uses a fade on every breakpoint. */
  enabled?: boolean
  lines?: number
}) {
  useLayoutEffect(() => { refreshTextFades() }, [children, lines])
  return <span className={className} data-text-fade={lines} title={typeof children === 'string' ? children : undefined} style={{
    display: 'block', minWidth: 0, maxWidth: '100%', ...style,
    ...(lines > 1 ? textFadeLines(lines) : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }),
  }}>{children}</span>
}
