import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { ChevronDown } from './appIcons'

/** Native keyboard, focus and option behavior with the shared Loop chevron. */
export const LoopSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(
  function LoopSelect({ style = {}, disabled, children, ...props }, ref) {
    const { width = '100%', margin, marginTop, marginBottom, marginLeft, marginRight, ...selectStyle } = style
    return (
      <div style={{ position: 'relative', width, margin, marginTop, marginBottom, marginLeft, marginRight }}>
        <select {...props} ref={ref} disabled={disabled} style={{ ...selectStyle, width: '100%', display: 'block', appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}>
          {children}
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-3)', opacity: disabled ? 0.6 : 1 }} />
      </div>
    )
  },
)
