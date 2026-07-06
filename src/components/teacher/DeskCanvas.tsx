import { Suspense, useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { type Desk, type LayoutItem } from '../../lib/useDeskLayouts'
import { getWidgetDef } from './widgets/registry'
import WidgetBoundary from './WidgetBoundary'
import { useDeskStore } from '../../store/deskStore'

const ROW_H = 64          // base row height (edit mode + fallback)
const ROW_H_MIN = 42      // floor when shrinking to fit a short monitor
const ROW_H_MAX = 84      // cap when growing to fill a tall monitor
const TOP_PAD = 108       // paddingTop of the scroll container
const BOTTOM_BREATH = 16  // small gap so the last row isn't flush to the edge
const COLS = 12
const GAP = 8

// ── Grid math ──────────────────────────────────────────────────────────
// Y-axis math takes an explicit rowH so the grid can scale to the viewport.
function colW(cw: number) { return (cw - (COLS - 1) * GAP) / COLS }
function gx(x: number, cw: number) { return x * (colW(cw) + GAP) }
function gy(y: number, rh: number) { return y * (rh + GAP) }
function iw(w: number, cw: number) { return w * colW(cw) + (w - 1) * GAP }
function ih(h: number, rh: number) { return h * rh + (h - 1) * GAP }
function toGridDX(px: number, cw: number) { return Math.round(px / (colW(cw) + GAP)) }
function toGridDY(py: number) { return Math.round(py / (ROW_H + GAP)) }
function clampItem(it: LayoutItem): LayoutItem {
  const w = Math.max(it.minW ?? 2, it.w)
  const h = it.maxH ? Math.min(it.maxH, Math.max(it.minH ?? 2, it.h)) : Math.max(it.minH ?? 2, it.h)
  const x = Math.max(0, Math.min(COLS - w, it.x))
  const y = Math.max(0, it.y)
  return { ...it, x, y, w, h }
}

// ── Collision resolution ────────────────────────────────────────────────
function overlaps(a: LayoutItem, b: LayoutItem): boolean {
  if (a.i === b.i) return false
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
           a.y + a.h <= b.y || b.y + b.h <= a.y)
}

function resolveCollisions(items: LayoutItem[], activeId: string): LayoutItem[] {
  const layout = items.map(it => ({ ...it }))
  const activeIdx = layout.findIndex(it => it.i === activeId)

  for (let pass = 0; pass < layout.length * 3; pass++) {
    let changed = false
    for (let i = 0; i < layout.length; i++) {
      if (i === activeIdx) continue
      for (let j = 0; j < layout.length; j++) {
        if (i === j || !overlaps(layout[i], layout[j])) continue
        const blocker = layout[j]
        const item = layout[i]
        // Try push right; fall back to push down
        const rightX = blocker.x + blocker.w
        if (rightX + item.w <= COLS) {
          layout[i] = { ...item, x: rightX, y: blocker.y }
        } else {
          layout[i] = { ...item, y: blocker.y + blocker.h }
        }
        changed = true
        break
      }
    }
    if (!changed) break
  }
  return layout
}

// ── WidgetShell ─────────────────────────────────────────────────────────
type ShellProps = { item: LayoutItem; editMode: boolean; onRemove: (id: string) => void }

function WidgetShell({ item, editMode, onRemove }: ShellProps) {
  const def = getWidgetDef(item.type)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      const el = shellRef.current?.querySelector('.no-scrollbar') as HTMLElement | null
      if (el) sync(el)
    }, 200)
    return () => clearTimeout(id)
  }, [])

  function sync(el: HTMLElement) {
    const top = el.scrollTop > 4
    const bot = el.scrollTop + el.clientHeight < el.scrollHeight - 4
    setEdges(p => p.top === top && p.bottom === bot ? p : { top, bottom: bot })
  }

  if (!def) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--glass-rgb), 0.5)', borderRadius: 16, border: '1.5px solid var(--color-border-medium)' }}>
      <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Неизвестный виджет</span>
    </div>
  )

  const Comp = def.component
  return (
    <div ref={shellRef}
      onScrollCapture={e => { const el = e.target as HTMLElement; if (el.scrollHeight > el.clientHeight + 2) sync(el) }}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    >
      <WidgetBoundary label={item.type}>
        <Suspense fallback={
          <div style={{ width: '100%', height: '100%', background: 'rgba(var(--glass-rgb),0.5)',
            borderRadius: 16, border: '1.5px solid var(--color-border-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-border-medium)', borderTopColor: 'var(--color-accent)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        }>
          <Comp />
        </Suspense>
      </WidgetBoundary>

      {/* Scroll fades */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36, pointerEvents: 'none', zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(var(--glass-rgb),0.92), transparent)',
        opacity: edges.top ? 1 : 0, transition: 'opacity .18s', borderRadius: '24px 24px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, pointerEvents: 'none', zIndex: 3,
        background: 'linear-gradient(to top, rgba(var(--glass-rgb),0.92), transparent)',
        opacity: edges.bottom ? 1 : 0, transition: 'opacity .18s', borderRadius: '0 0 24px 24px' }} />

      {/* Edit overlay — blocks widget-internal clicks, acts as drag surface */}
      {editMode && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24, zIndex: 6,
          background: 'rgba(0,0,0,0.10)',
          cursor: 'grab', pointerEvents: 'auto' }} />
      )}

      {/* Delete button */}
      {editMode && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onRemove(item.i) }}
          style={{ position: 'absolute', top: -11, right: -11, width: 26, height: 26, borderRadius: '50%',
            background: '#dc3c3c', border: '2.5px solid rgba(0,0,0,0.35)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
        >
          <X size={12} color="#fff" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

// ── DeskCanvas ──────────────────────────────────────────────────────────
type Props = {
  desk: Desk
  onUpdateItems: (items: LayoutItem[]) => void
  onAddWidget: () => void
  onRemoveWidget: (id: string) => void
  hiddenWidgets?: string[]
}

type DragState = {
  id: string
  startMx: number; startMy: number
  startGx: number; startGy: number
  curGx: number;   curGy: number
}
type ResizeState = {
  id: string
  startMx: number; startMy: number
  startW: number;  startH: number
  curW: number;    curH: number
}

export default function DeskCanvas({ desk, onUpdateItems, onAddWidget, onRemoveWidget, hiddenWidgets }: Props) {
  const editMode = useDeskStore(s => s.editMode)

  // Admin may have revoked specific widgets for this teacher — never render them
  // (persistence still keeps them in desk.items, so nothing is lost).
  const items = useMemo(() =>
    hiddenWidgets?.length ? desk.items.filter(it => !hiddenWidgets.includes(it.type)) : desk.items,
    [desk.items, hiddenWidgets])
  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)

  // Measure actual container width after mount
  const [cw, setCw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth - 128 : 1200
  )
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setCw(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Track viewport height so the grid can rescale to the monitor
  const [winH, setWinH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  )
  useEffect(() => {
    const onResize = () => setWinH(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── View-mode compaction ──────────────────────────────────────────────
  const viewItems = useMemo(() => {
    if (editMode) return items.map(it => clampItem(it))
    const sorted = [...items].map(it => clampItem(it)).sort((a, b) =>
      a.y !== b.y ? a.y - b.y : a.x - b.x)
    const placed: LayoutItem[] = []
    return sorted.map(item => {
      let y = 0
      outer: while (true) {
        for (const p of placed) {
          if (item.x < p.x + p.w && item.x + item.w > p.x &&
              y < p.y + p.h && y + item.h > p.y) { y++; continue outer }
        }
        break
      }
      const out = { ...item, y }
      placed.push(out)
      return out
    })
  }, [items, editMode])

  // ── Adaptive row height ───────────────────────────────────────────────
  // In view mode the whole active desk should fit one monitor without a
  // scrollbar: shrink the row height on short screens, grow it (up to a cap)
  // on tall ones. Edit mode keeps the fixed base so dragging feels stable.
  const rowH = useMemo(() => {
    if (editMode) return ROW_H
    const maxY = viewItems.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    if (!maxY) return ROW_H
    const avail = winH - TOP_PAD - BOTTOM_BREATH
    const fit = (avail - (maxY - 1) * GAP) / maxY
    return Math.max(ROW_H_MIN, Math.min(ROW_H_MAX, fit))
  }, [viewItems, editMode, winH])

  // ── Live layout with collision resolution ─────────────────────────────
  const liveItems = useMemo(() => {
    if (drag) {
      const withMoved = viewItems.map(it =>
        it.i === drag.id ? clampItem({ ...it, x: drag.curGx, y: drag.curGy }) : it
      )
      return resolveCollisions(withMoved, drag.id)
    }
    if (resize) {
      const item = viewItems.find(it => it.i === resize.id)!
      const def = getWidgetDef(item.type)
      const withMoved = viewItems.map(it =>
        it.i === resize.id
          ? clampItem({ ...it, w: resize.curW, h: resize.curH, maxH: it.maxH ?? def?.maxH })
          : it
      )
      return resolveCollisions(withMoved, resize.id)
    }
    return viewItems
  }, [viewItems, drag, resize])

  // ── Pointer drag handlers ─────────────────────────────────────────────
  const onItemPointerDown = useCallback((e: React.PointerEvent, item: LayoutItem) => {
    if (!editMode) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current!.getBoundingClientRect()
    setDrag({
      id: item.i,
      startMx: e.clientX - rect.left,
      startMy: e.clientY - rect.top,
      startGx: item.x, startGy: item.y,
      curGx: item.x,   curGy: item.y,
    })
  }, [editMode])

  const onItemPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return
    const rect = containerRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const dx = mx - drag.startMx
    const dy = my - drag.startMy
    const item = viewItems.find(it => it.i === drag.id)!
    const newX = Math.max(0, Math.min(COLS - item.w, drag.startGx + toGridDX(dx, cw)))
    const newY = Math.max(0, drag.startGy + toGridDY(dy))
    if (newX !== drag.curGx || newY !== drag.curGy) {
      setDrag(d => d ? { ...d, curGx: newX, curGy: newY } : d)
    }
  }, [drag, viewItems, cw])

  const onItemPointerUp = useCallback(() => {
    if (!drag) return
    const withMoved = desk.items.map(it =>
      it.i === drag.id ? clampItem({ ...it, x: drag.curGx, y: drag.curGy }) : it
    )
    onUpdateItems(resolveCollisions(withMoved, drag.id))
    setDrag(null)
  }, [drag, desk.items, onUpdateItems])

  // ── Pointer resize handlers ───────────────────────────────────────────
  const onResizePointerDown = useCallback((e: React.PointerEvent, item: LayoutItem) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setResize({
      id: item.i,
      startMx: e.clientX, startMy: e.clientY,
      startW: item.w, startH: item.h,
      curW: item.w, curH: item.h,
    })
  }, [])

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resize) return
    const dx = e.clientX - resize.startMx
    const dy = e.clientY - resize.startMy
    const item = desk.items.find(it => it.i === resize.id)!
    const def = getWidgetDef(item.type)
    const minW = item.minW ?? def?.minW ?? 2
    const minH = item.minH ?? def?.minH ?? 2
    const maxH = item.maxH ?? def?.maxH
    const newW = Math.max(minW, Math.min(COLS - item.x, resize.startW + Math.round(dx / (colW(cw) + GAP))))
    const newH = Math.max(minH, maxH ? Math.min(maxH, resize.startH + Math.round(dy / (ROW_H + GAP))) : resize.startH + Math.round(dy / (ROW_H + GAP)))
    if (newW !== resize.curW || newH !== resize.curH) {
      setResize(r => r ? { ...r, curW: newW, curH: newH } : r)
    }
  }, [resize, desk.items, cw])

  const onResizePointerUp = useCallback(() => {
    if (!resize) return
    const withResized = desk.items.map(it =>
      it.i === resize.id ? clampItem({ ...it, w: resize.curW, h: resize.curH }) : it
    )
    onUpdateItems(resolveCollisions(withResized, resize.id))
    setResize(null)
  }, [resize, desk.items, onUpdateItems])

  // ── Render ────────────────────────────────────────────────────────────
  const gridHeight = useMemo(() => {
    const maxY = liveItems.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    return ih(maxY, rowH) || 0
  }, [liveItems, rowH])

  // Number of snap pages needed in view mode (iOS-style paging)
  const numSnapPages = useMemo(() => {
    if (editMode) return 0
    // innerHeight can be 0 (headless/minimized/first paint) → Infinity would
    // make Array.from throw RangeError and white-screen the whole desk.
    const vh = window.innerHeight || 900
    return Math.min(50, Math.max(1, Math.ceil((gridHeight + 108) / vh)))
  }, [gridHeight, editMode])

  return (
    <div style={editMode ? {
      // Fixed overlay so it escapes dashboard-root's overflow:hidden → free scroll
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--color-bg)',
      paddingTop: 108, paddingLeft: 32, paddingRight: 32, paddingBottom: 120,
      overflowY: 'auto', overflowX: 'hidden',
      overscrollBehavior: 'none',
      scrollbarGutter: 'stable',
      userSelect: (drag || resize) ? 'none' : 'auto',
    } : {
      // iOS-style paged view: exactly one viewport tall, snap between pages
      position: 'relative',
      height: '100dvh',
      marginTop: -100,
      paddingTop: 108, paddingLeft: 32, paddingRight: 32, paddingBottom: 0,
      overflowY: 'auto', overflowX: 'hidden',
      overscrollBehavior: 'none',
      scrollSnapType: 'y mandatory',
      userSelect: 'auto',
    }}>

      {/* Page snap anchors (view mode only) — make scroll container exactly N pages tall */}
      {!editMode && Array.from({ length: numSnapPages }, (_, i) => (
        <div key={`snap-${i}`} style={{
          position: 'absolute', top: i * window.innerHeight,
          left: 0, right: 0, height: window.innerHeight,
          scrollSnapAlign: 'start', scrollSnapStop: 'always',
          pointerEvents: 'none',
        }} />
      ))}

      {items.length === 0 && !editMode ? (
        <div style={{ height: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>🗂</div>
          <div style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 500 }}>Рабочий стол пуст</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', opacity: 0.7 }}>Нажмите карандаш, чтобы добавить виджеты</div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onPointerMove={drag ? onItemPointerMove : resize ? onResizePointerMove : undefined}
          onPointerUp={drag ? onItemPointerUp : resize ? onResizePointerUp : undefined}
          style={{ position: 'relative', width: '100%', height: gridHeight }}
        >
          {liveItems.map(item => {
            const isDragging = drag?.id === item.i
            const isResizing = resize?.id === item.i
            const isActive = isDragging || isResizing
            // Bare widgets render their own card(s); the cell must not add a
            // backing frame/shadow (would show as a stray panel behind them).
            const bare = getWidgetDef(item.type)?.bare && !editMode
            return (
              <div
                key={item.i}
                className={editMode ? 'widget-edit-glow' : undefined}
                onPointerDown={editMode ? e => onItemPointerDown(e, viewItems.find(v => v.i === item.i)!) : undefined}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: `translate3d(${gx(item.x, cw)}px, ${gy(item.y, rowH)}px, 0)`,
                  width: iw(item.w, cw),
                  height: ih(item.h, rowH),
                  overflow: 'visible',
                  opacity: isDragging ? 0.88 : 1,
                  scale: isDragging ? '1.025' : '1',
                  zIndex: isActive ? 100 : 1,
                  cursor: editMode && !isDragging ? 'grab' : isDragging ? 'grabbing' : 'default',
                  willChange: (drag || resize) ? 'transform' : 'auto',
                  boxShadow: isDragging ? 'var(--shadow-widget-drag)' : (bare ? 'none' : 'var(--shadow-widget)'),
                  borderRadius: bare ? 0 : 24,
                  transition: isActive
                    ? 'opacity .15s ease, scale .18s cubic-bezier(.25,.46,.45,.94), box-shadow .18s ease'
                    : 'transform .22s cubic-bezier(.25,.46,.45,.94), width .22s cubic-bezier(.25,.46,.45,.94), height .22s cubic-bezier(.25,.46,.45,.94), opacity .15s ease, scale .18s cubic-bezier(.25,.46,.45,.94), box-shadow .18s ease',
                  touchAction: 'none',
                }}
              >
                <WidgetShell item={item} editMode={editMode} onRemove={onRemoveWidget} />

                {/* iOS-style resize corner */}
                {editMode && (
                  <div
                    onPointerDown={e => onResizePointerDown(e, viewItems.find(v => v.i === item.i)!)}
                    style={{
                      position: 'absolute', bottom: 6, right: 6,
                      width: 28, height: 28, zIndex: 20,
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                      cursor: 'se-resize', touchAction: 'none',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18,
                      borderRight: `2.5px solid rgba(255,255,255,${isResizing ? 1 : 0.7})`,
                      borderBottom: `2.5px solid rgba(255,255,255,${isResizing ? 1 : 0.7})`,
                      borderRadius: '0 0 16px 0',
                      transition: 'border-color .15s',
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
