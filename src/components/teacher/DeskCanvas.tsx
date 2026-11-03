import { clampDeskWidget, deskRowHeight, legacyDeskRowHeight, deskColumns, resizeDeskWidget, resolveDeskCollisions, DESK_GAP, DESK_INSET, DESK_TOP } from '../../lib/deskWidgetSizing'
import { defaultDeskItems } from '../../lib/defaultDeskLayout'
import { useScrollFades } from '../../lib/useScrollFades'
import { useWidgetScrollFades } from '../../lib/useWidgetScrollFades'
import { Suspense, useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { X } from '../icons/appIcons'
import { type Desk, type LayoutItem } from '../../lib/useDeskLayouts'
import { getWidgetDef } from './widgets/registry'
import WidgetBoundary from './WidgetBoundary'
import Skeleton from '../Skeleton'
import { useDeskStore } from '../../store/deskStore'
import { useT } from '../../lib/i18n'

const GAP = DESK_GAP

// ── Grid math ──────────────────────────────────────────────────────────
// Y-axis math takes an explicit rowH so the grid can scale to the viewport.
function colW(cw: number, cols: number) { return (cw - (cols - 1) * GAP) / cols }
function gx(x: number, cw: number, cols: number) { return x * (colW(cw, cols) + GAP) }
function gy(y: number, rh: number) { return y * (rh + GAP) }
function iw(w: number, cw: number, cols: number) { return w * colW(cw, cols) + (w - 1) * GAP }
function ih(h: number, rh: number) { return h * rh + (h - 1) * GAP }
function toGridDX(px: number, cw: number, cols: number) { return Math.round(px / (colW(cw, cols) + GAP)) }
function toGridDY(py: number, rh: number) { return Math.round(py / (rh + GAP)) }
// ── WidgetShell ─────────────────────────────────────────────────────────
type ShellProps = { item: LayoutItem; editMode: boolean; onRemove: (id: string) => void }

function WidgetShell({ item, editMode, onRemove }: ShellProps) {
  const t = useT()
  const def = getWidgetDef(item.type)
  const shellRef = useRef<HTMLDivElement>(null)
  useWidgetScrollFades(shellRef)

  if (!def) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--glass-rgb), 0.5)', borderRadius: 16, border: '1px solid var(--color-border-medium)' }}>
      <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>{t('Неизвестный виджет')}</span>
    </div>
  )

  const Comp = def.component
  return (
    <div ref={shellRef} className="desk-widget-shell iskra-widget" data-widget={item.type} data-grid-w={item.w} data-grid-h={item.h} data-stat={def.stat || undefined}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    >
      <WidgetBoundary label={item.type}>
        <Suspense fallback={
          // Скелетон формы виджета, а не крутилка по центру: на столе их
          // десяток, и десять вращающихся точек читаются как «всё сломалось»,
          // тогда как проступающая раскладка — как «сейчас будет».
          <div aria-busy="true" style={{ width: '100%', height: '100%', background: 'rgba(var(--glass-rgb),0.5)',
            borderRadius: 16, border: '1px solid var(--color-border-medium)',
            display: 'flex', flexDirection: 'column', gap: 12, padding: 18, overflow: 'hidden' }}>
            <Skeleton w="46%" h={13} />
            <Skeleton w="72%" h={24} radius={9} />
            <Skeleton.Text lines={2} style={{ marginTop: 'auto' }} />
          </div>
        }>
          <Comp />
        </Suspense>
      </WidgetBoundary>

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
            boxShadow: 'var(--shadow-2)' }}
        >
          <X size={12} color="#fff" strokeWidth={2.5} />
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
  hiddenWidgets?: string[]
  onGridMeasure?: (grid: { deskId: string; width: number; items: LayoutItem[]; columns: number }) => void
}

type DragState = {
  id: string
  startMx: number; startMy: number
  startGx: number; startGy: number
  curGx: number;   curGy: number
}
type ResizeState = {
  axis: 'both' | 'vertical'
  id: string
  startMx: number; startMy: number
  startW: number;  startH: number
  curW: number;    curH: number
}

export default function DeskCanvas({ desk, onUpdateItems, onAddWidget, hiddenWidgets, onGridMeasure }: Props) {
  const editMode = useDeskStore(s => s.editMode)
  const t = useT()

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useScrollFades(scrollRef, true, ':scope')
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
  }, [desk.items.length === 0])

  // Track viewport height so the grid can rescale to the monitor
  const [winH, setWinH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  )
  useEffect(() => {
    const onResize = () => setWinH(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Content and saved limits never determine the grid's scale. A compact
  // widget keeps its dimensions when the same viewport reloads the desk.
  const rowH = deskRowHeight(winH)
  const columns = deskColumns(cw, desk.columns)
  const items = useMemo(() => {
    const source = desk.preset ? defaultDeskItems(desk.id, columns) : desk.items
    return hiddenWidgets?.length ? source.filter(it => !hiddenWidgets.includes(it.type)) : source
  }, [desk, columns, hiddenWidgets])

  const clampItem = useCallback((item: LayoutItem) =>
    clampDeskWidget(item, getWidgetDef(item.type), cw, rowH, legacyDeskRowHeight(winH), desk.columns), [cw, rowH, winH, desk.columns])

  // ── Preserve saved rows; only resolve actual overlaps ──────────────────────────────────────────────
  const viewItems = useMemo(() => resolveDeskCollisions(items.map(clampItem)), [items, clampItem])

  useEffect(() => {
    onGridMeasure?.({ deskId: desk.id, width: cw, items: viewItems, columns })
  }, [desk.id, cw, viewItems, columns, onGridMeasure])

  // ── Live layout with collision resolution ─────────────────────────────
  const liveItems = useMemo(() => {
    if (drag) {
      const withMoved = viewItems.map(it =>
        it.i === drag.id ? clampItem({ ...it, x: drag.curGx, y: drag.curGy }) : it
      )
      return resolveDeskCollisions(withMoved, drag.id)
    }
    if (resize) {
      const item = viewItems.find(it => it.i === resize.id)!
      const def = getWidgetDef(item.type)
      const withMoved = viewItems.map(it =>
        it.i === resize.id
          ? clampItem({ ...it, w: resize.curW, h: resize.curH, maxH: def?.maxH ?? it.maxH })
          : it
      )
      return resolveDeskCollisions(withMoved, resize.id)
    }
    return viewItems
  }, [viewItems, drag, resize, clampItem, columns])

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
    const newX = Math.max(0, Math.min(columns - item.w, drag.startGx + toGridDX(dx, cw, columns)))
    const newY = Math.max(0, drag.startGy + toGridDY(dy, rowH))
    if (newX !== drag.curGx || newY !== drag.curGy) {
      setDrag(d => d ? { ...d, curGx: newX, curGy: newY } : d)
    }
  }, [drag, viewItems, cw, rowH, columns])

  const onItemPointerUp = useCallback(() => {
    if (!drag) return
    const withMoved = viewItems.map(it =>
      it.i === drag.id ? clampItem({ ...it, x: drag.curGx, y: drag.curGy }) : it
    )
    const resolved = resolveDeskCollisions(withMoved, drag.id)
    onUpdateItems([...resolved, ...desk.items.filter(saved => !resolved.some(item => item.i === saved.i))])
    setDrag(null)
  }, [drag, desk.items, viewItems, onUpdateItems, clampItem, columns])

  // ── Pointer resize handlers ───────────────────────────────────────────
  const onResizePointerDown = useCallback((e: React.PointerEvent, item: LayoutItem, axis: ResizeState['axis'] = 'both') => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setResize({
      axis,
      id: item.i,
      startMx: e.clientX, startMy: e.clientY,
      startW: item.w, startH: item.h,
      curW: item.w, curH: item.h,
    })
  }, [])

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resize) return
    const dx = resize.axis === 'vertical' ? 0 : e.clientX - resize.startMx
    const dy = e.clientY - resize.startMy
    const item = viewItems.find(it => it.i === resize.id)!
    const def = getWidgetDef(item.type)
    const next = resizeDeskWidget({...item,w:resize.startW,h:resize.startH},def,dx,dy,cw,rowH,desk.columns)
    const newW = next.w, newH = next.h
    if (newW !== resize.curW || newH !== resize.curH) {
      setResize(r => r ? { ...r, curW: newW, curH: newH } : r)
    }
  }, [resize, viewItems, cw, rowH, columns])

  const onResizePointerUp = useCallback(() => {
    if (!resize) return
    const withResized = viewItems.map(it =>
      it.i === resize.id ? clampItem({ ...it, w: resize.curW, h: resize.curH }) : it
    )
    const resolved = resolveDeskCollisions(withResized, resize.id)
    onUpdateItems([...resolved, ...desk.items.filter(saved => !resolved.some(item => item.i === saved.i))])
    setResize(null)
  }, [resize, desk.items, viewItems, onUpdateItems, clampItem, columns])

  // ── Render ────────────────────────────────────────────────────────────
  const gridHeight = useMemo(() => {
    const maxY = liveItems.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    return maxY > 0 ? ih(maxY, rowH) : 0
  }, [liveItems, rowH])

  return (
    <div className="desk-scroll-region" ref={scrollRef} data-desk-scroll style={editMode ? {
      // Fixed overlay so it escapes dashboard-root's overflow:hidden → free scroll
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--color-bg)',
      paddingTop: DESK_TOP, paddingLeft: DESK_INSET, paddingRight: DESK_INSET, paddingBottom: DESK_INSET,
      overflowY: 'auto', overflowX: 'hidden',
      overscrollBehavior: 'none',
      scrollbarWidth: 'none',
      userSelect: (drag || resize) ? 'none' : 'auto',
    } : {
      // One viewport with equal side/bottom insets; short windows scroll naturally.
      position: 'relative',
      height: '100dvh',
      marginTop: -100,
      paddingTop: DESK_TOP, paddingLeft: DESK_INSET, paddingRight: DESK_INSET, paddingBottom: DESK_INSET,
      overflowY: 'auto', overflowX: 'hidden',
      overscrollBehavior: 'none',
      scrollbarWidth: 'none',
      userSelect: 'auto',
    }}>

      {items.length === 0 && !editMode ? (
        <div style={{ height: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>🗂</div>
          <div style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 500 }}>{t('Рабочий стол пуст')}</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', opacity: 0.7 }}>{t('Нажмите карандаш, чтобы добавить виджеты')}</div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onPointerMove={drag ? onItemPointerMove : resize ? onResizePointerMove : undefined}
          onPointerUp={drag ? onItemPointerUp : resize ? onResizePointerUp : undefined}
          data-desk-grid data-grid-columns={columns} data-grid-row-height={rowH}
          style={{ position: 'relative', width: '100%', height: gridHeight, ...(editMode ? {backgroundImage:'linear-gradient(to right, var(--color-border-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border-soft) 1px, transparent 1px)', backgroundSize:`${colW(cw, columns)+GAP}px ${rowH+GAP}px`} : {}) }}
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
                  transform: `translate3d(${gx(item.x, cw, columns)}px, ${gy(item.y, rowH)}px, 0)`,
                  width: iw(item.w, cw, columns),
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
                <WidgetShell item={item} editMode={editMode} onRemove={id => onUpdateItems([...viewItems.filter(item => item.i !== id), ...desk.items.filter(item => hiddenWidgets?.includes(item.type))])} />

                {editMode && (
                  <div
                    data-resize-bottom={item.type}
                    aria-label={t('Изменить высоту виджета')}
                    onPointerDown={e => onResizePointerDown(e, viewItems.find(v => v.i === item.i)!, 'vertical')}
                    style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 64, height: 28, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 's-resize', touchAction: 'none' }}
                  >
                    <span style={{ width: 28, height: 4, borderRadius: 4, background: 'var(--color-accent)', opacity: 0.55 }} />
                  </div>
                )}

                {/* iOS-style resize corner */}
                {editMode && (
                  <div
                    data-resize-handle={item.type}
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
                      transition: 'border-color 0.15s',
                    }} />
                  </div>
                )}
              </div>
            )
          })}
          {/* Size labels share a layer above every transformed card. A child's
              z-index cannot escape its card's stacking context. */}
          {editMode && liveItems.map(item => (
            <span key={`size-${item.i}`} data-widget-size style={{
              position: 'absolute', left: gx(item.x, cw, columns) + 10, top: gy(item.y, rowH) - 10,
              zIndex: 110, fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 8,
              background: 'var(--color-bg-card)', color: 'var(--color-text-2)', pointerEvents: 'none',
            }}>{item.w}×{item.h}</span>
          ))}
        </div>
      )}

    </div>
  )
}
