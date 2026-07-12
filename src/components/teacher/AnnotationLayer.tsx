import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { Pencil, Eraser, Undo2, Trash2, Highlighter } from 'lucide-react'
import { optimizeCanvas, ImageTooLargeError } from '../../lib/imageOptim'
import { useT } from '../../lib/i18n'

// Живой оверлей-разметка: прозрачный холст ПОВЕРХ настоящего ответа ученика.
// Учитель рисует прямо по «Дано»/«Решению» — красным/зелёным, что верно, а что нет.
//
// Выравнивание: чернила привязаны к контенту по его ширине. Сохраняем эталонную
// ширину `w` (и высоту `h`) — при показе контент рендерится на той же ширине, текст
// «перетекает» одинаково, поэтому разметка ложится на те же места.

export type Annotation = { image: string; w: number; h: number }

const PEN_COLORS = ['#E53E3E', '#38A169', '#3182CE', '#D69E2E', '#805AD5', '#0B0B0D']
const MARKER_ALPHA = 0.38   // прозрачность хайлайтера

export default function AnnotationLayer({
  children,
  active = false,
  value,
  onChange,
}: {
  children: React.ReactNode
  // true — режим рисования (показываем панель, ловим штрихи). false — только показ.
  active?: boolean
  // уже сохранённая разметка (для показа или продолжения редактирования).
  value?: Annotation | null
  // вызывается при каждом изменении штрихов (передаёт null после «Очистить»).
  onChange?: (a: Annotation | null) => void
}) {
  const t = useT()
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  const [tool, setTool] = useState<'pen' | 'eraser' | 'marker'>('pen')
  const [color, setColor] = useState(PEN_COLORS[0])
  // Размер у карандаша/ластика и у маркера — раздельный: у маркера свой базовый
  // калибр (в высоту строки), он не сбивается размером карандаша.
  const [penSize, setPenSize] = useState(3)
  const [markerSize, setMarkerSize] = useState(3)
  const [canUndo, setCanUndo] = useState(false)

  const drawing = useRef(false)
  const history = useRef<ImageData[]>([])
  // Текущий штрих: точки + снимок холста ДО штриха (для перерисовки прямой/морфа).
  const points = useRef<number[][]>([])
  const strokeBase = useRef<ImageData | null>(null)
  // Маркер: штрих рисуем сплошным на offscreen, на основной композлю ОДИН раз с
  // общим alpha — иначе перекрытия сегментов копят прозрачность.
  const strokeOff = useRef<HTMLCanvasElement | null>(null)
  // Авто-выравнивание: после 2-сек паузы линия плавно выпрямляется, дальше конец
  // ведётся за курсором как прямая (как Shift, но включается само).
  const autoRef = useRef(false)
  const autoAnchor = useRef<number[] | null>(null)
  const autoTarget = useRef<number[] | null>(null)
  const dwellTimer = useRef<number | null>(null)
  const animRef = useRef<{ cancel: boolean } | null>(null)
  // последняя версия чернил — чтобы восстановить при изменении размера контента.
  const lastImage = useRef<string | null>(value?.image ?? null)

  const activeSize = tool === 'marker' ? markerSize : penSize
  const setActiveSize = tool === 'marker' ? setMarkerSize : setPenSize

  // Если показываем сохранённую разметку — форсим ширину контента на эталонную,
  // чтобы текст перетёк точно так же, как при рисовании, и чернила совпали.
  const lockedW = !active && value ? value.w : undefined

  // Холст в DOM только когда рисуем или есть что показать.
  const showCanvas = active || !!value

  // ─── Измеряем контент ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => {
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      if (w > 0 && h > 0) setSize(prev => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
    }
    measure()
    // ResizeObserver, не rAF — rAF в превью не срабатывает.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children, lockedW])

  // ─── Подгоняем холст под контент + восстанавливаем чернила ────────────────────
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !size) return
    if (c.width !== size.w || c.height !== size.h) {
      c.width = size.w
      c.height = size.h
    }
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const src = lastImage.current
    if (src) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height)
      img.src = src
    }
    history.current = []
    setCanUndo(false)
    // Зависим и от showCanvas: холст монтируется только при включении разметки,
    // уже ПОСЛЕ того как size измерился — иначе бэкинг-стор остался бы 300×150.
  }, [size, showCanvas])

  // value пришёл/сменился извне (напр. переоткрыли работу) — принять как чернила.
  // Во время активного рисования холстом управляем сами — внешний value игнорим,
  // иначе наши же commit-обновления мигали бы перерисовкой.
  useEffect(() => {
    if (active) return
    lastImage.current = value?.image ?? null
    const c = canvasRef.current
    if (!c || !size) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    if (value?.image) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height)
      img.src = value.image
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.image])

  function xy(e: React.PointerEvent): [number, number] {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)]
  }

  function pushHistory() {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    history.current.push(ctx.getImageData(0, 0, c.width, c.height))
    if (history.current.length > 30) history.current.shift()
    setCanUndo(true)
  }

  function commit() {
    const c = canvasRef.current!
    let data: string
    try {
      data = optimizeCanvas(c)
    } catch (e) {
      // Разметка не влезла в потолок base64 даже после дожима — сообщаем и не
      // сохраняем этот штрих (прошлое значение остаётся).
      if (e instanceof ImageTooLargeError) { window.alert(e.message); return }
      throw e
    }
    lastImage.current = data
    onChange?.({ image: data, w: c.width, h: c.height })
  }

  // Толщина инструментов в пикселях холста.
  function markerWidth() { return Math.max(16, markerSize * 7) }
  function strokeLineWidth() {
    return tool === 'marker' ? markerWidth() : tool === 'eraser' ? penSize * 5 : penSize
  }

  function pathLen(pts: number[][]) {
    let s = 0
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    return s
  }

  // Прямая со снапом угла к 0/45/90° (в пределах ~9°) — горизонтальное выделение
  // строки «прилипает» к идеальной горизонтали.
  function snapStraight(a: number[], b: number[]): number[] {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)
    if (len < 1) return b
    let ang = Math.atan2(dy, dx)
    const step = Math.PI / 4
    const snapped = Math.round(ang / step) * step
    if (Math.abs(ang - snapped) < 0.16) ang = snapped
    return [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len]
  }

  function drawPath(ctx: CanvasRenderingContext2D, pts: number[][], lw: number) {
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (pts.length === 1) {
      ctx.beginPath()
      ctx.arc(pts[0][0], pts[0][1], Math.max(0.5, lw / 2), 0, Math.PI * 2)
      ctx.fill()
      return
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
  }

  // Перерисовать весь текущий штрих поверх снимка-фона (холст ДО штриха).
  function renderStroke(pts: number[][]) {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    if (strokeBase.current) ctx.putImageData(strokeBase.current, 0, 0)
    if (!pts.length) return
    if (tool === 'marker') {
      const off = strokeOff.current!
      const octx = off.getContext('2d')!
      octx.clearRect(0, 0, off.width, off.height)
      octx.strokeStyle = color
      octx.fillStyle = color
      drawPath(octx, pts, markerWidth())
      ctx.globalAlpha = MARKER_ALPHA
      ctx.drawImage(off, 0, 0)
      ctx.globalAlpha = 1
      return
    }
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    drawPath(ctx, pts, strokeLineWidth())
    ctx.globalCompositeOperation = 'source-over'
  }

  function clearDwell() {
    if (dwellTimer.current != null) { clearTimeout(dwellTimer.current); dwellTimer.current = null }
  }
  function cancelAnim() {
    if (animRef.current) { animRef.current.cancel = true; animRef.current = null }
  }

  // Плавный морф ломаной → прямой за ~260мс (rAF в превью нет — на setTimeout).
  function animateMorph(from: number[][], anchor: number[], target: number[]) {
    const n = from.length
    const dur = 260
    const start = Date.now()
    const token = { cancel: false }
    animRef.current = token
    const tick = () => {
      if (token.cancel) return
      const raw = Math.min(1, (Date.now() - start) / dur)
      const t = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2 // easeInOut
      const morphed = from.map((p, i) => {
        const r = n > 1 ? i / (n - 1) : 0
        const tx = anchor[0] + (target[0] - anchor[0]) * r
        const ty = anchor[1] + (target[1] - anchor[1]) * r
        return [p[0] + (tx - p[0]) * t, p[1] + (ty - p[1]) * t]
      })
      renderStroke(morphed)
      if (raw < 1) window.setTimeout(tick, 16)
      else { animRef.current = null; points.current = [anchor, target] }
    }
    tick()
  }

  // 2-сек пауза на ломаной → авто-выпрямление, дальше конец ведётся за курсором.
  function autoStraighten(end: number[]) {
    if (!drawing.current || autoRef.current) return
    dwellTimer.current = null
    autoRef.current = true
    const from = points.current.slice()
    const anchor = from[0]
    const target = snapStraight(anchor, end)
    autoAnchor.current = anchor
    autoTarget.current = target
    animateMorph(from, anchor, target)
  }

  function onDown(e: React.PointerEvent) {
    if (!active) return
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    pushHistory()
    drawing.current = true
    autoRef.current = false
    autoAnchor.current = null
    autoTarget.current = null
    cancelAnim()
    clearDwell()
    points.current = [xy(e)]
    strokeBase.current = ctx.getImageData(0, 0, c.width, c.height)
    if (tool === 'marker') {
      const off = document.createElement('canvas')
      off.width = c.width; off.height = c.height
      strokeOff.current = off
    }
    renderStroke(points.current)
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current || !active) return
    const p = xy(e)
    // движение в момент морф-анимации → отменяем и сразу ведём прямую за курсором
    if (animRef.current) { cancelAnim(); autoRef.current = true }
    const straight = e.shiftKey || autoRef.current
    if (straight) {
      clearDwell()
      const anchor = autoAnchor.current ?? points.current[0]
      const end = snapStraight(anchor, p)
      points.current = [anchor, end]
      renderStroke(points.current)
      return
    }
    points.current.push(p)
    renderStroke(points.current)
    // план авто-выпрямления: только для достаточно длинной нарисованной линии
    clearDwell()
    if (tool !== 'eraser' && points.current.length >= 3 && pathLen(points.current) > 30) {
      dwellTimer.current = window.setTimeout(() => autoStraighten(p), 2000)
    }
  }

  function onUp() {
    if (!drawing.current) return
    drawing.current = false
    clearDwell()
    // отпустили посреди морфа — дорисовать финальную прямую перед коммитом
    if (animRef.current && autoAnchor.current && autoTarget.current) {
      cancelAnim()
      points.current = [autoAnchor.current, autoTarget.current]
      renderStroke(points.current)
    }
    cancelAnim()
    autoRef.current = false
    autoAnchor.current = null
    autoTarget.current = null
    strokeBase.current = null
    strokeOff.current = null
    points.current = []
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    commit()
  }

  function undo() {
    const prev = history.current.pop()
    if (!prev) return
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.putImageData(prev, 0, 0)
    setCanUndo(history.current.length > 0)
    commit()
  }

  function clear() {
    const c = canvasRef.current!
    pushHistory()
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    lastImage.current = null
    onChange?.(null)
  }

  return (
    <div>
      {active && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          padding: '7px 10px', marginBottom: 10,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 12,
          position: 'sticky', top: 8, zIndex: 6,
        }}>
          <button title={t('Карандаш')} onClick={() => setTool('pen')} style={iconBtn(tool === 'pen', 'var(--color-blue-pill-bg)', 'var(--color-blue-pill-text)')}>
            <Pencil size={13} />
          </button>
          <button title={t('Маркер — полупрозрачное выделение в строку')} onClick={() => setTool('marker')} style={iconBtn(tool === 'marker', 'var(--color-blue-pill-bg)', 'var(--color-blue-pill-text)')}>
            <Highlighter size={13} />
          </button>
          <button title={t('Ластик')} onClick={() => setTool('eraser')} style={iconBtn(tool === 'eraser', 'var(--color-peach-soft)', 'var(--color-peach-text)')}>
            <Eraser size={13} />
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)' }} />
          {PEN_COLORS.map(c => (
            <button key={c} title={t('Цвет')} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} style={{
              width: 17, height: 17, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: c,
              border: color === c && tool !== 'eraser' ? '2.5px solid var(--color-blue-pill-text)' : '2px solid var(--color-border)',
            }} />
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)' }} />
          <input type="range" min={1} max={14} value={activeSize} onChange={e => setActiveSize(+e.target.value)} style={{ width: 64 }} />
          <div style={{ flex: 1 }} />
          <button title={t('Отменить')} onClick={undo} disabled={!canUndo} style={{ ...iconBtn(false), cursor: canUndo ? 'pointer' : 'not-allowed', opacity: canUndo ? 1 : 0.35 }}>
            <Undo2 size={13} />
          </button>
          <button title={t('Стереть всю разметку')} onClick={clear} style={{ ...iconBtn(false), background: 'var(--color-red-soft)', color: 'var(--color-red-text)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <div style={{ position: 'relative', width: lockedW, maxWidth: '100%' }}>
        <div ref={contentRef}>{children}</div>
        {showCanvas && (
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              touchAction: 'none',
              pointerEvents: active ? 'auto' : 'none',
              cursor: active ? 'crosshair' : 'default',
            }}
          />
        )}
      </div>
    </div>
  )
}

function iconBtn(on: boolean, bg = 'transparent', fg = 'var(--color-muted)'): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: on ? bg : 'transparent', color: on ? fg : 'var(--color-muted)',
  }
}
