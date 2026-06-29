import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { WIDGET_REGISTRY, type WidgetDef } from './widgets/registry'
import type { LayoutItem } from '../../lib/useDeskLayouts'

type Props = {
  onClose: () => void
  onAdd: (item: LayoutItem) => void
  existingTypes: string[]
}

function WidgetCard({ def, onAdd }: { def: WidgetDef; onAdd: () => void }) {
  const Icon = def.icon
  return (
    <button
      onClick={onAdd}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--color-border-medium)',
        background: 'rgba(var(--glass-rgb), 0.6)', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(var(--glass-rgb), 0.95)'
        e.currentTarget.style.borderColor = 'var(--color-accent)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(var(--glass-rgb), 0.6)'
        e.currentTarget.style.borderColor = 'var(--color-border-medium)'
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: def.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} strokeWidth={1.8} color={def.iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{def.label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>{def.description}</div>
      </div>
      <div style={{
        flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-muted)',
        background: 'var(--color-bg-3)', borderRadius: 8, padding: '3px 8px',
      }}>
        {def.defaultW}×{def.defaultH}
      </div>
    </button>
  )
}

function findFreePosition(existingItems: { x: number; y: number; w: number; h: number }[], w: number, h: number, cols = 12): { x: number; y: number } {
  const maxY = existingItems.reduce((m, i) => Math.max(m, i.y + i.h), 0)
  for (let row = 0; row <= maxY + 1; row++) {
    for (let col = 0; col <= cols - w; col++) {
      const overlaps = existingItems.some(item =>
        col < item.x + item.w && col + w > item.x &&
        row < item.y + item.h && row + h > item.y
      )
      if (!overlaps) return { x: col, y: row }
    }
  }
  return { x: 0, y: maxY }
}

export default function WidgetLibraryModal({ onClose, onAdd, existingTypes }: Props) {
  const handleAdd = (def: WidgetDef) => {
    const id = `${def.type}-${Date.now()}`
    const pos = findFreePosition([], def.defaultW, def.defaultH)
    const item: LayoutItem = {
      i: id,
      type: def.type,
      x: pos.x,
      y: pos.y,
      w: def.defaultW,
      h: def.defaultH,
      minW: def.minW,
      minH: def.minH,
      maxH: def.maxH,
    }
    onAdd(item)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="wl-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(11,11,13,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.7 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-bg-input)',
            backdropFilter: 'blur(24px)',
            borderRadius: 22,
            boxShadow: '0 32px 100px rgba(0,0,0,0.22)',
            width: 460, maxWidth: '94vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 22px 14px',
            borderBottom: '1px solid var(--color-border-medium)',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Добавить виджет</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 3 }}>
                Кликните — виджет появится на столе
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'var(--color-bg-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={15} color="var(--color-muted)" />
            </button>
          </div>

          {/* Widget list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WIDGET_REGISTRY.map(def => (
              <WidgetCard
                key={def.type}
                def={def}
                onAdd={() => handleAdd(def)}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
