import { useLayoutEffect, useRef } from 'react'
import { scrollFadeMask } from '../../lib/useScrollFades'

/** Editable media caption: natural wrapping, at most three visible lines. */
export default function MediaCaptionInput({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return
    const fade = () => {
      const mask = scrollFadeMask(field.scrollTop, field.clientHeight, field.scrollHeight)
      field.style.maskImage = mask
      field.style.webkitMaskImage = mask
    }
    const measure = () => {
      const top = field.scrollTop
      field.style.height = '0px'
      field.style.height = `${Math.min(54, Math.max(18, field.scrollHeight))}px`
      field.scrollTop = top
      fade()
    }
    const resize = new ResizeObserver(measure)
    resize.observe(field)
    window.addEventListener('resize', measure)
    document.fonts.addEventListener('loadingdone', measure)
    field.addEventListener('scroll', fade, { passive: true })
    let active = true
    void document.fonts.ready.then(() => { if (active) measure() })
    measure()
    return () => {
      active = false
      resize.disconnect()
      field.removeEventListener('scroll', fade)
      window.removeEventListener('resize', measure)
      document.fonts.removeEventListener('loadingdone', measure)
    }
  }, [value])

  return (
    <div style={{ marginTop: 8, width: '100%', maxWidth: 340, padding: '4px 0', borderBottom: '1px solid var(--color-border-medium)' }}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value.replace(/[\r\n]+/g, ' '))}
        onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }}
        onBlur={event => { event.currentTarget.scrollTop = 0 }}
        style={{
          display: 'block', boxSizing: 'border-box', width: '100%', height: 18,
          padding: 0, border: 'none', resize: 'none', overflowY: 'auto', overflowX: 'hidden',
          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          background: 'transparent', color: 'var(--color-text)',
          fontSize: 12, lineHeight: '18px', fontFamily: 'inherit', outline: 'none',
          scrollbarWidth: 'none',
        }}
      />
    </div>
  )
}
