import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { glassCircle } from '../lib/mobileTokens'
import { useWheelHScroll } from '../lib/useWheelHScroll'

/**
 * Horizontal scroller with edge fades that appear only when content is hidden
 * past that edge. Native scrollbar hidden — the fade is the affordance.
 *
 * Use for chip/tab rows that must stay on ONE line: when the row no longer
 * fits, the extra chips go off-screen under the fade instead of wrapping onto
 * a second and third line (which shoves everything below out of the layout).
 *
 * `fade` must match the surface behind the row so the gradient blends in.
 *
 * NB: an absolutely-positioned floating pill (useFloatingPill) must live in an
 * inner wrapper INSIDE `children`, not on the scroller itself — the pill's
 * offsets resolve against the scroll content, and measuring against the
 * scrolling box would drift by scrollLeft.
 */
export default function HScrollFade({
  children,
  gap = 8,
  fade = 'var(--color-bg)',
  padX = 0,
  padTop = 3,
  padBottom = 7,
  fadeWidth = 40,
  arrows = false,
  style,
  scrollStyle,
}: {
  children: ReactNode
  gap?: number
  /** Color the edge fade blends into — match the surface behind the row. */
  fade?: string
  padX?: number
  padTop?: number
  padBottom?: number
  fadeWidth?: number
  /** Кнопки-стрелки у краёв — для рядов, где фейд плохо читается сам по себе. */
  arrows?: boolean
  /** Merged into the outer (relative) wrapper. */
  style?: React.CSSProperties
  /** Merged into the inner scrollable element. */
  scrollStyle?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = (el: HTMLElement) => {
    // Скрытую строку не меряем. Десктопная и мобильная вёрстки живут в DOM
    // одновременно, и невидимая ветка стоит под display:none: там clientWidth и
    // scrollWidth равны нулю, «справа ничего не спрятано» — и замер, случившийся
    // в этот момент, гасил фейд насовсем, потому что после появления строки
    // ширина её собственной коробки уже не менялась.
    if (el.clientWidth === 0) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // Клик по стрелке листает на 3/4 видимой ширины — так на краю всегда остаётся
  // «якорь» из предыдущего экрана и ряд не перепрыгивает вслепую.
  const nudge = (dir: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    const step = Math.max(120, el.clientWidth * 0.75)
    const from = el.scrollLeft
    const to = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, from + (dir === 'left' ? -step : step)))
    el.scrollTo({ left: to, behavior: 'smooth' })
    // Плавность глушат prefers-reduced-motion и часть вебвью — молча, без
    // ошибки. Если через кадр ряд не тронулся, доводим рывком: кнопка обязана
    // листать всегда. [[reference-invisible-in-dark]]
    setTimeout(() => { if (el.scrollLeft === from && from !== to) el.scrollLeft = to }, 120)
  }

  useWheelHScroll(ref)

  // Content and width both change without a scroll event (course list loads,
  // window resizes, a pill grows), so re-measure on every commit + on resize.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    update(el)
    const observer = new ResizeObserver(() => update(el))
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    return () => observer.disconnect()
  })

  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        ref={ref}
        className="no-scrollbar"
        onScroll={e => update(e.currentTarget)}
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padX,
          paddingRight: padX,
          ...scrollStyle,
        }}
      >
        {children}
      </div>
      {/* zIndex обязателен: вкладки внутри ряда сидят на zIndex 1–3 (пилюля,
          активная кнопка), и фейд без своего слоя уезжает ПОД текст — градиент
          есть, а на экране его не видно. */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none', zIndex: 5,
          background: `linear-gradient(to right, ${fade}, transparent)`,
          opacity: edges.left ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: fadeWidth, pointerEvents: 'none', zIndex: 5,
          background: `linear-gradient(to left, ${fade}, transparent)`,
          opacity: edges.right ? 1 : 0, transition: 'opacity 0.18s ease',
        }}
      />
      {/* Стрелки. Одного градиента мало: на тёмной теме фейд по чёрному фону
          глазом не читается, и ряд выглядит просто обрезанным — «скролл не
          работает». Кнопка появляется только с той стороны, где что-то спрятано. */}
      {arrows && (['left', 'right'] as const).map(side => (
        <button
          key={side}
          aria-hidden={!edges[side]}
          tabIndex={-1}
          onClick={() => nudge(side)}
          style={{
            position: 'absolute', [side]: 0, top: '50%', transform: 'translateY(-50%)',
            width: 26, height: 26, padding: 0, cursor: 'pointer', zIndex: 6,
            opacity: edges[side] ? 1 : 0,
            pointerEvents: edges[side] ? 'auto' : 'none',
            transition: 'opacity 0.18s ease',
            ...glassCircle,
          }}
        >
          {side === 'left' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      ))}
    </div>
  )
}
