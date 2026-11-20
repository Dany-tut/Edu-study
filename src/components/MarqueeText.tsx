import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/**
 * Длинная строка, которая сама показывает себя целиком.
 *
 * Помещается — стоит как обычный текст. Не помещается — стоит в начале с фейдом
 * справа, через паузу плавно доезжает до конца (фейд переезжает влево), снова
 * пауза и плавно обратно. Края всегда растворяются, а не обрезаются.
 *
 * Без класса text-fade: глобальный textFades ставит свою маску и затёр бы нашу.
 * Движение — CSS-переходом transform (без rAF), фейды — через @property, чтобы
 * края проявлялись плавно, а не щелчком. При «уменьшить движение» — стоим.
 */
export default function MarqueeText({ children, className, style, pause = 2500, speed = 36 }: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Пауза на каждом краю, мс. */
  pause?: number
  /** Скорость прокрутки, px/с. */
  speed?: number
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    let overflow = 0

    const setFades = (left: boolean, right: boolean) => {
      outer.style.setProperty('--mq-l', left ? '24px' : '0px')
      outer.style.setProperty('--mq-r', right ? '24px' : '0px')
    }
    const move = (to: number, ms: number) => {
      inner.style.transition = ms ? `transform ${ms}ms cubic-bezier(.45,0,.55,1)` : 'none'
      inner.style.transform = `translate3d(${-to}px,0,0)`
    }
    const stop = () => { window.clearTimeout(timer); timer = 0 }

    const cycle = (atEnd: boolean) => {
      // Стоим на краю, затем едем к другому: оба фейда, пока строка в пути.
      timer = window.setTimeout(() => {
        const ms = Math.max(900, (overflow / speed) * 1000)
        setFades(true, true)
        move(atEnd ? 0 : overflow, ms)
        timer = window.setTimeout(() => {
          setFades(atEnd ? false : true, atEnd ? true : false)
          cycle(!atEnd)
        }, ms)
      }, pause)
    }

    const measure = () => {
      const next = Math.max(0, inner.scrollWidth - outer.clientWidth)
      if (Math.abs(next - overflow) < 1 && timer) return
      overflow = next
      stop()
      move(0, 0)
      if (overflow < 2) { setFades(false, false); return }
      setFades(false, true)
      if (!reduce) cycle(false)
    }

    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(outer)
    ro?.observe(inner)
    return () => { stop(); ro?.disconnect() }
  }, [children, pause, speed])

  return (
    <div
      ref={outerRef}
      className={`marquee-text${className ? ` ${className}` : ''}`}
      title={typeof children === 'string' ? children : undefined}
      style={style}
    >
      <span ref={innerRef} className="marquee-text-inner">{children}</span>
    </div>
  )
}
