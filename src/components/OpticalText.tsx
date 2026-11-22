import { createElement, useRef, type HTMLAttributes } from 'react'
import { useOpticalText } from '../lib/useOpticalText'

type Caption = string | number
type OpticalTextProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & (
  | { as?: 'span'; children: Caption }
  | { as: 'iskra-button-label'; children: Caption | readonly Caption[] }
)

/** Plain control text only: adjacent icons, badges and actions stay outside. */
export default function OpticalText({ children, style, as = 'span', ...props }: OpticalTextProps) {
  const ref = useRef<HTMLElement>(null)
  useOpticalText(ref)
  // Some existing buttons reserve direct spans for counters or hide them at mobile breakpoints.
  return createElement(as, {
    ...props, ref, 'data-optical-text': true,
    style: {
      ...style,
      position: 'relative',
      top: 'var(--iskra-control-text-offset, 0px)',
      ...(as === 'iskra-button-label' ? { pointerEvents: 'none' } : {}),
    },
  }, children)
}
