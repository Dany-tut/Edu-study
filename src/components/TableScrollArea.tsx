import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useScrollFades } from '../lib/useScrollFades'

/** Keep the frame visible while the table fades at its own scroll edges. */
export default function TableScrollArea({ children, style, className }: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollFades(ref, true, ':scope > table')
  return (
    <div style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden', ...style }}>
      <div ref={ref} className={className} style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}
