import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Eraser, Undo2, Trash2 } from 'lucide-react'

const WB_COLORS = ['#0B0B0D', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5', '#DD6B20']

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState('#0B0B0D')
  const [size, setSize] = useState(3)
  const [canUndo, setCanUndo] = useState(false)
  const [sizeHint, setSizeHint] = useState(false)
  const sliderRef = useRef<HTMLInputElement>(null)
  const [hintPos, setHintPos] = useState({ x: 0, y: 0 })
  const drawing = useRef(false)
  const lastPt = useRef<[number, number] | null>(null)
  const history = useRef<ImageData[]>([])

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

  function getXY(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return [
      (e.clientX - r.left) * (c.width / r.width),
      (e.clientY - r.top) * (c.height / r.height),
    ]
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) return
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    history.current.push(ctx.getImageData(0, 0, c.width, c.height))
    if (history.current.length > 30) history.current.shift()
    setCanUndo(true)
    drawing.current = true
    lastPt.current = getXY(e)
    c.setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || readOnly) return
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

  function onUp() {
    if (!drawing.current) return
    drawing.current = false
    lastPt.current = null
    onSave?.(canvasRef.current!.toDataURL())
  }

  function undo() {
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
    history.current.push(ctx.getImageData(0, 0, c.width, c.height))
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, c.width, c.height)
    setCanUndo(true)
    onSave?.(c.toDataURL())
  }

  const canvasH = compact ? 180 : 260

  return (
    <div style={{ border: '1.5px solid var(--color-border-medium)', borderRadius: 12, overflow: 'visible', position: 'relative' }}>
      {!readOnly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          padding: '6px 10px', background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border-medium)',
          borderRadius: '10px 10px 0 0',
        }}>
          <button title="Карандаш" onClick={() => setTool('pen')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tool === 'pen' ? 'var(--color-blue-pill-bg)' : 'transparent', color: tool === 'pen' ? 'var(--color-blue-pill-text)' : 'var(--color-muted)' }}>
            <Pencil size={12} />
          </button>
          <button title="Ластик" onClick={() => setTool('eraser')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tool === 'eraser' ? 'var(--color-peach-soft)' : 'transparent', color: tool === 'eraser' ? 'var(--color-peach-text)' : 'var(--color-muted)' }}>
            <Eraser size={12} />
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--color-border-medium)' }} />
          {WB_COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setTool('pen') }} style={{ width: 16, height: 16, borderRadius: '50%', border: color === c && tool === 'pen' ? '2.5px solid var(--color-blue-pill-text)' : '2px solid var(--color-border)', background: c, cursor: 'pointer', flexShrink: 0 }} />
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
          <div style={{ flex: 1 }} />
          <button title="Отменить" onClick={undo} disabled={!canUndo} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: canUndo ? 'pointer' : 'not-allowed', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: canUndo ? 1 : 0.35 }}>
            <Undo2 size={12} />
          </button>
          <button title="Очистить" onClick={clear} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={900}
        height={compact ? 300 : 500}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ width: '100%', height: canvasH, display: 'block', background: '#fff', cursor: readOnly ? 'default' : tool === 'pen' ? 'crosshair' : 'cell', touchAction: 'none', borderRadius: readOnly ? 12 : '0 0 10px 10px' }}
      />
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
