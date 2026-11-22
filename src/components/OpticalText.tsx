import { useRef, type HTMLAttributes } from 'react'
import { useOpticalText } from '../lib/useOpticalText'

/** Plain control text only: adjacent icons, badges and actions stay outside. */
export default function OpticalText({ children, style, ...props }:
  Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { children: string | number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useOpticalText(ref, children)
  return <span {...props} ref={ref} data-optical-text style={{
    ...style, position: 'relative', top: 'var(--iskra-control-text-offset, 0px)',
  }}>{children}</span>
}
