import { Suspense, useCallback, useMemo } from 'react'
import RGLModule from 'react-grid-layout'
import type { Layout as RGLLayout, LayoutItem as RGLItem } from 'react-grid-layout'

// react-grid-layout uses export = syntax; unwrap for Vite's ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactGridLayout = (RGLModule as any).default ?? RGLModule
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { X, GripHorizontal, Plus } from 'lucide-react'
import { type Desk, type LayoutItem } from '../../lib/useDeskLayouts'
import { getWidgetDef } from './widgets/registry'
import { useDeskStore } from '../../store/deskStore'

const ROW_HEIGHT = 80
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
  if (!def) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--glass-rgb), 0.5)', borderRadius: 16, border: '1.5px solid var(--color-border-medium)' }}>
      <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Неизвестный виджет</span>
    </div>
  )

  const Comp = def.component

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Suspense fallback={
        <div style={{ width: '100%', height: '100%', background: 'rgba(var(--glass-rgb), 0.5)',
          borderRadius: 16, border: '1.5px solid var(--color-border-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-border-medium)', borderTopColor: 'var(--color-accent)', animation: 'spin 0.7s linear infinite' }} />
        </div>
      }>
        <Comp />
      </Suspense>

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

  const layout: RGLItem[] = useMemo(
    () => desk.items.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW ?? 3,
      minH: item.minH ?? 2,
      maxH: item.maxH,
      isDraggable: editMode,
      isResizable: editMode,
    })),
    [desk.items, editMode]
  )

  const handleLayoutChange = useCallback((newLayout: RGLLayout) => {
    const rps = getRowsPerScreen()
    const updated: LayoutItem[] = (newLayout as RGLItem[]).map(l => {
      const orig = desk.items.find(i => i.i === l.i)
      const raw: LayoutItem = {
        i: l.i,
        type: orig?.type ?? '',
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        minW: orig?.minW,
        minH: orig?.minH,
        maxH: orig?.maxH,
      }
      return clampToScreen(raw, rps)
    })
    onUpdateItems(updated)
  }, [desk.items, onUpdateItems])

  const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 64 : 1200

  return (
    <div style={{
      flex: 1,
      marginTop: -100,
      paddingTop: 108,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingLeft: 32,
      paddingRight: 32,
      paddingBottom: 48,
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
