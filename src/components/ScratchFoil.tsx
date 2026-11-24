// ─────────────────────────────────────────────────────────────────────────────
// «Стереть монеткой» (ИСК-4) — фольга поверх награды
//
// ГДЕ ЖИВЁТ. Не в заданиях: это механика НАГРАДЫ — подарок учителя, стикер за
// сданное ДЗ, промокод. Под фольгу кладут что угодно (children), компонент
// отвечает только за слой и момент «открыто».
//
// КАК УСТРОЕНО. Награда лежит в обычной вёрстке, поверх — canvas, залитый
// градиентом фольги. Палец/мышь рисуют по нему в режиме destination-out, то
// есть вырезают прозрачность. Раз в 200 мс (и при отпускании) считаем долю
// прозрачных пикселей; на 55 % слой растворяется за 0,35 с и снимается.
//
// Кнопка «Открыть» есть всегда: без неё награду не открыть с клавиатуры, ей
// пользуются те, кому неудобно тереть, а на iPad действие нельзя прятать за
// жест. touch-action:none стоит ТОЛЬКО на canvas: вне фольги страница
// листается как обычно.
//
// СОСТОЯНИЕ «открыто» хранит вызывающий (revealed / onReveal): у подарка это
// отметка «просмотрен» в базе, у промокода — выдача кода. После перезагрузки
// открытое приходит revealed=true, и фольга не рисуется вовсе.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import OpticalText from './OpticalText'
import { Eraser } from './icons/appIcons'
import { haptic } from '../lib/feedback'
import { useT } from '../lib/i18n'
import './scratchFoil.css'

/** Доля стёртого, при которой фольга сходит сама. */
const REVEAL_AT = 0.55
/** Толщина «монетки» в CSS-пикселях. */
const BRUSH = 34
const FADE_MS = 350

/** Искры, которые волна несёт с собой: угол, доля пути, цвет из палитры волны. */
const WAVE_COLORS = ['#FFC915', '#7EC4FF', '#B428E6', '#EB64A0', '#FFB07A', '#9AA0FF', '#7FD9EE']
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  a: Math.round((i * 360) / 14 + ((i * 37) % 17) - 8),
  d: (0.55 + ((i * 29) % 40) / 100).toFixed(2),
  c: WAVE_COLORS[i % WAVE_COLORS.length],
  delay: 150 + ((i * 53) % 120),
}))

export default function ScratchFoil({ revealed, onReveal, children, hint, minHeight = 120, radius = 16, background = 'var(--color-bg-3)' }: {
  revealed: boolean
  onReveal: () => void
  /** Что спрятано под фольгой. */
  children: ReactNode
  /** Подпись рядом с «Открыть»; пусто — без подписи. */
  hint?: string
  minHeight?: number
  radius?: number
  background?: string
}) {
  const t = useT()
  // Фольга видна, пока не открыто, и ещё FADE_MS после — пока растворяется.
  const [foilMounted, setFoilMounted] = useState(!revealed)
  const [fading, setFading] = useState(false)
  // Момент открытия: карточка подлетает и по ней дважды проходит перелив.
  const [celebrate, setCelebrate] = useState(false)

  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)
  const last = useRef<[number, number] | null>(null)
  const timer = useRef(0)
  const doneRef = useRef(revealed)
  // Надпись — через ref: функция t() меняется между рендерами, и эффект,
  // зависящий от неё, перезаливал бы фольгу посреди стирания.
  const label = useRef('')
  label.current = t('Сотри здесь')

  // Где дотёрли — оттуда пойдёт волна (как DistortionWave в Taskly от кнопки
  // «Утвердить»). Без касания — из центра.
  const lastCss = useRef<[number, number] | null>(null)

  const reveal = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    const zone = zoneRef.current
    if (zone) {
      const w = zone.clientWidth, h = zone.clientHeight
      const [ox, oy] = lastCss.current ?? [w / 2, h / 2]
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy))
      zone.style.setProperty('--sf-ox', `${ox.toFixed(1)}px`)
      zone.style.setProperty('--sf-oy', `${oy.toFixed(1)}px`)
      zone.style.setProperty('--sf-rmax', `${Math.round(far + 90)}px`)
    }
    haptic(12)
    setFading(true)
    setCelebrate(true)
    onReveal()
  }, [onReveal])

  // Открыто снаружи (перезагрузка, другая вкладка) — фольгу просто убираем.
  useEffect(() => {
    if (!revealed) return
    doneRef.current = true
    if (!foilMounted) return
    setFading(true)
    const id = window.setTimeout(() => setFoilMounted(false), FADE_MS)
    return () => window.clearTimeout(id)
  }, [revealed, foilMounted])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!celebrate) return
    const id = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(id)
  }, [celebrate])

  // Открытая награда наклоняется за указателем и переливается, как стикер.
  // Пишем CSS-переменные прямо в стиль — без ререндера на каждое движение.
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!revealed) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    el.style.setProperty('--sf-ry', `${((fx - 0.5) * 16).toFixed(2)}deg`)
    el.style.setProperty('--sf-rx', `${((0.5 - fy) * 12).toFixed(2)}deg`)
    el.style.setProperty('--sf-mx', `${(fx * 100).toFixed(1)}%`)
    el.style.setProperty('--sf-my', `${(fy * 100).toFixed(1)}%`)
    el.classList.add('is-tilting')
  }
  const untilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    for (const k of ['--sf-ry', '--sf-rx', '--sf-mx', '--sf-my']) el.style.removeProperty(k)
    el.classList.remove('is-tilting')
  }

  // Залить фольгу. recolor — смена темы: canvas не пересоздаём, а перекрашиваем
  // только непрозрачное (source-in / source-atop), и стёртое остаётся стёртым.
  // Смена размера пересоздаёт canvas, и там частично стёртое возвращается —
  // пересчитывать маску под новый размер ради редкого случая не стоит.
  const paint = useCallback((recolor = false) => {
    const cv = canvasRef.current
    const zone = zoneRef.current
    if (!cv || !zone) return
    const r = zone.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const d = window.devicePixelRatio || 1
    const keep = recolor && cv.width > 0 && !!ctxRef.current
    if (!keep) {
      cv.width = Math.round(r.width * d)
      cv.height = Math.round(r.height * d)
    }
    const x = cv.getContext('2d', { willReadFrequently: true })
    if (!x) return
    ctxRef.current = x
    const cs = getComputedStyle(zone)
    const c1 = cs.getPropertyValue('--scratch-foil-1').trim() || '#C9C6D6'
    const c2 = cs.getPropertyValue('--scratch-foil-2').trim() || '#ECEAF3'
    const ink = cs.getPropertyValue('--scratch-foil-ink').trim() || '#6F6B85'
    x.globalCompositeOperation = keep ? 'source-in' : 'source-over'
    const g = x.createLinearGradient(0, 0, cv.width, cv.height)
    g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c1)
    x.fillStyle = g
    x.fillRect(0, 0, cv.width, cv.height)
    if (keep) x.globalCompositeOperation = 'source-atop'
    // Зерно: без него заливка читается как кнопка, а не как слой, который трут.
    const grains = Math.floor((cv.width * cv.height) / 90)
    for (let i = 0; i < grains; i++) {
      x.fillStyle = `rgba(255,255,255,${(Math.random() * 0.25).toFixed(3)})`
      x.fillRect(Math.random() * cv.width, Math.random() * cv.height, d, d)
    }
    x.fillStyle = ink
    x.font = `600 ${14 * d}px Inter, system-ui, -apple-system, sans-serif`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(label.current, cv.width / 2, cv.height / 2)
  }, [])

  useLayoutEffect(() => {
    if (!foilMounted) return
    const zone = zoneRef.current
    if (!zone) return
    paint()
    let w = zone.offsetWidth, h = zone.offsetHeight
    const ro = new ResizeObserver(() => {
      if (zone.offsetWidth === w && zone.offsetHeight === h) return
      w = zone.offsetWidth; h = zone.offsetHeight
      if (!doneRef.current) paint()
    })
    ro.observe(zone)
    // Тема переключается атрибутом на <html> — фольга должна перекраситься.
    const mo = new MutationObserver(() => { if (!doneRef.current) paint(true) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => { ro.disconnect(); mo.disconnect() }
  }, [foilMounted, paint])

  const check = useCallback(() => {
    const cv = canvasRef.current, x = ctxRef.current
    if (!cv || !x || doneRef.current || cv.width === 0) return
    const a = x.getImageData(0, 0, cv.width, cv.height).data
    let clear = 0, n = 0
    // Каждый 16-й пиксель: точности хватает, а на ретине это в 16 раз дешевле.
    for (let i = 3; i < a.length; i += 64) { n++; if (a[i] < 40) clear++ }
    if (n > 0 && clear / n >= REVEAL_AT) reveal()
  }, [reveal])

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number, number] => {
    const cv = e.currentTarget
    const r = cv.getBoundingClientRect()
    const d = cv.width / r.width
    return [(e.clientX - r.left) * d, (e.clientY - r.top) * d, d]
  }

  // Ребро монетки, а не кисть: по пути ставим штампы неровной формы (каждая
  // вершина на своём радиусе) и сыплем мелкие сколы чуть за краем. Гладкая
  // круглая линия читалась как ластик в редакторе, а не как стёртая фольга.
  const stamp = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    const n = 9
    const turn = Math.random() * Math.PI * 2
    x.beginPath()
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2
      const rr = r * (0.62 + Math.random() * 0.38)
      if (i === 0) x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
      else x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    }
    x.closePath()
    x.fill()
    // Сколы: 3–5 крошек на кромке и чуть за ней.
    const chips = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < chips; i++) {
      const a = Math.random() * Math.PI * 2
      const dist = r * (0.85 + Math.random() * 0.45)
      const cr = r * (0.06 + Math.random() * 0.12)
      x.beginPath()
      x.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, cr, 0, Math.PI * 2)
      x.fill()
    }
  }

  const stroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const x = ctxRef.current
    if (!drawing.current || !x || doneRef.current) return
    const [px, py, d] = point(e)
    x.globalCompositeOperation = 'destination-out'
    x.fillStyle = '#000'
    const r = (BRUSH * d) / 2
    const from = last.current ?? [px, py]
    const dist = Math.hypot(px - from[0], py - from[1])
    // Шаг меньше радиуса — полоса без разрывов, но кромка остаётся рваной.
    const steps = Math.max(1, Math.ceil(dist / (r * 0.35)))
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      // Монетку слегка водит поперёк движения — край не идёт по линейке.
      const jitter = r * 0.18
      stamp(x, from[0] + (px - from[0]) * k + (Math.random() - 0.5) * jitter, from[1] + (py - from[1]) * k + (Math.random() - 0.5) * jitter, r)
    }
    last.current = [px, py]
    lastCss.current = [px / d, py / d]
    if (!timer.current) timer.current = window.setTimeout(() => { timer.current = 0; check() }, 200)
  }

  return (
    <div className="flex flex-col scratch-foil" style={{ gap: 10 }}>
      <div
        ref={zoneRef}
        role="group"
        // Лист (MobileSheet) не тянется за пальцем/мышью на фольге: стирание —
        // не жест закрытия.
        data-sheet-nodrag=""
        aria-label={revealed ? undefined : t('Спрятано под фольгой')}
        className={`scratch-foil__zone${revealed ? ' is-open' : ''}${celebrate ? ' is-celebrate' : ''}`}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        onPointerCancel={untilt}
        style={{
          position: 'relative', borderRadius: radius, overflow: 'hidden', minHeight,
          background, userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div aria-hidden={!revealed} className="scratch-foil__content">{children}</div>
        {revealed && <div aria-hidden className="scratch-foil__holo" />}
        {revealed && <div aria-hidden className="scratch-foil__glare" />}
        {celebrate && (
          <>
            <div aria-hidden className="scratch-foil__wave" />
            <div aria-hidden className="scratch-foil__wave-blur" />
            <div aria-hidden className="scratch-foil__edge" />
            {SPARKS.map((sp, i) => (
              <span key={i} aria-hidden className="scratch-foil__spark"
                style={{ '--sf-a': `${sp.a}deg`, '--sf-d': `${sp.d}`, '--sf-c': sp.c, animationDelay: `${sp.delay}ms` } as React.CSSProperties} />
            ))}
          </>
        )}
        {foilMounted && (
          <canvas
            ref={canvasRef}
            aria-hidden
            onPointerDown={e => {
              if (doneRef.current) return
              drawing.current = true
              last.current = null
              try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* не критично */ }
              stroke(e)
            }}
            onPointerMove={stroke}
            onPointerUp={() => { drawing.current = false; last.current = null; check() }}
            onPointerCancel={() => { drawing.current = false; last.current = null }}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block',
              touchAction: 'none', cursor: 'grab',
              opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease`,
              pointerEvents: fading ? 'none' : 'auto',
            }}
          />
        )}
      </div>

      {!revealed && (
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
            {hint ?? ''}
          </span>
          <button data-hover="layer"
            onClick={reveal}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              background: 'var(--color-bg-3)', color: 'var(--color-text)',
            }}
          >
            <Eraser size={14} />
            <OpticalText as="iskra-button-label">{t('Открыть')}</OpticalText>
          </button>
        </div>
      )}
    </div>
  )
}
