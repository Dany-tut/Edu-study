import { createElement, useRef, type HTMLAttributes } from 'react'
import { useOpticalText } from '../lib/useOpticalText'

/** Plain control text only: adjacent icons, badges and actions stay outside. */
export default function OpticalText({ children, style, as = 'span', ...props }:
  Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { children: string | number; as?: 'span' | 'iskra-button-label' }) {
  const ref = useRef<HTMLElement>(null)
  useOpticalText(ref, children)
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
