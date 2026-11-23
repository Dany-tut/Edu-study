import OpticalText from './OpticalText'
import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { refreshTextFades, textFadeLines } from '../lib/textFades'

/** The entire label remains readable to accessibility tools and in the native tooltip. */
export default function FadeText({ children, style, className, lines = 1, fadeMode = 'block', optical = false, opticalAlignment = 'baseline' }: {
  children: ReactNode
  /** Align plain control text; keep icons and rich content outside. */
  optical?: boolean
  opticalAlignment?: 'baseline' | 'ink'
  style?: CSSProperties
  className?: string
  /** Kept for existing callers; text truncation always uses a fade on every breakpoint. */
  enabled?: boolean
  lines?: number
  /** Keep preceding lines opaque and fade only the trailing end of the last line. */
  fadeMode?: 'block' | 'last-line'
}) {
  useLayoutEffect(() => { refreshTextFades() }, [children, lines, fadeMode])
  const appearance: CSSProperties = {
    display: 'block', minWidth: 0, maxWidth: '100%', ...style,
    ...(lines > 1 ? textFadeLines(lines) : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }),
  }
  const attributes = {
    className, 'data-text-fade': lines,
    'data-text-fade-mode': fadeMode === 'last-line' ? 'last-line' : undefined,
    title: typeof children === 'string' ? children : undefined, style: appearance,
  }
  if (optical && (typeof children === 'string' || typeof children === 'number')) {
    return <OpticalText alignment={opticalAlignment} {...attributes}>{children}</OpticalText>
  }
  return <span {...attributes}>{children}</span>
}
