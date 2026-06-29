import { Suspense, useCallback, useMemo, useState, useRef, useEffect } from 'react'
import RGLModule from 'react-grid-layout'
import type { Layout as RGLLayout, LayoutItem as RGLItem } from 'react-grid-layout'

// react-grid-layout uses export = syntax; unwrap for Vite's ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactGridLayout = (RGLModule as any).default ?? RGLModule
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { X, Plus } from 'lucide-react'
import { type Desk, type LayoutItem } from '../../lib/useDeskLayouts'
import { getWidgetDef } from './widgets/registry'
import { useDeskStore } from '../../store/deskStore'

// iOS-style corner resize handle
const ResizeHandle = (
  <span className="desk-resize-handle">
    <span className="desk-resize-corner" />
  </span>
)

const ROW_HEIGHT = 64
const COLS = 12
const GAP = 8

function getRowsPerScreen() {
  return Math.floor((window.innerHeight - 100) / (ROW_HEIGHT + GAP))
}

function clampToScreen(item: LayoutItem, rps: number): LayoutItem {
  const screenOfTop = Math.floor(item.y / rps)
  const screenOfBottom = Math.floor((item.y + item.h - 1) / rps)
  if (screenOfTop !== screenOfBottom) {
    // Cap height so it fits within the top screen
    const maxH = rps - (item.y % rps)
    return { ...item, h: Math.max(item.minH ?? 2, maxH) }
  }
  return item
}

type WidgetShellProps = {
  item: LayoutItem
  editMode: boolean
  onRemove: (id: string) => void
}

function WidgetShell({ item, editMode, onRemove }: WidgetShellProps) {
  const def = getWidgetDef(item.type)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const shellRef = useRef<HTMLDivElement>(null)

  // After data loads, check if inner .no-scrollbar list overflows
  useEffect(() => {
    const id = setTimeout(() => {
      const shell = shellRef.current
      if (!shell) return
      const scrollable = shell.querySelector('.no-scrollbar') as HTMLElement | null
      if (scrollable) syncEdges(scrollable)
    }, 200)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Find the scrollable child and check overflow state
  function syncEdges(el: HTMLElement) {
    const top = el.scrollTop > 4
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4
    setEdges(prev => prev.top === top && prev.bottom === bottom ? prev : { top, bottom })
  }


  if (!def) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--glass-rgb), 0.5)', borderRadius: 16, border: '1.5px solid var(--color-border-medium)' }}>
      <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Неизвестный виджет</span>
    </div>
  )

  const Comp = def.component

  return (
    <div
      ref={shellRef}
      onScrollCapture={e => {
        const el = e.target as HTMLElement
        if (el.scrollHeight > el.clientHeight + 2) syncEdges(el)
      }}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <Suspense fallback={
        <div style={{ width: '100%', height: '100%', background: 'rgba(var(--glass-rgb), 0.5)',
          borderRadius: 16, border: '1.5px solid var(--color-border-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-border-medium)', borderTopColor: 'var(--color-accent)', animation: 'spin 0.7s linear infinite' }} />
        </div>
      }>
        <Comp />
      </Suspense>

      {/* Scroll fades — appear when content overflows the widget cell */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 36,
        background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.92), transparent)',
        pointerEvents: 'none', opacity: edges.top ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 3,
        borderRadius: '16px 16px 0 0',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
        background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.92), transparent)',
        pointerEvents: 'none', opacity: edges.bottom ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 3,
        borderRadius: '0 0 16px 16px',
      }} />

      {/* Edit mode overlay */}
      {editMode && (
        <>
          {/* Drag handle */}
          <div
            className="desk-drag-handle"
            style={{
              position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 20, borderRadius: 6,
              background: 'rgba(var(--glass-rgb), 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--color-border-medium)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'grab', zIndex: 10,
            }}
          >
            <GripHorizontal size={14} color="var(--color-muted)" />
          </div>

          {/* Delete button */}
          <button
            onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
            onClick={e => { e.stopPropagation(); onRemove(item.i) }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24, borderRadius: 8,
              background: 'rgba(220, 60, 60, 0.85)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <X size={13} color="#fff" strokeWidth={2.5} />
          </button>

          {/* Dimming overlay to prevent widget interaction in edit mode */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            background: 'rgba(var(--glass-rgb), 0.25)',
            zIndex: 5, pointerEvents: 'all',
          }} />
        </>
      )}
    </div>
  )
}

type DeskCanvasProps = {
  desk: Desk
  onUpdateItems: (items: LayoutItem[]) => void
  onAddWidget: () => void
  onRemoveWidget: (id: string) => void
}

export default function DeskCanvas({ desk, onUpdateItems, onAddWidget, onRemoveWidget }: DeskCanvasProps) {
  const editMode = useDeskStore(s => s.editMode)
  const rps = getRowsPerScreen()

  const layout: RGLItem[] = useMemo(() => {
    // Apply maxH from registry before compacting
    const clamped = desk.items.map(item => {
      const def = getWidgetDef(item.type)
      const maxH = item.maxH ?? def?.maxH
      const h = maxH ? Math.min(item.h, maxH) : item.h
      return {
        i: item.i, type: item.type,
        x: item.x, y: item.y, w: item.w, h,
        minW: item.minW ?? def?.minW ?? 3,
        minH: item.minH ?? def?.minH ?? 2,
        maxH,
        isDraggable: editMode, isResizable: editMode,
      }
    })
    // Vertical compaction: pull each item up to the lowest free row
    const placed: { x: number; y: number; w: number; h: number }[] = []
    const sorted = [...clamped].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
    return sorted.map(item => {
      let y = 0
      outer: while (true) {
        for (const p of placed) {
          if (item.x < p.x + p.w && item.x + item.w > p.x &&
              y < p.y + p.h && y + item.h > p.y) { y++; continue outer }
        }
        break
      }
      placed.push({ x: item.x, y, w: item.w, h: item.h })
      return { ...item, y }
    })
  }, [desk.items, editMode])

  const handleLayoutChange = useCallback((newLayout: RGLLayout) => {
    // In view mode we only save when user explicitly drags/resizes (edit mode).
    // The visual layout is already compacted by the layout useMemo.
    if (!editMode) return
    const rps = getRowsPerScreen()
    const updated: LayoutItem[] = (newLayout as RGLItem[]).map(l => {
      const orig = desk.items.find(i => i.i === l.i)
      const def = getWidgetDef(orig?.type ?? '')
      const maxH = orig?.maxH ?? def?.maxH
      const h = maxH ? Math.min(l.h, maxH) : l.h
      const raw: LayoutItem = {
        i: l.i, type: orig?.type ?? '',
        x: l.x, y: l.y, w: l.w, h,
        minW: orig?.minW ?? def?.minW,
        minH: orig?.minH ?? def?.minH,
        maxH,
      }
      return clampToScreen(raw, rps)
    })
    onUpdateItems(updated)
  }, [desk.items, editMode, onUpdateItems])

  const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 64 : 1200

  return (
    <div style={{
      flex: 1,
      marginTop: -100,
      paddingTop: 108,
      overflowY: 'hidden',
      overflowX: 'hidden',
      paddingLeft: 32,
      paddingRight: 32,
      paddingBottom: 12,
      scrollbarGutter: 'stable',
      userSelect: editMode ? 'none' : 'auto',
    }}>
      {desk.items.length === 0 && !editMode ? (
        <div style={{
          height: '60vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>🗂</div>
          <div style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 500 }}>
            Рабочий стол пуст
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', opacity: 0.7 }}>
            Нажмите карандаш, чтобы добавить виджеты
          </div>
        </div>
      ) : (
        <ReactGridLayout
          className="desk-grid"
          layout={layout as RGLLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={containerWidth}
          margin={[GAP, GAP]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          compactType={editMode ? null : 'vertical'}
          draggableHandle=".desk-drag-handle"
          onLayoutChange={handleLayoutChange}
          useCSSTransforms
        >
          {desk.items.map(item => (
            <div key={item.i} style={{ height: '100%' }}>
              <WidgetShell
                item={item}
                editMode={editMode}
                onRemove={onRemoveWidget}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}

      {/* Add widget FAB (edit mode only) */}
      {editMode && (
        <button
          onClick={onAddWidget}
          style={{
            position: 'fixed', bottom: 32, right: 32,
            width: 52, height: 52, borderRadius: 16,
            background: 'var(--grad-purple)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(120,106,215,0.45)',
            zIndex: 100,
          }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
