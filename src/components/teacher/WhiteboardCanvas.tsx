import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Eraser, Undo2, Trash2, MousePointer2, BoxSelect, Check, GripHorizontal } from 'lucide-react'

const WB_COLORS = ['#0B0B0D', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5', '#DD6B20']

type Rect = { x: number; y: number; w: number; h: number }
type Corner = 'tl' | 'tr' | 'bl' | 'br'
type Tool = 'pen' | 'eraser' | 'select'

const CANVAS_W = 900

export default function WhiteboardCanvas({
  readOnly = false,
  compact = false,
  onSave,
  initialData,
}: {
  readOnly?: boolean
  compact?: boolean
  onSave?: (data: string) => void
  // PNG data URL to render on mount — resume a student draft, or let the teacher
  // view what the student drew (with readOnly).
  initialData?: string
}) {
  const baseDispH = compact ? 180 : 260
  const basePxH = compact ? 300 : 500
  const DENSITY = basePxH / baseDispH
  const maxDispH = baseDispH * 3.5

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#0B0B0D')
  const [size, setSize] = useState(3)
  const [canUndo, setCanUndo] = useState(false)
  const [sizeHint, setSizeHint] = useState(false)
  const sliderRef = useRef<HTMLInputElement>(null)
  const [hintPos, setHintPos] = useState({ x: 0, y: 0 })
  const drawing = useRef(false)
  const lastPt = useRef<[number, number] | null>(null)
  const history = useRef<ImageData[]>([])

  // Stretchable board height (CSS display height + tracked internal-pixel height).
  const [boardH, setBoardH] = useState(baseDispH)
  const [pxH, setPxH] = useState(basePxH)

  // Selection ("Выбор") state.
  const [sel, setSel] = useState<Rect | null>(null)
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const baseRef = useRef<ImageData | null>(null)        // canvas with the selection lifted out
  const selCanvasRef = useRef<HTMLCanvasElement | null>(null) // lifted pixels
  const marqueeStart = useRef<[number, number] | null>(null)
  const dragRef = useRef<
    | { mode: 'move'; cx0: number; cy0: number; sx: number; sy: number; start: Rect }
    | { mode: 'scale'; corner: Corner; start: Rect }
    | null
  >(null)
  const resizeRef = useRef<{ cy0: number; h0: number } | null>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, c.width, c.height)
    if (initialData) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height)
      img.src = initialData
    }
  }, [initialData])

  function clientToCanvas(clientX: number, clientY: number): [number, number] {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return [(clientX - r.left) * (c.width / r.width), (clientY - r.top) * (c.height / r.height)]
  }

  function getXY(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    return clientToCanvas(e.clientX, e.clientY)
  }

  function normRect(x0: number, y0: number, x1: number, y1: number): Rect {
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }
  }

  function pushHistory() {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    history.current.push(ctx.getImageData(0, 0, c.width, c.height))
    if (history.current.length > 30) history.current.shift()
    setCanUndo(true)
  }

  // ─── Selection helpers ──────────────────────────────────────────────────────

  function repaintSelection(rect: Rect) {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    if (baseRef.current) ctx.putImageData(baseRef.current, 0, 0)
    if (selCanvasRef.current) ctx.drawImage(selCanvasRef.current, rect.x, rect.y, rect.w, rect.h)
  }

  function lift(region: Rect) {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    const r: Rect = {
      x: Math.max(0, Math.round(region.x)),
      y: Math.max(0, Math.round(region.y)),
      w: Math.min(c.width, Math.round(region.w)),
      h: Math.min(c.height, Math.round(region.h)),
    }
    if (r.w < 4 || r.h < 4) return
    pushHistory()
    const off = document.createElement('canvas')
    off.width = r.w
    off.height = r.h
    off.getContext('2d')!.drawImage(c, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
    selCanvasRef.current = off
    // Lift: white out the source region, then snapshot the "background".
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    baseRef.current = ctx.getImageData(0, 0, c.width, c.height)
    setSel(r)
    repaintSelection(r) // draws it back in place — visually unchanged until moved/scaled
  }

  function commitSelection() {
    if (!sel) return
    selCanvasRef.current = null
    baseRef.current = null
    setSel(null)
    onSave?.(canvasRef.current!.toDataURL())
  }

  function selectAll() {
    if (sel) commitSelection()
    const c = canvasRef.current!
    setTool('select')
    lift({ x: 0, y: 0, w: c.width, h: c.height })
  }

  function chooseTool(t: Tool) {
    if (sel && t !== 'select') commitSelection()
    setTool(t)
  }

  function applyScale(corner: Corner, cx: number, cy: number, start: Rect): Rect {
    const aspect = start.w / start.h
    // anchor = opposite corner (stays fixed)
    let ax: number, ay: number
    if (corner === 'br') { ax = start.x; ay = start.y }
    else if (corner === 'bl') { ax = start.x + start.w; ay = start.y }
    else if (corner === 'tr') { ax = start.x; ay = start.y + start.h }
    else { ax = start.x + start.w; ay = start.y + start.h }
    const w = Math.max(20, Math.abs(cx - ax))
    const h = w / aspect
    const x = corner === 'bl' || corner === 'tl' ? ax - w : ax
    const y = corner === 'tl' || corner === 'tr' ? ay - h : ay
    return { x, y, w, h }
  }

  // ─── Drawing / marquee on the canvas ────────────────────────────────────────

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) return
    const c = canvasRef.current!
    const [x, y] = getXY(e)
    if (tool === 'select') {
      if (sel) commitSelection()
      marqueeStart.current = [x, y]
      marqueeRefSet({ x, y, w: 0, h: 0 })
      drawing.current = true
      c.setPointerCapture(e.pointerId)
      return
    }
    pushHistory()
    drawing.current = true
    lastPt.current = [x, y]
    c.setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || readOnly) return
    if (tool === 'select') {
      const [x, y] = getXY(e)
      const s = marqueeStart.current!
      marqueeRefSet(normRect(s[0], s[1], x, y))
      return
    }
    const ctx = canvasRef.current!.getContext('2d')!
    const [x, y] = getXY(e)
    ctx.beginPath()
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPt.current) {
      ctx.moveTo(lastPt.current[0], lastPt.current[1])
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    lastPt.current = [x, y]
  }

  const marqueeRef = useRef<Rect | null>(null)
  function marqueeRefSet(r: Rect | null) { marqueeRef.current = r; setMarquee(r) }

  function onUp() {
    if (!drawing.current) return
    drawing.current = false
    if (tool === 'select') {
      const m = marqueeRef.current
      marqueeRefSet(null)
      marqueeStart.current = null
      if (m && m.w > 10 && m.h > 10) lift(m)
      return
    }
    lastPt.current = null
    onSave?.(canvasRef.current!.toDataURL())
  }

  // ─── Move / scale an active selection ───────────────────────────────────────

  function boxDown(e: React.PointerEvent) {
    if (!sel) return
    e.stopPropagation()
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    dragRef.current = {
      mode: 'move', cx0: e.clientX, cy0: e.clientY,
      sx: c.width / r.width, sy: c.height / r.height, start: { ...sel },
    }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function handleDown(corner: Corner, e: React.PointerEvent) {
    if (!sel) return
    e.stopPropagation()
    dragRef.current = { mode: 'scale', corner, start: { ...sel } }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function dragMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    if (d.mode === 'move') {
      const dx = (e.clientX - d.cx0) * d.sx
      const dy = (e.clientY - d.cy0) * d.sy
      const ns = { ...d.start, x: d.start.x + dx, y: d.start.y + dy }
      setSel(ns)
      repaintSelection(ns)
    } else {
      const [cx, cy] = clientToCanvas(e.clientX, e.clientY)
      const ns = applyScale(d.corner, cx, cy, d.start)
      setSel(ns)
      repaintSelection(ns)
    }
  }

  function dragEnd() {
    if (dragRef.current) {
      dragRef.current = null
      onSave?.(canvasRef.current!.toDataURL())
    }
  }

  // ─── Resize ("растянуть доску") ──────────────────────────────────────────────

  function resizeDown(e: React.PointerEvent) {
    e.preventDefault()
    if (sel) commitSelection()
    resizeRef.current = { cy0: e.clientY, h0: boardH }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function resizeMove(e: React.PointerEvent) {
    const d = resizeRef.current
    if (!d) return
    const nh = Math.round(Math.max(baseDispH, Math.min(maxDispH, d.h0 + (e.clientY - d.cy0))))
    if (nh === boardH) return
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    const npx = Math.round(nh * DENSITY)
    if (npx !== c.height) {
      const snap = ctx.getImageData(0, 0, c.width, c.height)
      c.height = npx // resizing clears the canvas — restore content at the top
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.putImageData(snap, 0, 0)
      setPxH(npx)
      history.current = []
      setCanUndo(false)
    }
    setBoardH(nh)
  }

  function resizeUp() {
    if (resizeRef.current) {
      resizeRef.current = null
      onSave?.(canvasRef.current!.toDataURL())
    }
  }

  // ─── Toolbar actions ────────────────────────────────────────────────────────

  function undo() {
    if (sel) commitSelection()
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    const prev = history.current.pop()
    if (prev) {
      ctx.putImageData(prev, 0, 0)
      setCanUndo(history.current.length > 0)
      onSave?.(c.toDataURL())
    }
  }

  function clear() {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    selCanvasRef.current = null
    baseRef.current = null
    setSel(null)
    pushHistory()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, c.width, c.height)
    onSave?.(c.toDataURL())
  }

  const divider = <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)', flexShrink: 0 }} />
  const HANDLES: Corner[] = ['tl', 'tr', 'bl', 'br']

  return (
    <div style={{ border: '1.5px solid var(--color-border-medium)', borderRadius: 12, overflow: 'visible', position: 'relative' }}>
      {!readOnly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          padding: '6px 10px', background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border-medium)',
          borderRadius: '10px 10px 0 0',
        }}>
          <button title="Карандаш" onClick={() => chooseTool('pen')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tool === 'pen' ? 'var(--color-blue-pill-bg)' : 'transparent', color: tool === 'pen' ? 'var(--color-blue-pill-text)' : 'var(--color-muted)' }}>
            <Pencil size={12} />
          </button>
          <button title="Ластик" onClick={() => chooseTool('eraser')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tool === 'eraser' ? 'var(--color-peach-soft)' : 'transparent', color: tool === 'eraser' ? 'var(--color-peach-text)' : 'var(--color-muted)' }}>
            <Eraser size={12} />
          </button>
          <button title="Выбор — выделить, перенести и уменьшить" onClick={() => chooseTool('select')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tool === 'select' ? 'var(--color-blue-pill-bg)' : 'transparent', color: tool === 'select' ? 'var(--color-blue-pill-text)' : 'var(--color-muted)' }}>
            <MousePointer2 size={12} />
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)' }} />
          {WB_COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); chooseTool('pen') }} style={{ width: 16, height: 16, borderRadius: '50%', border: color === c && tool === 'pen' ? '2.5px solid var(--color-blue-pill-text)' : '2px solid var(--color-border)', background: c, cursor: 'pointer', flexShrink: 0 }} />
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)' }} />
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input
              ref={sliderRef}
              type="range" min={1} max={14} value={size}
              onChange={e => setSize(+e.target.value)}
              onMouseDown={e => {
                const inp = e.currentTarget as HTMLInputElement
                const r = inp.getBoundingClientRect()
                const ratio = (+inp.value - 1) / 13
                setHintPos({ x: r.left + ratio * r.width, y: r.top })
                setSizeHint(true)
              }}
              onMouseMove={e => {
                if (!sizeHint) return
                const inp = e.currentTarget as HTMLInputElement
                const r = inp.getBoundingClientRect()
                const ratio = (+inp.value - 1) / 13
                setHintPos({ x: r.left + ratio * r.width, y: r.top })
              }}
              onMouseUp={() => setSizeHint(false)}
              onTouchStart={e => {
                const r = e.currentTarget.getBoundingClientRect()
                setHintPos({ x: r.left + r.width / 2, y: r.top })
                setSizeHint(true)
              }}
              onTouchEnd={() => setSizeHint(false)}
              style={{ width: 56 }}
            />
          </div>

          {tool === 'select' && (
            <>
              {divider}
              <button title="Выделить всё" onClick={selectAll} style={{ height: 26, padding: '0 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', color: 'var(--color-muted)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                <BoxSelect size={12} /> Всё
              </button>
              {sel && (
                <button title="Готово" onClick={commitSelection} style={{ height: 26, padding: '0 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  <Check size={12} /> Готово
                </button>
              )}
            </>
          )}

          <div style={{ flex: 1 }} />
          <button title="Отменить" onClick={undo} disabled={!canUndo} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: canUndo ? 'pointer' : 'not-allowed', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: canUndo ? 1 : 0.35 }}>
            <Undo2 size={12} />
          </button>
          <button title="Очистить" onClick={clear} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div style={{ position: 'relative', lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={basePxH}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{
            width: '100%', height: boardH, display: 'block', background: '#fff',
            cursor: readOnly ? 'default' : tool === 'select' ? 'crosshair' : tool === 'pen' ? 'crosshair' : 'cell',
            touchAction: 'none', borderRadius: readOnly ? 12 : 0,
          }}
        />

        {/* live marquee */}
        {marquee && marquee.w > 0 && (
          <div style={{
            position: 'absolute',
            left: `${(marquee.x / CANVAS_W) * 100}%`, top: `${(marquee.y / pxH) * 100}%`,
            width: `${(marquee.w / CANVAS_W) * 100}%`, height: `${(marquee.h / pxH) * 100}%`,
            border: '1.5px dashed var(--color-accent)', background: 'rgba(120,106,215,0.10)',
            boxSizing: 'border-box', pointerEvents: 'none', borderRadius: 2,
          }} />
        )}

        {/* active selection box + scale handles */}
        {sel && (
          <div
            onPointerDown={boxDown}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            style={{
              position: 'absolute',
              left: `${(sel.x / CANVAS_W) * 100}%`, top: `${(sel.y / pxH) * 100}%`,
              width: `${(sel.w / CANVAS_W) * 100}%`, height: `${(sel.h / pxH) * 100}%`,
              border: '1.5px dashed var(--color-accent)', boxSizing: 'border-box',
              cursor: 'move', pointerEvents: 'auto', touchAction: 'none', borderRadius: 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.03)',
            }}
          >
            {HANDLES.map(cid => (
              <div
                key={cid}
                onPointerDown={e => handleDown(cid, e)}
                onPointerMove={dragMove}
                onPointerUp={dragEnd}
                style={{
                  position: 'absolute', width: 13, height: 13, background: '#fff',
                  border: '2px solid var(--color-accent)', borderRadius: 4, touchAction: 'none',
                  cursor: cid === 'tl' || cid === 'br' ? 'nwse-resize' : 'nesw-resize',
                  left: cid === 'tl' || cid === 'bl' ? -7 : undefined,
                  right: cid === 'tr' || cid === 'br' ? -7 : undefined,
                  top: cid === 'tl' || cid === 'tr' ? -7 : undefined,
                  bottom: cid === 'bl' || cid === 'br' ? -7 : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* stretch handle */}
      {!readOnly && (
        <div
          onPointerDown={resizeDown}
          onPointerMove={resizeMove}
          onPointerUp={resizeUp}
          title="Потяните, чтобы растянуть доску"
          style={{
            height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'ns-resize', background: 'var(--color-bg-2)',
            borderTop: '1px solid var(--color-border-medium)', borderRadius: '0 0 10px 10px',
            touchAction: 'none',
          }}
        >
          <GripHorizontal size={14} color="var(--color-muted)" />
        </div>
      )}

      {sizeHint && createPortal(
        <div style={{
          position: 'fixed',
          left: hintPos.x,
          top: hintPos.y - 10,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          background: 'var(--color-bg)',
          border: '1.5px solid var(--color-border-medium)',
          borderRadius: 10,
          padding: '7px 9px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          minWidth: 36,
        }}>
          <div style={{
            width: Math.max(8, tool === 'eraser' ? size * 4 : size * 2),
            height: Math.max(8, tool === 'eraser' ? size * 4 : size * 2),
            borderRadius: '50%',
            background: tool === 'eraser' ? 'transparent' : color,
            border: tool === 'eraser'
              ? '2px dashed var(--color-text-3)'
              : `2px solid ${color === '#0B0B0D' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}`,
            boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }} />
          <div style={{
            color: 'var(--color-text-2)',
            fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1,
          }}>
            {tool === 'eraser' ? `${size * 5}px` : `${size}px`}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
