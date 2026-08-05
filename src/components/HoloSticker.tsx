// Голографический стикер-оценка (WebGL, портированный рендер holosticker).
//
// Тяжёлый three.js грузим ленивым import() — в основной бандл он не попадает.
// Пока грузится (или если WebGL/anim недоступны) показываем статичный
// StickerBadge, так что компонент всегда что-то рисует.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { stickerSettings, stickerBitmap, tierOf } from '../lib/holo/presets'
import type { StickerSettings } from '../lib/holo/settings'
import type { HoloRenderer } from '../lib/holo/three-renderer'
import StickerBadge from './StickerBadge'

interface Props {
  score: number
  label?: string
  sublabel?: string
  /** Сторона квадрата в px */
  size?: number
  /** Наклон за курсором/пальцем (иначе только автопокачивание) */
  interactive?: boolean
  /** Медленное автопокачивание, когда курсора нет */
  sweep?: boolean
  /** Анимация «приклеивания»: уголок отгибается и ложится (0.55 → 0) */
  reveal?: boolean
  /** Точечная правка пресета фольги (для витрин/подбора) */
  tweak?: Partial<StickerSettings>
  style?: CSSProperties
}

function webglOk() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function HoloSticker({
  score, label, sublabel, size = 220, interactive = true, sweep = true, reveal = false, tweak, style,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendRef = useRef<HoloRenderer | null>(null)
  const [live, setLive] = useState(false)     // рендер запустился — можно прятать бейдж
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const settings = useRef<StickerSettings>(stickerSettings(score))
  settings.current = { ...stickerSettings(score), ...tweak }

  useEffect(() => {
    let dead = false
    let raf = 0
    let timer: ReturnType<typeof setInterval> | undefined
    let guard: ReturnType<typeof setTimeout> | undefined
    let frames = 0
    let visible = true
    let io: IntersectionObserver | undefined
    const t0 = performance.now()
    const still = reducedMotion()

    if (!webglOk()) return

    ;(async () => {
      const [{ HoloRenderer: R }, bitmap] = await Promise.all([
        import('../lib/holo/three-renderer'),
        stickerBitmap({ score, label, sublabel }),
      ])
      const canvas = canvasRef.current
      if (dead || !canvas) return
      const renderer = new R(canvas)
      rendRef.current = renderer
      renderer.setImage(bitmap)

      const draw = () => {
        frames++
        if (!visible) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const w = Math.round(canvas.clientWidth * dpr)
        const h = Math.round(canvas.clientHeight * dpr)
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w
          canvas.height = h
        }
        const el = performance.now() - t0
        const p = pointerRef.current
        if (p && interactive) {
          renderer.setTilt(p.x, p.y)
        } else if (sweep && !still) {
          renderer.setTilt(Math.sin(el / 1600) * 0.75, Math.cos(el / 2300) * 0.45)
        }
        const s = settings.current
        // «приклеивание»: отогнутый уголок ложится за 900 мс
        const peel = reveal && !still ? Math.max(0, 0.55 * (1 - el / 900)) : 0
        renderer.render({ settings: { ...s, peelAmount: peel, curl: 0.11 }, imgAspect: 1 })
        if (!live) setLive(true)
      }

      // rAF в некоторых окружениях (Claude Preview) не срабатывает —
      // если через 400 мс нет ни кадра, переключаемся на таймер.
      const loop = () => { draw(); if (!dead) raf = requestAnimationFrame(loop) }
      raf = requestAnimationFrame(loop)
      guard = setTimeout(() => { if (frames === 0 && !dead) timer = setInterval(draw, 33) }, 400)

      // не жжём GPU, пока стикер за экраном
      if (hostRef.current && 'IntersectionObserver' in window) {
        io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.05 })
        io.observe(hostRef.current)
      }
    })()

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      if (timer) clearInterval(timer)
      if (guard) clearTimeout(guard)
      io?.disconnect()
      rendRef.current?.dispose?.()
      rendRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, label, sublabel, reveal])

  const tier = tierOf(score)

  return (
    <div
      ref={hostRef}
      title={`${tier.name} · ${tier.score}/5`}
      style={{ position: 'relative', width: size, height: size, touchAction: 'none', ...style }}
      onPointerMove={e => {
        if (!interactive) return
        const r = e.currentTarget.getBoundingClientRect()
        pointerRef.current = {
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: 1 - ((e.clientY - r.top) / r.height) * 2,
        }
      }}
      onPointerLeave={() => { pointerRef.current = null }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!live && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <StickerBadge score={score} label={label} sublabel={sublabel} size={size} />
        </div>
      )}
    </div>
  )
}
