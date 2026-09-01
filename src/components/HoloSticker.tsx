// Голографический стикер-оценка (WebGL, портированный рендер holosticker).
//
// Тяжёлый three.js грузим ленивым import() — в основной бандл он не попадает.
// Пока грузится (или если WebGL/anim недоступны) показываем статичный
// StickerBadge, так что компонент всегда что-то рисует.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { stickerSettings, stickerBitmap, tierOf, type StickerEmblem } from '../lib/holo/presets'
import type { StickerSettings } from '../lib/holo/settings'
import type { HoloRenderer } from '../lib/holo/three-renderer'
import { retryImport } from '../lib/chunkError'
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
  /** Личность стикера — держит эмблему и высечку одинаковыми в витрине и здесь */
  stickerId?: string
  /** Готовая эмблема из assignEmblems(); без неё выводится из stickerId */
  emblem?: StickerEmblem
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
 *
 * ВАЖНО: пустое место допустимо только при ПЕРВОМ появлении стикера. При
 * переключении в коллекции там уже что-то было, и дырка на время загрузки
 * читается как мигающий пустой квадрат — при смене стикера бейдж показываем
 * сразу (см. firstRef ниже).
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
  score, label, sublabel, size = 220, interactive = true, sweep = true, reveal = false, tweak,
  stickerId, emblem, style,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendRef = useRef<HoloRenderer | null>(null)
  const [live, setLive] = useState(false)     // рендер запустился — можно прятать бейдж
  // Тот же флаг рефом: эффект пересоздания рендера больше не размонтирует
  // компонент, поэтому в замыкании draw() лежало бы устаревшее значение live.
  const liveRef = useRef(false)
  // Вне reveal бейдж нужен сразу (иначе список стикеров мигает пустотой),
  // в reveal — только как аварийная замена, если WebGL не запустился.
  const [fallbackReady, setFallbackReady] = useState(!reveal)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const settings = useRef<StickerSettings>(stickerSettings(score))
  settings.current = { ...stickerSettings(score), ...tweak }
  /** Личность стикера строкой — сменилась, значит показываем ДРУГОЙ стикер. */
  const spec = `${score}|${label}|${sublabel}|${stickerId}|${emblem}`
  // Пропсы, которые читает цикл отрисовки. Цикл живёт с монтирования до
  // размонтирования и в замыкании держал бы значения первого рендера.
  const propsRef = useRef({ interactive, sweep, reveal })
  propsRef.current = { interactive, sweep, reveal }
  /** Битмап следующего стикера — цикл подхватит его на ближайшем кадре. */
  const pendingRef = useRef<ImageBitmap | null>(null)

  useEffect(() => {
    if (!reveal) { setFallbackReady(true); return }
    setFallbackReady(false)
    const t = setTimeout(() => setFallbackReady(true), FALLBACK_DELAY)
    return () => clearTimeout(t)
  }, [reveal])

  // ── Рендер: ОДИН на всю жизнь компонента ───────────────────────────────────
  // Пересоздавать его на каждый стикер нельзя: dispose() делает
  // forceContextLoss, поэтому нужен был бы и новый <canvas>, а свежий элемент
  // канваса до первого композита успевает мигнуть белым прямоугольником — это и
  // был «белый квадрат» при переключении. Теперь канвас и контекст одни, а смена
  // стикера — это просто setImage() на живом рендере: старый кадр висит на
  // экране, пока не отрисуется новый.
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

    // Размер буфера задаём сразу, а не в первом кадре: <canvas> без width/height
    // остаётся 300×150 и растягивается в квадратную коробку.
    const canvas0 = canvasRef.current
    if (canvas0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas0.width = canvas0.height = Math.max(1, Math.round(size * dpr))
    }

    if (!webglOk()) return

    ;(async () => {
      // Чанк рендера может не доехать (сетевой блип), а свободный WebGL-контекст —
      // кончиться: на лендинге стикеров много, а контекстов у браузера ~16. Ни то,
      // ни другое не повод ронять необработанный промис — в логе это выглядело как
      // «Cannot read properties of undefined (reading 'HoloRenderer')» и
      // «Cannot read properties of null (reading 'precision')». Тихо остаёмся на
      // статичном бейдже: стикер выглядит плоским, но страница цела.
      const canvas = canvasRef.current
      if (dead || !canvas) return
      let renderer: HoloRenderer
      try {
        const mod = await retryImport(() => import('../lib/holo/three-renderer'))
        if (dead) return
        if (!mod?.HoloRenderer) { setFallbackReady(true); return }
        renderer = new mod.HoloRenderer(canvas)
      } catch { setFallbackReady(true); return }
      rendRef.current = renderer

      // отсчёт «приклеивания» — от ПЕРВОГО кадра со стикером, а не от
      // монтирования: иначе загрузка чанка+битмапа съедает половину анимации.
      let peel0 = 0

      const draw = () => {
        frames++
        if (!visible) return
        // приехал новый стикер — подменяем печать и заново запускаем приклеивание
        if (pendingRef.current) {
          renderer.setImage(pendingRef.current)
          pendingRef.current = null
          peel0 = 0
        }
        if (!renderer.hasImage()) return
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
        const { interactive: itv, sweep: swp, reveal: rvl } = propsRef.current
        if (p && itv) {
          renderer.setTilt(p.x, p.y)
        } else if (swp && !still) {
          renderer.setTilt(Math.sin(el / 1600) * 0.75, Math.cos(el / 2300) * 0.45)
        }
        const s = settings.current
        // «приклеивание»: сильно отогнутый уголок висит, потом мягко ложится (smoothstep);
        // вместе с ним разгибается и радиус скрутки — так плёнка «прилипает», а не падает.
        let peel = 0
        let curl = REVEAL_CURL_END
        if (rvl && !still) {
          const t = Math.min(1, Math.max(0, (performance.now() - peel0 - REVEAL_HOLD) / REVEAL_MS))
          const k = 1 - t * t * (3 - 2 * t)          // 1 → 0, плавно на обоих концах
          peel = REVEAL_PEEL * k
          curl = REVEAL_CURL_END + (REVEAL_CURL_START - REVEAL_CURL_END) * k
        }
        renderer.render({ settings: { ...s, peelAmount: peel, curl }, imgAspect: 1 })
        if (!liveRef.current) { liveRef.current = true; setLive(true) }
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
  }, [])

  // Печать стикера — отдельно от рендера: меняется чаще и на живом контексте.
  useEffect(() => {
    let stale = false
    stickerBitmap({ score, label, sublabel, stickerId, emblem }).then(bmp => {
      if (!stale) pendingRef.current = bmp
    })
    return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec])

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
      {/* Без key: элемент канваса живёт от монтирования до размонтирования.
          Свежий <canvas> под WebGL успевает мигнуть белым до первого композита. */}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {/* бейдж не размонтируем резко, а гасим — подмена статики на WebGL не мигает */}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          pointerEvents: 'none', opacity: live || !fallbackReady ? 0 : 1, transition: 'opacity 200ms ease',
        }}
      >
        <StickerBadge score={score} label={label} sublabel={sublabel} stickerId={stickerId} emblem={emblem} size={Math.round(size * FALLBACK_SCALE)} />
      </div>
    </div>
  )
}
