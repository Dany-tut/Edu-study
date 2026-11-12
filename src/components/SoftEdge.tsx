import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useIsDesktop } from '../lib/useIsDesktop'

// ─────────────────────────────────────────────────────────────────────────────
// SoftEdge — мягкий край прокрутки, как у iOS 26 (scroll edge effect «soft»).
// ТОЛЬКО для iPhone и iPad (lib/platform.ts, IS_IOS). Android и ПК остаются
// на фейдах SCROLL-01.
//
// Контент, уходящий под стеклянную шапку или нижние вкладки, не закрашивается
// цветом фона и не обрезается резкой плашкой: он размывается всё сильнее к краю
// экрана. Это «прогрессивное размытие» — несколько слоёв backdrop-filter с
// растущим радиусом, каждый виден только в своей полосе (маска). Слои
// прозрачны сами по себе, поэтому край одинаково честный на светлой, тёмной и
// цветной подложке — без заливок и градиентов цвета.
//
// strength 0…1 — насколько контент уже ушёл за край (из useOverlayScroll):
// в начале списка верхнего края нет вовсе, он нарастает с прокруткой.
// ─────────────────────────────────────────────────────────────────────────────

// Радиусы слоёв от дальнего (слабого) к ближнему к краю (сильному).
const LAYERS = [1, 2, 4]

export default function SoftEdge({ edge, size, strength = 1, zIndex = 55 }: {
  edge: 'top' | 'bottom'
  /** Высота полосы — CSS-длина (px или calc с safe-area). */
  size: string
  strength?: number
  zIndex?: number
}) {
  if (strength <= 0) return null
  // Направление: «к краю» = к верху экрана для top, к низу для bottom.
  const toward = edge === 'top' ? 'to top' : 'to bottom'
  const n = LAYERS.length
  const frame: CSSProperties = {
    position: 'absolute', left: 0, right: 0, [edge]: 0, height: size,
    pointerEvents: 'none', zIndex, opacity: strength,
    // Плавное нарастание по мере ухода контента, без щелчка.
    transition: 'opacity 160ms linear',
  }
  return (
    <div aria-hidden="true" data-soft-edge={edge} style={frame}>
      {LAYERS.map((blur, i) => {
        // Слой i виден от start% (считая от внутренней границы полосы к краю)
        // и полностью — ближе к краю. Чем сильнее размытие, тем ближе к краю
        // начинается слой: так радиус растёт плавно, без ступенек.
        const start = (i / n) * 100
        const full = Math.min(100, ((i + 1) / n) * 100)
        const mask = `linear-gradient(${toward}, transparent ${start}%, #000 ${full}%)`
        return (
          <div key={blur} style={{
            position: 'absolute', inset: 0,
            backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: mask, WebkitMaskImage: mask,
          }} />
        )
      })}
    </div>
  )
}

/**
 * Мягкий край для экранов, которые прокручивают САМ документ (window), а не
 * MobileScreen: список ДЗ, страницы ПК-раскладки на айпаде. Ставится один раз
 * (App) и показывается только на iPhone/iPad. Сверху — полоса строки
 * состояния, снизу — над системными вкладками; каждая видна, только пока за
 * её краем есть содержимое.
 */
export function WindowSoftEdges() {
  const [fade, setFade] = useState({ top: 0, bottom: 0 })
  // Нижняя полоса — над вкладками телефонной раскладки; в ПК-раскладке айпада
  // снизу нет панели, и край у последней строки не нужен.
  const desktop = useIsDesktop()
  useEffect(() => {
    const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 20) / 20
    const measure = () => {
      const el = document.scrollingElement ?? document.documentElement
      const top = q(el.scrollTop / 30)
      const bottom = q((el.scrollHeight - el.clientHeight - el.scrollTop) / 30)
      setFade(f => (f.top === top && f.bottom === bottom) ? f : { top, bottom })
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => { window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); ro.disconnect() }
  }, [])
  return createPortal(
    <div className="window-soft-edges" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 45 }}>
      <SoftEdge edge="top" size="calc(env(safe-area-inset-top, 0px) + var(--glass-top-pad, 20px))" strength={fade.top} zIndex={0} />
      {!desktop && <SoftEdge edge="bottom" size="calc(env(safe-area-inset-bottom, 0px) + 76px + var(--glass-bottom-pad, 0px))" strength={fade.bottom} zIndex={0} />}
    </div>,
    document.body,
  )
}

/**
 * Мягкий край под липким блоком внутри прокручиваемого листа (макет в «Цвете
 * курса», «Ленте и жестах»). Полоса высотой `height` стоит в потоке, размытие
 * свисает ниже на `size`. В покое (лист не прокручен) края нет: под макетом
 * ещё ничего не уехало, а размытие у самой границы захватывало бы соседнюю
 * подпись и рисовало её смазанный «призрак». Нарастает с прокруткой.
 */
export function ScrollSoftStrip({ height = 14, size = '28px' }: { height?: number; size?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [strength, setStrength] = useState(0)
  useEffect(() => {
    let box: HTMLElement | null = ref.current?.parentElement ?? null
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
    if (!box) return
    const scroller = box
    const measure = () => {
      const v = Math.round(Math.min(1, Math.max(0, scroller.scrollTop / 24)) * 20) / 20
      setStrength(s => (s === v ? s : v))
    }
    measure()
    scroller.addEventListener('scroll', measure, { passive: true })
    return () => scroller.removeEventListener('scroll', measure)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', height }}>
      <SoftEdge edge="top" size={size} strength={strength} zIndex={0} />
    </div>
  )
}
