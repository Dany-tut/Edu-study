import { useLayoutEffect, useRef, type ComponentProps, type CSSProperties } from 'react'

/** Keep the native editable field, its focus ring and adjacent actions intact. */
export default function AuthFadeInput({ fadeColor = 'var(--color-surface)', wrapStyle, ...props }: ComponentProps<'input'> & {
  /** Цвет фейда = фон поля: у FIELD это --color-bg-input. */
  fadeColor?: string
  wrapStyle?: CSSProperties
}) {
  const ref = useRef<HTMLInputElement>(null)
  const layer = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const input = ref.current!
    const overlay = layer.current!
    let frame = 0
    const update = () => {
      frame = 0
      const css = getComputedStyle(input)
      const left = input.scrollLeft > 1
      const right = input.scrollWidth - input.clientWidth - input.scrollLeft > 1
      const surface = fadeColor
      overlay.style.left = `calc(${css.borderLeftWidth} + ${css.paddingLeft})`
      overlay.style.right = `calc(${css.borderRightWidth} + ${css.paddingRight})`
      overlay.style.backgroundImage = [
        left && `linear-gradient(to right, ${surface}, transparent 14px)`,
        right && `linear-gradient(to left, ${surface}, transparent 14px)`,
      ].filter(Boolean).join(', ') || 'none'
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const resize = new ResizeObserver(schedule)
    resize.observe(input)
    const events = ['scroll', 'focus', 'blur', 'input', 'keyup', 'select', 'pointerup']
    events.forEach(event => input.addEventListener(event, schedule))
    document.fonts.addEventListener('loadingdone', schedule)
    update()
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      events.forEach(event => input.removeEventListener(event, schedule))
      document.fonts.removeEventListener('loadingdone', schedule)
    }
  }, [props.value, props.type, props.style, fadeColor])

  return <div style={{ position: 'relative', ...wrapStyle }}>
    <input {...props} ref={ref} />
    <span aria-hidden ref={layer} style={{ position: 'absolute', top: '20%', bottom: '20%', pointerEvents: 'none' }} />
  </div>
}
