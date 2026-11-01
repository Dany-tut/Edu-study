import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const FADE = 'linear-gradient(to right, #000 calc(100% - 24px), transparent)'

/** Одна строка в капсуле; фейд нужен только при реальном переполнении. */
export default function PillText({ expanded, children, style }: {
  expanded: boolean
  children: ReactNode
  style?: CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const measure = useCallback(() => {
    const el = ref.current
    if (el) setOverflowing(el.scrollWidth > el.clientWidth)
  }, [])

  // Текст, его оформление и режим могут измениться без изменения ширины блока.
  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    let active = true
    const onFontsLoaded = () => { if (active) measure() }
    void document.fonts.ready.then(onFontsLoaded)
    document.fonts.addEventListener('loadingdone', onFontsLoaded)
    return () => {
      active = false
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', onFontsLoaded)
    }
  }, [measure])

  const mask = !expanded && overflowing ? FADE : undefined
  return (
    <span ref={ref} style={{
      ...style,
      minWidth: 0,
      overflow: 'hidden',
      whiteSpace: expanded ? 'normal' : 'nowrap',
      maskImage: mask,
      WebkitMaskImage: mask,
    }}>
      {children}
    </span>
  )
}
