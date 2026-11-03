import { forwardRef, useCallback, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties } from 'react'
import { ChevronDown } from './appIcons'
import FadeText from '../FadeText'

const EMPTY_STYLE: CSSProperties = {}

/** Preserve the native picker, keyboard and form semantics; fade only its visible label. */
export const LoopSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(
  function LoopSelect({ style = EMPTY_STYLE, disabled, children, onChange, ...props }, ref) {
    const select = useRef<HTMLSelectElement | null>(null)
    const [label, setLabel] = useState('')
    const [labelStyle, setLabelStyle] = useState<CSSProperties>({})
    const attach = useCallback((node: HTMLSelectElement | null) => {
      select.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }, [ref])
    useLayoutEffect(() => {
      const node = select.current
      if (!node) return
      const sync = () => {
        const css = getComputedStyle(node)
        setLabel(node.selectedOptions[0]?.textContent ?? '')
        setLabelStyle({
          font: css.font, letterSpacing: css.letterSpacing, color: style.color ?? 'var(--color-text)',
          opacity: css.opacity, textAlign: css.textAlign as CSSProperties['textAlign'],
          paddingLeft: `calc(${css.paddingLeft} + ${css.borderLeftWidth})`, paddingRight: 36,
        })
      }
      sync()
      const resize = new ResizeObserver(sync)
      resize.observe(node)
      return () => resize.disconnect()
    }, [children, props.value, props.defaultValue, disabled, style])
    const { width = '100%', margin, marginTop, marginBottom, marginLeft, marginRight, ...selectStyle } = style
    return (
      <div className="loop-select" style={{ position: 'relative', minWidth: 0, width, margin, marginTop, marginBottom, marginLeft, marginRight }}>
        <select {...props} ref={attach} disabled={disabled} onChange={event => {
          setLabel(event.currentTarget.selectedOptions[0]?.textContent ?? '')
          onChange?.(event)
        }} style={{ ...selectStyle, width: '100%', display: 'block', appearance: 'none', backgroundImage: 'none', paddingRight: 36, WebkitTextFillColor: 'transparent' }}>
          {children}
        </select>
        <span className="loop-select-label" aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', minWidth: 0, ...labelStyle }}>
          <FadeText style={{ width: '100%' }}>{label}</FadeText>
        </span>
        <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-3)', opacity: disabled ? 0.6 : 1 }} />
      </div>
    )
  },
)
