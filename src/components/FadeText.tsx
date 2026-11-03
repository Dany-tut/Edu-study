import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { refreshTextFades, textFadeLines } from '../lib/textFades'

/** The entire label remains readable to accessibility tools and in the native tooltip. */
<<<<<<< HEAD
export default function FadeText({ children, style, className, lines = 1, fadeMode = 'block' }: {
=======
export default function FadeText({ children, style, className, lines = 1 }: {
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
  children: ReactNode
  style?: CSSProperties
  className?: string
  /** Kept for existing callers; text truncation always uses a fade on every breakpoint. */
  enabled?: boolean
  lines?: number
<<<<<<< HEAD
  /** Keep preceding lines opaque and fade only the trailing end of the last line. */
  fadeMode?: 'block' | 'last-line'
}) {
  useLayoutEffect(() => { refreshTextFades() }, [children, lines, fadeMode])
  return <span className={className} data-text-fade={lines} data-text-fade-mode={fadeMode === 'last-line' ? 'last-line' : undefined} title={typeof children === 'string' ? children : undefined} style={{
=======
}) {
  useLayoutEffect(() => { refreshTextFades() }, [children, lines])
  return <span className={className} data-text-fade={lines} title={typeof children === 'string' ? children : undefined} style={{
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
    display: 'block', minWidth: 0, maxWidth: '100%', ...style,
    ...(lines > 1 ? textFadeLines(lines) : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }),
  }}>{children}</span>
}
