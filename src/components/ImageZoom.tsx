// ─────────────────────────────────────────────────────────────────────────────
// Увеличение картинки конспекта — на весь экран, с масштабом
//
// ЗАЧЕМ. Схемы конспекта нарисованы листом 640 px. На телефоне 375 лист
// ужимается до ~300 px, подписи — до 5 px: прочитать нельзя, а системный зум
// страницы растягивает вместе со схемой весь кабинет. Поэтому картинка по
// нажатию открывается отдельным слоем, где её можно рассмотреть.
//
// ЖЕСТЫ (одни на всех версиях, разный только хром):
//   • щипок — масштаб вокруг середины пальцев;
//   • двойной тап / двойной клик — «вписать ↔ ×2.5» в точке нажатия;
//   • колесо и щипок трекпада — масштаб вокруг курсора;
//   • перетаскивание — сдвиг увеличенной картинки;
//   • при масштабе «вписать» на телефоне тянуть вниз — закрыть (свайп вниз).
//
// ХРОМ ПО ПЛАТФОРМЕ (docs/platforms.md, SHEET-01):
//   • ПК — × справа сверху, внизу таблетка «− 100 % + ⤢», Escape, клавиши + − 0;
//   • iPad — одна стеклянная капсула у правого края (+, −, вписать) и круг ×
//     под ней (§1.1); Escape с клавиатуры;
//   • iPhone — граббер сверху, без ×: свайп вниз и тап по затемнению;
//   • Android — то же, подпись в таблетке с заливкой (без iOS-стекла),
//     системная «Назад» закрывает (через overlayStack).
//
// ЧЁТКОСТЬ. Картинка лежит в раскладке в размере «вписать × MAX» и уменьшена
// трансформом. Браузер растрирует SVG по размеру раскладки, поэтому при
// увеличении буквы не мылятся — иначе Safari показывает растр 300 px,
// растянутый в пять раз.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Minimize } from './icons/appIcons'
import { PLATFORM, type Platform } from '../lib/platform'
import { useBackClose } from '../lib/overlayStack'
import { useNativeOverlay } from '../lib/nativeGlass'
import { useT } from '../lib/i18n'
import { Z } from '../lib/layers'
import Prose from './Prose'
import './imageZoom.css'

/** Предел увеличения относительно «вписать». На телефоне это ≈ ×2.7 к листу 640. */
const MAX = 5
/** Масштаб двойного тапа. */
const TAP_ZOOM = 2.5
/** Свайп вниз дальше этого (или быстрее VY) закрывает. */
const DISMISS_DY = 110
const DISMISS_VY = 0.7 // px/ms

const stopReact = (e: React.SyntheticEvent) => e.stopPropagation()

type View = { s: number; x: number; y: number }

export interface ImageZoomProps {
  src: string | null
  caption?: string
  onClose: () => void
  /** Только для стенда концептов: показать хром другой версии. */
  platform?: Platform
}

export default function ImageZoom({ src, caption, onClose, platform = PLATFORM }: ImageZoomProps) {
  const open = !!src
  useBackClose(open, onClose)
  useNativeOverlay(open)
  return createPortal(
    <AnimatePresence>
      {src && <Viewer key={src} src={src} caption={caption} onClose={onClose} platform={platform} />}
    </AnimatePresence>,
    document.body,
  )
}

function Viewer({ src, caption, onClose, platform }: { src: string; caption?: string; onClose: () => void; platform: Platform }) {
  const t = useT()
  const phone = platform === 'iphone' || platform === 'android'
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  // Размер «вписать» и размер сцены. Пока картинка не загрузилась — 0.
  const [fit, setFit] = useState({ w: 0, h: 0, W: 0, H: 0 })
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [view, setViewState] = useState<View>({ s: 1, x: 0, y: 0 })
  const [animated, setAnimated] = useState(false)
  const dragY = useMotionValue(0)
  const scrimOpacity = useTransform(dragY, [0, 400], [1, 0.2])
  const chromeOpacity = useTransform(dragY, [0, 200], [1, 0])
  const sheetScale = useTransform(dragY, [0, 400], [1, 0.88])
  const viewRef = useRef(view)
  const fitRef = useRef(fit)
  fitRef.current = fit

  const setView = useCallback((v: View, smooth = false) => {
    viewRef.current = v
    setAnimated(smooth)
    setViewState(v)
  }, [])

  // ── Геометрия ────────────────────────────────────────────────────────────
  // Справа на айпаде — капсула: «вписанный» лист стоит левее неё. Увеличенный
  // уходит и под капсулу — стекло поверх содержимого, как везде в iOS.
  const railW = platform === 'ipad' ? 96 : 0
  // Поля сверху и снизу несимметричны (граббер, подпись, панель) — вписанный
  // лист сдвинут по вертикали на половину разницы.
  const shiftRef = useRef(0)

  const clamp = useCallback((v: View): View => {
    const { w, h, W, H } = fitRef.current
    const s = Math.min(MAX, Math.max(1, v.s))
    const dw = w * s, dh = h * s
    const x = dw <= W - railW ? (W - railW - dw) / 2 : dw <= W ? (W - dw) / 2 : Math.min(0, Math.max(W - dw, v.x))
    const y = dh <= H ? (H - dh) / 2 + shiftRef.current : Math.min(0, Math.max(H - dh, v.y))
    return { s, x, y }
  }, [railW])

  /** Масштаб s вокруг точки (px, py) сцены. */
  const zoomAt = useCallback((s: number, px: number, py: number, from = viewRef.current): View => {
    const k = s / from.s
    return { s, x: px - (px - from.x) * k, y: py - (py - from.y) * k }
  }, [])

  const fitView = useCallback(() => clamp({ s: 1, x: 0, y: 0 }), [clamp])

  const measure = useCallback(() => {
    const st = stageRef.current
    if (!st || !nat) return
    const W = st.clientWidth, H = st.clientHeight
    // Поля: на телефоне узкие (лист и так мелкий), на ПК — воздух вокруг листа.
    const pad = phone ? 12 : platform === 'ipad' ? 28 : 48
    // Сверху — граббер или ×, снизу — подпись и панель масштаба.
    const top = phone ? 56 : platform === 'ipad' ? 40 : 72
    const bottom = platform === 'pc' ? (caption ? 104 : 88) : (caption ? 132 : 72)
    const availW = Math.max(40, W - pad * 2 - railW)
    const availH = Math.max(40, H - top - bottom)
    // Мелкую растровую картинку не растягиваем на «вписать» больше ×2 —
    // она расплывётся. SVG-лист тянется до размера экрана без потерь.
    const svg = src.startsWith('data:image/svg') || /\.svg(\?|$)/i.test(src)
    const s0 = Math.min(availW / nat.w, availH / nat.h, svg ? Infinity : 2)
    fitRef.current = { w: nat.w * s0, h: nat.h * s0, W, H }
    setFit(fitRef.current)
    shiftRef.current = (top - bottom) / 2
    const cur = viewRef.current
    setView(cur.s <= 1.01 ? clamp({ s: 1, x: 0, y: 0 }) : clamp(cur))
  }, [nat, phone, platform, src, caption, railW, clamp, setView])

  useLayoutEffect(() => {
    // Картинка из кэша могла загрузиться до подписки onLoad.
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth && !nat) setNat({ w: el.naturalWidth, h: el.naturalHeight })
  }, [nat])
  useLayoutEffect(() => { measure() }, [measure])
  useEffect(() => {
    const ro = new ResizeObserver(() => measure())
    if (stageRef.current) ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [measure])

  const stepZoom = useCallback((dir: 1 | -1) => {
    const { W, H } = fitRef.current
    const cur = viewRef.current
    const s = Math.min(MAX, Math.max(1, cur.s * (dir > 0 ? 1.6 : 1 / 1.6)))
    if (s === 1) { setView(fitView(), true); return }
    setView(clamp(zoomAt(s, W / 2, H / 2)), true)
  }, [clamp, zoomAt, fitView, setView])

  // ── Клавиатура: Escape, + − 0 ────────────────────────────────────────────
  // Слушаем на window в фазе захвата и гасим событие: иначе тот же Escape
  // закрыл бы и шторку конспекта под нами (TheorySheet слушает window).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); stepZoom(1) }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); stepZoom(-1) }
      else if (e.key === '0') { e.preventDefault(); e.stopPropagation(); setView(fitView(), true) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, stepZoom, fitView, setView])

  // ── Колесо и щипок трекпада (ctrl+wheel) ────────────────────────────────
  useEffect(() => {
    const st = stageRef.current
    if (!st) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = st.getBoundingClientRect()
      const px = e.clientX - r.left, py = e.clientY - r.top
      const cur = viewRef.current
      // Щипок трекпада приходит колесом с ctrlKey и мелкими шагами.
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))
      const s = Math.min(MAX, Math.max(1, cur.s * k))
      if (s === cur.s) return
      setView(s === 1 ? fitView() : clamp(zoomAt(s, px, py)))
    }
    st.addEventListener('wheel', onWheel, { passive: false })
    // Safari: свои жесты масштаба страницы — гасим, щипок обрабатываем сами.
    const stop = (e: Event) => e.preventDefault()
    st.addEventListener('gesturestart', stop)
    st.addEventListener('gesturechange', stop)
    return () => {
      st.removeEventListener('wheel', onWheel)
      st.removeEventListener('gesturestart', stop)
      st.removeEventListener('gesturechange', stop)
    }
  }, [clamp, zoomAt, fitView, setView])

  // Нативные touch-события не должны доходить до document: шторка конспекта
  // (TheorySheet) слушает там свайп вниз и закрылась бы вместе с картинкой.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const stop = (e: TouchEvent) => { e.stopPropagation(); if (e.type === 'touchmove') e.preventDefault() }
    el.addEventListener('touchstart', stop, { passive: false })
    el.addEventListener('touchmove', stop, { passive: false })
    el.addEventListener('touchend', stop)
    el.addEventListener('touchcancel', stop)
    return () => {
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove', stop)
      el.removeEventListener('touchend', stop)
      el.removeEventListener('touchcancel', stop)
    }
  }, [])

  // ── Указатели: щипок, сдвиг, свайп вниз, тапы ───────────────────────────
  const g = useRef({
    pts: new Map<number, { x: number; y: number }>(),
    mode: 'none' as 'none' | 'pan' | 'pinch' | 'dismiss',
    start: { x: 0, y: 0, t: 0 },
    from: { s: 1, x: 0, y: 0 } as View,
    d0: 1, m0: { x: 0, y: 0 },
    moved: false,
    onImage: false,
    lastTap: { x: 0, y: 0, t: 0 },
    lastY: 0, lastT: 0, vy: 0,
    tapTimer: 0 as number | undefined,
  })

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-zoom-chrome]')) return
    const st = g.current
    stageRef.current?.setPointerCapture(e.pointerId)
    const p = local(e)
    st.pts.set(e.pointerId, p)
    if (st.pts.size === 1) {
      st.mode = 'pan'
      st.start = { x: p.x, y: p.y, t: e.timeStamp }
      st.from = viewRef.current
      st.moved = false
      st.onImage = e.target === imgRef.current
      st.lastY = p.y; st.lastT = e.timeStamp; st.vy = 0
    } else if (st.pts.size === 2) {
      const [a, b] = [...st.pts.values()]
      st.mode = 'pinch'
      st.moved = true
      st.from = viewRef.current
      st.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1
      st.m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      dragY.set(0)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const st = g.current
    if (!st.pts.has(e.pointerId)) return
    const p = local(e)
    st.pts.set(e.pointerId, p)
    if (st.mode === 'pinch' && st.pts.size >= 2) {
      const [a, b] = [...st.pts.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      // Чуть меньше «вписать» можно — пружиной вернётся на отпускании.
      const s = Math.min(MAX * 1.15, Math.max(0.8, st.from.s * (d / st.d0)))
      const k = s / st.from.s
      setView({ s, x: m.x - (st.m0.x - st.from.x) * k, y: m.y - (st.m0.y - st.from.y) * k })
      return
    }
    const dx = p.x - st.start.x, dy = p.y - st.start.y
    if (!st.moved && Math.hypot(dx, dy) < 6) return
    if (!st.moved) {
      st.moved = true
      // При «вписать» вертикальный рывок вниз на телефоне — закрытие.
      if (phone && st.from.s <= 1.01 && dy > 0 && Math.abs(dy) > Math.abs(dx)) st.mode = 'dismiss'
    }
    if (e.timeStamp > st.lastT) st.vy = (p.y - st.lastY) / (e.timeStamp - st.lastT)
    st.lastY = p.y; st.lastT = e.timeStamp
    if (st.mode === 'dismiss') { dragY.set(Math.max(0, dy)); return }
    if (st.mode === 'pan' && st.from.s > 1.01) {
      setView(clamp({ s: st.from.s, x: st.from.x + dx, y: st.from.y + dy }))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const st = g.current
    if (!st.pts.has(e.pointerId)) return
    st.pts.delete(e.pointerId)
    if (st.mode === 'pinch') {
      if (st.pts.size === 1) {
        // Один палец остался — продолжаем сдвигом от текущего вида.
        const [p] = [...st.pts.values()]
        st.mode = 'pan'; st.start = { ...p, t: e.timeStamp }; st.from = viewRef.current
        return
      }
      st.mode = 'none'
      const v = viewRef.current
      setView(v.s <= 1.01 ? fitView() : clamp(v), true)
      return
    }
    if (st.pts.size > 0) return
    const mode = st.mode
    st.mode = 'none'
    if (mode === 'dismiss') {
      if (dragY.get() > DISMISS_DY || st.vy > DISMISS_VY) { onClose(); return }
      animate(dragY, 0, { type: 'spring', stiffness: 500, damping: 42 })
      return
    }
    if (st.moved || e.type === 'pointercancel') return
    // Тап. Двойной — переключить масштаб; одиночный по затемнению — закрыть.
    const p = local(e)
    const lt = st.lastTap
    if (e.timeStamp - lt.t < 300 && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
      window.clearTimeout(st.tapTimer)
      st.lastTap = { x: 0, y: 0, t: 0 }
      const cur = viewRef.current
      setView(cur.s > 1.01 ? fitView() : clamp(zoomAt(TAP_ZOOM, p.x, p.y)), true)
      return
    }
    st.lastTap = { x: p.x, y: p.y, t: e.timeStamp }
    if (!st.onImage) {
      // Ждём, не будет ли второго тапа: двойной тап по полю рядом с листом
      // тоже увеличивает, а не закрывает.
      st.tapTimer = window.setTimeout(onClose, 260)
    }
  }

  useEffect(() => () => window.clearTimeout(g.current.tapTimer), [])

  const { w, h } = fit
  const pct = Math.round(view.s * 100)

  return (
    <motion.div
      ref={rootRef}
      className="iz-root"
      data-platform={platform}
      role="dialog"
      aria-modal="true"
      aria-label={caption ? t('Схема: ') + caption : t('Схема')}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ zIndex: Z.popover }}
      // Слой — портал, но события React всплывают по дереву компонентов: без
      // этого клик по картинке дошёл бы до обработчиков страницы или шторки.
      onClick={stopReact}
      onPointerDown={stopReact}
      onPointerUp={stopReact}
    >
      <motion.div ref={scrimRef} className="iz-scrim" style={{ opacity: scrimOpacity }} />
      <div
        ref={stageRef}
        className="iz-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: view.s > 1.01 ? 'grab' : 'default' }}
      >
        <motion.div
          className="iz-sheet-wrap"
          initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          // Свайп вниз двигает весь слой картинки, а не её трансформ:
          // так он не спорит с масштабом и пружинит обратно отдельно.
          style={{ y: dragY, scale: sheetScale }}
        >
          <img
            ref={imgRef}
            src={src}
            alt={caption ?? ''}
            draggable={false}
            className="iz-img"
            onLoad={e => {
              const el = e.currentTarget
              setNat({ w: el.naturalWidth || 640, h: el.naturalHeight || 400 })
            }}
            style={{
              width: w * MAX || undefined,
              height: h * MAX || undefined,
              visibility: w ? 'visible' : 'hidden',
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s / MAX})`,
              transition: animated ? 'transform .26s cubic-bezier(.32,.72,0,1)' : 'none',
              // Радиус и тень заданы в размере раскладки (× MAX) — на «вписать»
              // это 12 px и мягкая тень листа.
              borderRadius: 12 * MAX,
              boxShadow: `0 ${3 * MAX}px ${28 * MAX}px rgba(0,0,0,.14), 0 0 0 ${MAX}px var(--iz-sheet-ring)`,
            }}
            onTransitionEnd={() => setAnimated(false)}
          />
        </motion.div>
      </div>

      {/* ── Хром по платформе ─────────────────────────────────────────── */}
      {phone && <motion.div className="iz-grabber" aria-hidden style={{ opacity: chromeOpacity }} />}

      {platform === 'pc' && (
        <>
          <button type="button" data-zoom-chrome className="iz-close" onClick={onClose} aria-label={t('Закрыть')}>
            <X size={18} />
          </button>
          <div data-zoom-chrome className="iz-toolbar" role="toolbar" aria-label={t('Масштаб')}>
            <button type="button" className="iz-tool" onClick={() => stepZoom(-1)} disabled={view.s <= 1.01} aria-label={t('Уменьшить')}><ZoomOut size={18} /></button>
            <span className="iz-pct">{pct}&thinsp;%</span>
            <button type="button" className="iz-tool" onClick={() => stepZoom(1)} disabled={view.s >= MAX - 0.01} aria-label={t('Увеличить')}><ZoomIn size={18} /></button>
            <span className="iz-sep" />
            <button type="button" className="iz-tool" onClick={() => setView(fitView(), true)} disabled={view.s <= 1.01} aria-label={t('Вписать в экран')}><Minimize size={18} /></button>
          </div>
        </>
      )}

      {platform === 'ipad' && (
        <div data-zoom-chrome className="iz-rail">
          <div className="iz-capsule" role="toolbar" aria-orientation="vertical" aria-label={t('Масштаб')}>
            <button type="button" className="iz-cell" onClick={() => stepZoom(1)} disabled={view.s >= MAX - 0.01} aria-label={t('Увеличить')}><ZoomIn size={22} /></button>
            <span className="iz-cell-pct">{pct}&thinsp;%</span>
            <button type="button" className="iz-cell" onClick={() => stepZoom(-1)} disabled={view.s <= 1.01} aria-label={t('Уменьшить')}><ZoomOut size={22} /></button>
            <span className="iz-divider" />
            <button type="button" className="iz-cell" onClick={() => setView(fitView(), true)} disabled={view.s <= 1.01} aria-label={t('Вписать в экран')}><Minimize size={22} /></button>
          </div>
          <button type="button" className="iz-primary" onClick={onClose} aria-label={t('Закрыть')}><X size={22} /></button>
        </div>
      )}

      {/* На тач-версиях «вписать» почти не крупнее листа в уроке — подсказка
          жеста видна, пока схему не увеличили. На ПК её заменяет панель. */}
      {(caption || (platform !== 'pc' && view.s <= 1.01)) && (
        <motion.div data-zoom-chrome className="iz-caption" style={{ opacity: chromeOpacity }}>
          {caption && <Prose text={caption} />}
          {platform !== 'pc' && view.s <= 1.01 && (
            <div className="iz-hint">{t('Разведите пальцы или коснитесь дважды')}</div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
