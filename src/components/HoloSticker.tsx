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

// Проба WebGL съедает настоящий контекст, а их в браузере всего ~16. Каждый клик
// по коллекции ремонтирует стикер, так что без кэша пробники быстро выбирают
// лимит, и браузер гасит САМЫЙ СТАРЫЙ контекст — то есть тот, в котором сейчас
// рисуется открытый стикер. Проверяем один раз на вкладку.
let webglSupport: boolean | null = null
function webglOk() {
  if (webglSupport !== null) return webglSupport
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    // контекст пробника больше не нужен — отдаём его обратно драйверу сразу,
    // не дожидаясь сборщика мусора
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    webglSupport = !!gl
  } catch { webglSupport = false }
  return webglSupport
}

/** «Приклеивание»: сколько уголок висит отогнутым, прежде чем лечь, и сколько ложится */
const REVEAL_HOLD = 260
const REVEAL_MS = 1700
/**
 * В reveal-режиме статичный бейдж не показываем сразу: он плоский, и его
 * подмена на отогнутый WebGL читалась как «стикер приклеился → отклеился до
 * половины → приклеился снова». Пока грузится чанк, место просто пустое, а
 * бейдж всплывает только если WebGL за это время так и не ожил.
 */
const FALLBACK_DELAY = 900
/**
 * С какого места начинается приклеивание: линия сгиба идёт от дальнего угла (0)
 * к противоположному (1), так что 0.5 — ровно середина стикера. Больше — и
 * плёнка стартует почти полностью отогнутой, приклеивать уже нечего.
 */
const REVEAL_PEEL = 0.5
const REVEAL_CURL_START = 0.17
const REVEAL_CURL_END = 0.11

/**
 * Во сколько раз печать в WebGL мельче квадрата: камера fov 24° с z=3.2 показывает
 * 1.36 юнита, плоскость — settings.size (0.86) × 1.15. Статичный бейдж рисует арт
 * во весь квадрат, поэтому без этой поправки подмена рендера читается как рывок
 * «сначала большой → через секунду нормальный».
 */
const FALLBACK_SCALE = 0.73

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function HoloSticker({
  score, label, sublabel, size = 220, interactive = true, sweep = true, reveal = false, tweak, style,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendRef = useRef<HoloRenderer | null>(null)
  const [live, setLive] = useState(false)     // рендер запустился — можно прятать бейдж
  // Вне reveal бейдж нужен сразу (иначе список стикеров мигает пустотой),
  // в reveal — только как аварийная замена, если WebGL не запустился.
  const [fallbackReady, setFallbackReady] = useState(!reveal)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const settings = useRef<StickerSettings>(stickerSettings(score))
  settings.current = { ...stickerSettings(score), ...tweak }

  useEffect(() => {
    if (!reveal) { setFallbackReady(true); return }
    setFallbackReady(false)
    const t = setTimeout(() => setFallbackReady(true), FALLBACK_DELAY)
    return () => clearTimeout(t)
  }, [reveal, score, label, sublabel])

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

      // отсчёт «приклеивания» — от ПЕРВОГО кадра, а не от монтирования:
      // иначе загрузка чанка+битмапа съедает половину анимации.
      let peel0 = 0

      const draw = () => {
        frames++
        if (!visible) return
        if (!peel0) peel0 = performance.now()
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
        // «приклеивание»: сильно отогнутый уголок висит, потом мягко ложится (smoothstep);
        // вместе с ним разгибается и радиус скрутки — так плёнка «прилипает», а не падает.
        let peel = 0
        let curl = REVEAL_CURL_END
        if (reveal && !still) {
          const t = Math.min(1, Math.max(0, (performance.now() - peel0 - REVEAL_HOLD) / REVEAL_MS))
          const k = 1 - t * t * (3 - 2 * t)          // 1 → 0, плавно на обоих концах
          peel = REVEAL_PEEL * k
          curl = REVEAL_CURL_END + (REVEAL_CURL_START - REVEAL_CURL_END) * k
        }
        renderer.render({ settings: { ...s, peelAmount: peel, curl }, imgAspect: 1 })
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
      {/* бейдж не размонтируем резко, а гасим — подмена статики на WebGL не мигает */}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          pointerEvents: 'none', opacity: live || !fallbackReady ? 0 : 1, transition: 'opacity 200ms ease',
        }}
      >
        <StickerBadge score={score} label={label} sublabel={sublabel} size={Math.round(size * FALLBACK_SCALE)} />
      </div>
    </div>
  )
}
