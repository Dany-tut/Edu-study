// ─────────────────────────────────────────────────────────────────────────────
// «Найди на экране» — экран ученика
//
// Ученик видит учебную реконструкцию окна (или картинку автора) и нажимает
// туда, куда нажал бы в программе. Концепт: Figma «Искра», стр. 24, раздел 4.
//
// ЖЕСТЫ — те же, что у ImageZoom (щипок, двойной тап, Ctrl/⌘ + колесо,
// перетаскивание увеличенной картинки), но картинка остаётся в задании, а не
// открывается слоем: нажатие и есть ответ. Ответом считается касание без
// сдвига (меньше 8 px) и короче 500 мс; перетаскивание и щипок — прокрутка и
// масштаб, попытку не тратят. Касание пальцем ждёт 280 мс второго — иначе
// двойной тап «увеличить» съедал бы попытку.
//
// ПК — БЕЗ ПОДСВЕТКИ ОБЛАСТЕЙ ПРИ НАВЕДЕНИИ: иначе ответ находится мышью.
//
// ХРОМ ПО ПЛАТФОРМЕ (docs/platforms.md): ПК — таблетка «− % + вписать» над
// картинкой; iPhone/iPad — стеклянная капсула у правого края картинки,
// мини-карта и мягкий край; Android — таблетки с заливкой, «На весь экран»,
// фейды у краёв увеличенной картинки.
//
// Реконструкция — «экран программы»: всегда светлая, как и плашка
// «Учебная реконструкция — не снимок экрана». Рамки ответа и подсказки — токены
// Искры и меняются с темой.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, LayoutList, Image as ImageIcon, Maximize, Minimize, XCircle, ZoomIn, ZoomOut, Lightbulb } from './icons/appIcons'
import { PLATFORM, type Platform } from '../lib/platform'
import { useBackClose } from '../lib/overlayStack'
import { useT } from '../lib/i18n'
import { Z } from '../lib/layers'
import {
  formatHotspotAnswer, hotspotHit, hotspotOutcome, minHitZone, parseHotspotAnswer,
  type HotspotArea, type HotspotHit, type HotspotSpec, type HotspotTap,
} from '../lib/screenHotspot'
import { hotspotScreen } from '../lib/screenHotspotScreen'
import './screenHotspot.css'

/** Предел увеличения: не меньше ×2 к «по ширине» и не меньше 200 % листа. */
const zMaxFor = (base: number) => Math.max(2, 2 / base)
/** Двойной тап: до 100 % листа на телефоне, ×2 на широком экране. */
const zTapFor = (base: number) => Math.max(1.6, Math.min(zMaxFor(base), 1 / base))
const TAP_SLOP = 8
const TAP_MS = 500
const DOUBLE_MS = 280
const MODE_KEY = 'iskra.hotspot.mode'

type View = { z: number; x: number; y: number }

function readMode(): 'image' | 'list' {
  try { return localStorage.getItem(MODE_KEY) === 'list' ? 'list' : 'image' } catch { return 'image' }
}
function saveMode(m: 'image' | 'list') {
  try { localStorage.setItem(MODE_KEY, m) } catch { /* приватный режим — без памяти */ }
}

const ordinalRu = (n: number) => ['первой', 'второй', 'третьей', 'четвёртой', 'пятой'][n] ?? `${n + 1}-й`
const attemptsRu = (n: number) => (n === 1 ? 'осталась 1 попытка' : n >= 2 && n <= 4 ? `осталось ${n} попытки` : `осталось ${n} попыток`)

/** Какой элемент картинки под точкой — для разбора «вы нажали на …». */
function elementAt(elements: HotspotArea[], t: HotspotTap): HotspotArea | undefined {
  return elements
    .filter(e => t.x >= e.x && t.x <= e.x + e.w && t.y >= e.y && t.y <= e.y + e.h)
    .sort((a, b) => a.w * a.h - b.w * b.h)[0]
}
const shortLabel = (s: string) => s.replace(/, (кнопка|поле|вкладка|ячейка)$/, '')

function tapCaption(hit: HotspotHit, el: HotspotArea | undefined): string {
  const name = hit.area?.label ?? (el ? shortLabel(el.label) : '')
  return name ? `«${name}»` : 'мимо элементов окна'
}

export interface ScreenHotspotSolverProps {
  spec: HotspotSpec
  value: string | undefined
  disabled?: boolean
  onChange: (v: string) => void
  /** Только для стендов: хром другой версии. */
  platform?: Platform
}

export default function ScreenHotspotSolver({ spec, value, disabled = false, onChange, platform = PLATFORM }: ScreenHotspotSolverProps) {
  const t = useT()
  const screen = useMemo(() => hotspotScreen(spec), [spec])
  const out = useMemo(() => hotspotOutcome(spec, value), [spec, value])
  const locked = disabled || out.done
  const [mode, setModeState] = useState<'image' | 'list'>(readMode)
  const setMode = (m: 'image' | 'list') => { setModeState(m); saveMode(m) }
  const [full, setFull] = useState(false)
  useBackClose(full, () => setFull(false))

  const commit = useCallback((tap: HotspotTap) => {
    if (locked) return
    const prev = parseHotspotAnswer(value).slice(0, out.taps.length)
    const hit = hotspotHit(spec, tap)
    onChange(formatHotspotAnswer([...prev, { ...tap, ...(hit.area ? { target: hit.area.id } : {}) }]))
  }, [locked, value, out.taps.length, spec, onChange])

  const lastHit = out.hits[out.hits.length - 1]
  const badge = spec.image.badge !== false && spec.image.kind !== 'upload' ? true : !!spec.image.badge

  const viewer = (
    <HotspotViewport
      key={full ? 'full' : 'inline'}
      spec={spec}
      src={screen.src}
      natural={screen.natural}
      alt={spec.image.alt}
      outcome={out}
      locked={locked}
      platform={platform}
      full={full}
      onTap={commit}
      onExitFull={() => setFull(false)}
    />
  )

  return (
    <div className="hs-root" data-platform={platform}>
      {badge && (
        <div className="hs-badge" role="note">
          <Info size={14} aria-hidden />
          <span>{t('Учебная реконструкция — не снимок экрана')}</span>
        </div>
      )}

      <div className="hs-bar">
        <div className="hs-seg" role="radiogroup" aria-label={t('Как отвечать')}>
          <button type="button" role="radio" aria-checked={mode === 'image'} className="hs-seg-btn" data-on={mode === 'image' || undefined} onClick={() => setMode('image')}>
            <ImageIcon size={15} aria-hidden /> {t('Картинкой')}
          </button>
          <button type="button" role="radio" aria-checked={mode === 'list'} className="hs-seg-btn" data-on={mode === 'list' || undefined} onClick={() => setMode('list')}>
            <LayoutList size={15} aria-hidden /> {t('Списком')}
          </button>
        </div>
        {!locked && (
          <span className="hs-left">{t('Попыток')}: {out.attemptsLeft}</span>
        )}
      </div>

      {mode === 'image' ? (
        <>
          {full ? createPortal(<div className="hs-full" style={{ zIndex: Z.popover }} data-platform={platform}>{viewer}</div>, document.body) : viewer}
          {platform === 'android' && !full && (
            <button type="button" className="hs-pill" onClick={() => setFull(true)}>
              <Maximize size={15} aria-hidden /> {t('На весь экран')}
            </button>
          )}
          {platform !== 'pc' && !locked && (
            <p className="hs-gesture">{t('Разведите пальцы, чтобы приблизить, двойной тап — 100\u00a0%. Касание без сдвига — это ответ.')}</p>
          )}
        </>
      ) : (
        <HotspotList elements={screen.elements} spec={spec} outcome={out} locked={locked} onPick={commit} />
      )}

      <div aria-live="polite">
        {out.done && out.correct && (
          <div className="hs-verdict" data-tone="ok">
            <CheckCircle2 size={18} aria-hidden />
            <div>
              <b>{t('Верно')} — {t(`с ${ordinalRu(out.rightAt)} попытки`)}</b>
              <p>{t('Вы нашли')} «{out.hits[out.rightAt].area?.label}».</p>
            </div>
          </div>
        )}
        {!out.done && lastHit && lastHit.kind !== 'target' && (
          <div className="hs-verdict" data-tone="bad">
            <XCircle size={18} aria-hidden />
            <div>
              <b>{t('Не здесь')} · {t(attemptsRu(out.attemptsLeft))}</b>
              <p>{lastHit.kind === 'trap' && lastHit.area.hint ? lastHit.area.hint : spec.hint || t('Посмотрите внимательнее и попробуйте ещё раз.')}</p>
            </div>
          </div>
        )}
        {out.done && !out.correct && (
          <div className="hs-verdict" data-tone="review">
            <Lightbulb size={18} aria-hidden />
            <div>
              <b>{t('Разбор · попытки закончились')}</b>
              <p>
                {t('Верный ответ')} — {spec.targets.map(a => `«${a.label}»`).join(` ${t('или')} `)}.{' '}
                {t('Ваши нажатия')}: {out.taps.map((tp, i) => {
                  const h = out.hits[i]
                  const hint = h.kind === 'trap' && h.area.hint ? `: ${h.area.hint.trim().replace(/[.!]$/, '')}` : ''
                  return `${i + 1} — ${tapCaption(h, elementAt(screen.elements, tp))}${hint}`
                }).join('; ')}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Картинка с жестами ──────────────────────────────────────────────────────

function HotspotViewport({ spec, src, natural, alt, outcome, locked, platform, full, onTap, onExitFull }: {
  spec: HotspotSpec
  src: string
  natural: { w: number; h: number }
  alt: string
  outcome: ReturnType<typeof hotspotOutcome>
  locked: boolean
  platform: Platform
  full: boolean
  onTap: (t: HotspotTap) => void
  onExitFull: () => void
}) {
  const t = useT()
  const touchUi = platform !== 'pc'
  const vpRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ W: 0, H: 0, base: 1 })
  const [view, setViewState] = useState<View>({ z: 1, x: 0, y: 0 })
  const [animated, setAnimated] = useState(false)
  const viewRef = useRef(view)
  const boxRef = useRef(box)
  boxRef.current = box

  const setView = useCallback((v: View, smooth = false) => {
    viewRef.current = v
    setAnimated(smooth)
    setViewState(v)
  }, [])

  const clamp = useCallback((v: View): View => {
    const { W, H, base } = boxRef.current
    const z = Math.min(zMaxFor(base) * 1.1, Math.max(1, v.z))
    const dw = natural.w * base * z, dh = natural.h * base * z
    const x = dw <= W ? (W - dw) / 2 : Math.min(0, Math.max(W - dw, v.x))
    const y = dh <= H ? (H - dh) / 2 : Math.min(0, Math.max(H - dh, v.y))
    return { z, x, y }
  }, [natural.w, natural.h])

  const zoomAt = useCallback((z: number, px: number, py: number, from = viewRef.current): View => {
    const k = z / from.z
    return { z, x: px - (px - from.x) * k, y: py - (py - from.y) * k }
  }, [])

  // Ширина решает масштаб «по ширине»; на ПК лист не тянем больше ×1,25.
  const measure = useCallback(() => {
    const el = vpRef.current
    if (!el) return
    const W = el.clientWidth
    const parentH = full ? el.clientHeight : 0
    const base = Math.min(1.25, W / natural.w, full && parentH ? parentH / natural.h : Infinity)
    const H = full ? parentH : Math.round(natural.h * base)
    boxRef.current = { W, H, base }
    setBox(boxRef.current)
    const cur = viewRef.current
    setView(cur.z <= 1.01 ? clamp({ z: 1, x: 0, y: 0 }) : clamp(cur))
  }, [natural.w, natural.h, full, clamp, setView])
  useLayoutEffect(() => { measure() }, [measure])
  useEffect(() => {
    const ro = new ResizeObserver(() => measure())
    if (vpRef.current) ro.observe(vpRef.current)
    return () => ro.disconnect()
  }, [measure])

  const stepZoom = useCallback((dir: 1 | -1) => {
    const { W, H, base } = boxRef.current
    const cur = viewRef.current
    const z = Math.min(zMaxFor(base), Math.max(1, cur.z * (dir > 0 ? 1.5 : 1 / 1.5)))
    setView(clamp(zoomAt(z, W / 2, H / 2)), true)
  }, [clamp, zoomAt, setView])
  const fit = useCallback(() => setView(clamp({ z: 1, x: 0, y: 0 }), true), [clamp, setView])

  // ── Ctrl/⌘ + колесо и щипок трекпада ────────────────────────────────────
  useEffect(() => {
    const el = vpRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return // обычное колесо листает страницу
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const cur = viewRef.current
      const z = Math.min(zMaxFor(boxRef.current.base), Math.max(1, cur.z * Math.exp(-e.deltaY * 0.01)))
      if (z !== cur.z) setView(clamp(zoomAt(z, e.clientX - r.left, e.clientY - r.top)))
    }
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', stop)
    el.addEventListener('gesturechange', stop)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', stop)
      el.removeEventListener('gesturechange', stop)
    }
  }, [clamp, zoomAt, setView])

  // ── Указатели ────────────────────────────────────────────────────────────
  const g = useRef({
    pts: new Map<number, { x: number; y: number }>(),
    mode: 'none' as 'none' | 'pan' | 'pinch',
    start: { x: 0, y: 0, t: 0 },
    from: { z: 1, x: 0, y: 0 } as View,
    d0: 1, m0: { x: 0, y: 0 },
    moved: false,
    multi: false,
    lastTap: { x: 0, y: 0, t: 0 },
    timer: 0 as number | undefined,
  })
  useEffect(() => () => window.clearTimeout(g.current.timer), [])

  const local = (e: { clientX: number; clientY: number }) => {
    const r = vpRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const answerAt = useCallback((p: { x: number; y: number }) => {
    const { base } = boxRef.current
    const v = viewRef.current
    const T = base * v.z
    const nx = (p.x - v.x) / T / natural.w, ny = (p.y - v.y) / T / natural.h
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return
    onTap({ x: nx, y: ny, zoom: T, min: minHitZone(platform) })
  }, [natural.w, natural.h, onTap, platform])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-hs-chrome]')) return
    const st = g.current
    const p = local(e)
    st.pts.set(e.pointerId, p)
    if (st.pts.size === 1) {
      st.mode = 'pan'
      st.start = { x: p.x, y: p.y, t: e.timeStamp }
      st.from = viewRef.current
      st.moved = false
      st.multi = false
      // Захват — только когда картинка увеличена: иначе вертикальный жест
      // должен листать страницу (touch-action: pan-y).
      if (viewRef.current.z > 1.01 || e.pointerType === 'mouse') vpRef.current?.setPointerCapture(e.pointerId)
    } else if (st.pts.size === 2) {
      const [a, b] = [...st.pts.values()]
      st.mode = 'pinch'
      st.moved = true
      st.multi = true
      st.from = viewRef.current
      st.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1
      st.m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      window.clearTimeout(st.timer)
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
      const z = Math.min(zMaxFor(boxRef.current.base) * 1.1, Math.max(0.85, st.from.z * (d / st.d0)))
      const k = z / st.from.z
      setView({ z, x: m.x - (st.m0.x - st.from.x) * k, y: m.y - (st.m0.y - st.from.y) * k })
      return
    }
    const dx = p.x - st.start.x, dy = p.y - st.start.y
    if (!st.moved && Math.hypot(dx, dy) < TAP_SLOP) return
    st.moved = true
    if (st.mode === 'pan' && st.from.z > 1.01) setView(clamp({ z: st.from.z, x: st.from.x + dx, y: st.from.y + dy }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const st = g.current
    if (!st.pts.has(e.pointerId)) return
    st.pts.delete(e.pointerId)
    if (st.mode === 'pinch') {
      if (st.pts.size === 1) {
        const [p] = [...st.pts.values()]
        st.mode = 'pan'; st.start = { ...p, t: e.timeStamp }; st.from = viewRef.current
        return
      }
      st.mode = 'none'
      const v = viewRef.current
      setView(v.z <= 1.01 ? clamp({ z: 1, x: 0, y: 0 }) : clamp(v), true)
      return
    }
    if (st.pts.size > 0) return
    st.mode = 'none'
    if (st.moved || st.multi || e.type === 'pointercancel') return
    if (e.timeStamp - st.start.t > TAP_MS) return
    const p = local(e)
    if (e.pointerType === 'mouse') { if (!locked) answerAt(p); return }
    // Палец: ждём, не будет ли второго касания — двойной тап меняет масштаб.
    const lt = st.lastTap
    if (e.timeStamp - lt.t < DOUBLE_MS && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
      window.clearTimeout(st.timer)
      st.lastTap = { x: 0, y: 0, t: 0 }
      const cur = viewRef.current
      const { base } = boxRef.current
      setView(cur.z > 1.01 ? clamp({ z: 1, x: 0, y: 0 }) : clamp(zoomAt(zTapFor(base), p.x, p.y)), true)
      return
    }
    st.lastTap = { x: p.x, y: p.y, t: e.timeStamp }
    window.clearTimeout(st.timer)
    if (!locked) st.timer = window.setTimeout(() => answerAt(p), DOUBLE_MS)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); stepZoom(1) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); stepZoom(-1) }
    else if (e.key === '0') { e.preventDefault(); fit() }
  }

  const { W, H, base } = box
  const T = base * view.z
  const zMax = zMaxFor(base)
  const K = base * zMax // размер раскладки: SVG растрируется крупно и не мылится
  const zoomed = view.z > 1.01
  const pct = Math.round(T * 100)
  const rectOf = (a: { x: number; y: number; w: number; h: number }) => ({
    left: view.x + a.x * natural.w * T, top: view.y + a.y * natural.h * T,
    width: a.w * natural.w * T, height: a.h * natural.h * T,
  })
  const dw = natural.w * T, dh = natural.h * T
  const fades = {
    l: view.x < -1, r: view.x + dw > W + 1, t: view.y < -1, b: view.y + dh > H + 1,
  }

  return (
    <div className="hs-vp-wrap" data-full={full || undefined}>
      <div
        ref={vpRef}
        className="hs-vp"
        data-zoomed={zoomed || undefined}
        data-locked={locked || undefined}
        tabIndex={0}
        role="img"
        aria-label={`${alt}. ${t('Масштаб')} ${pct} %. ${t('Клавиши + и − меняют масштаб, 0 — по ширине; для выбора с клавиатуры включите «Списком».')}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ height: full ? undefined : H || undefined, cursor: zoomed ? 'grab' : locked ? 'default' : 'pointer' }}
      >
        <div
          className="hs-canvas"
          style={{
            width: natural.w * K, height: natural.h * K,
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${T / K})`,
            transition: animated ? 'transform .26s cubic-bezier(.32,.72,0,1)' : 'none',
            visibility: W ? 'visible' : 'hidden',
          }}
          onTransitionEnd={() => setAnimated(false)}
        >
          <img src={src} alt="" draggable={false} />
        </div>

        {/* Разбор: верные области подсвечиваются только после последнего нажатия. */}
        {outcome.done && spec.targets.map(a => (
          <div key={a.id} className="hs-area" data-tone="ok" style={rectOf(a)}>
            <span className="hs-area-label"><CheckCircle2 size={12} aria-hidden /> {a.label}</span>
          </div>
        ))}
        {outcome.taps.map((tp, i) => {
          const ok = outcome.hits[i]?.kind === 'target'
          return (
            <span
              key={i}
              className="hs-tap"
              data-tone={ok ? 'ok' : 'bad'}
              // Номер — с той стороны, где есть место: у края картинки он обрезался.
              data-flip-x={view.x + tp.x * natural.w * T > W - 30 || undefined}
              data-flip-y={view.y + tp.y * natural.h * T < 16 || undefined}
              style={{ left: view.x + tp.x * natural.w * T, top: view.y + tp.y * natural.h * T }}
              aria-hidden
            ><b>{i + 1}</b></span>
          )
        })}

        {/* Края увеличенной картинки: фейды (ПК, Android) / мягкий край (iOS). */}
        {(['l', 'r', 't', 'b'] as const).map(k => fades[k] && <span key={k} className={`hs-fade hs-fade-${k}`} aria-hidden />)}

        {touchUi && zoomed && (
          <div className="hs-minimap" aria-hidden style={{ width: 88, height: 88 * natural.h / natural.w }}>
            <img src={src} alt="" draggable={false} />
            <span
              className="hs-minimap-frame"
              style={{
                left: `${Math.max(0, -view.x / dw) * 100}%`,
                top: `${Math.max(0, -view.y / dh) * 100}%`,
                width: `${Math.min(1, W / dw) * 100}%`,
                height: `${Math.min(1, H / dh) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Масштаб — под картинкой, а не поверх: капсула поверх окна закрывала
          бы его кнопки, а нажатие по ней — ещё и попытку. ПК — таблетка,
          iPhone/iPad — стеклянная капсула, Android — таблетки с заливкой. */}
      <div className="hs-zoombar" role="toolbar" aria-label={t('Масштаб')}>
        <div className="hs-zoom">
          <button type="button" onClick={() => stepZoom(-1)} disabled={!zoomed} aria-label={t('Уменьшить')}><ZoomOut size={touchUi ? 18 : 16} /></button>
          <span className="hs-pct">{pct}&thinsp;%</span>
          <button type="button" onClick={() => stepZoom(1)} disabled={view.z >= zMax - 0.01} aria-label={t('Увеличить')}><ZoomIn size={touchUi ? 18 : 16} /></button>
          <span className="hs-sep" />
          <button type="button" onClick={fit} disabled={!zoomed} aria-label={t('По ширине')}><Minimize size={touchUi ? 18 : 16} /></button>
        </div>
        {full && (
          <button type="button" className="hs-pill" onClick={onExitFull}>{t('Свернуть')}</button>
        )}
        {platform === 'pc' && <span className="hs-pc-hint">{t('Ctrl + колесо — масштаб')}</span>}
      </div>
    </div>
  )
}

// ─── Режим «Списком» ─────────────────────────────────────────────────────────

function HotspotList({ elements, spec, outcome, locked, onPick }: {
  elements: HotspotArea[]
  spec: HotspotSpec
  outcome: ReturnType<typeof hotspotOutcome>
  locked: boolean
  onPick: (t: HotspotTap) => void
}) {
  const t = useT()
  // Что уже выбрано — по id, посчитанному заново (а не по подписи клиента).
  const picked = new Map<string, 'ok' | 'bad'>()
  outcome.taps.forEach((tp, i) => {
    const el = elementAt(elements, tp)
    const h = outcome.hits[i]
    const id = h.area?.id ?? el?.id
    if (id) picked.set(id, h.kind === 'target' ? 'ok' : 'bad')
  })
  const targetIds = new Set(spec.targets.map(a => a.id))
  return (
    <div className="hs-list" role="group" aria-label={t('Элементы окна')}>
      {elements.map(el => {
        const tone = picked.get(el.id) ?? (outcome.done && targetIds.has(el.id) ? 'ok' : undefined)
        return (
          <button
            key={el.id}
            type="button"
            className="hs-list-btn"
            data-tone={tone}
            disabled={locked}
            aria-label={`${t('Элемент окна')}: ${el.label}`}
            onClick={() => onPick({ x: el.x + el.w / 2, y: el.y + el.h / 2, zoom: 1, min: 0 })}
          >
            {tone === 'ok' && <CheckCircle2 size={14} aria-hidden />}
            {tone === 'bad' && <XCircle size={14} aria-hidden />}
            {shortLabel(el.label)}
          </button>
        )
      })}
    </div>
  )
}

// ─── Показ у преподавателя ───────────────────────────────────────────────────

/** Та же картинка с верными областями и пронумерованными нажатиями ученика. */
export function HotspotReview({ spec, answer }: { spec: HotspotSpec; answer: string | undefined }) {
  const t = useT()
  const screen = useMemo(() => hotspotScreen(spec), [spec])
  const out = useMemo(() => hotspotOutcome(spec, answer), [spec, answer])
  const pc = (v: number) => `${v * 100}%`
  return (
    <figure className="hs-review">
      <div className="hs-review-img" style={{ aspectRatio: `${screen.natural.w} / ${screen.natural.h}` }}>
        <img src={screen.src} alt={spec.image.alt} draggable={false} />
        {spec.targets.map(a => (
          <span key={a.id} className="hs-area" data-tone="ok" style={{ left: pc(a.x), top: pc(a.y), width: pc(a.w), height: pc(a.h) }} />
        ))}
        {(spec.traps ?? []).map(a => (
          <span key={a.id} className="hs-area" data-tone="trap" style={{ left: pc(a.x), top: pc(a.y), width: pc(a.w), height: pc(a.h) }} />
        ))}
        {out.taps.map((tp, i) => (
          <span key={i} className="hs-tap" data-tone={out.hits[i]?.kind === 'target' ? 'ok' : 'bad'} data-flip-x={tp.x > 0.94 || undefined} data-flip-y={tp.y < 0.05 || undefined} style={{ left: pc(tp.x), top: pc(tp.y) }}><b>{i + 1}</b></span>
        ))}
      </div>
      <figcaption>
        {out.taps.length === 0 ? t('Нажатий нет.') : out.taps.map((tp, i) => `${i + 1} — ${tapCaption(out.hits[i], elementAt(screen.elements, tp))}`).join('; ')}
      </figcaption>
    </figure>
  )
}
