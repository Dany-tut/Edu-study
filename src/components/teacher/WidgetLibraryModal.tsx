import { WIDGET_REVIEW_PATH, WIDGET_REVIEW_HASH } from '../../lib/widgetReviewRoute'
import { clampDeskWidget, resolveDeskCollisions, deskColumns, deskRowHeight, legacyDeskRowHeight } from '../../lib/deskWidgetSizing'
import { useRef } from 'react'
import { useWidgetScrollFades } from '../../lib/useWidgetScrollFades'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '../icons/appIcons'
import { WIDGET_REGISTRY, getWidgetDef, type WidgetDef } from './widgets/registry'
import type { LayoutItem } from '../../lib/useDeskLayouts'
import { useT } from '../../lib/i18n'

type Props = {
  onClose: () => void
  onAdd: (item: LayoutItem) => void
  existingTypes: string[]
  existingItems?: LayoutItem[]
  hiddenWidgets?: string[]
  gridWidth?: number
  gridColumns?: number
}

function WidgetCard({ def, size, onAdd }: { def: WidgetDef; size: { w: number; h: number }; onAdd: () => void }) {
  const t = useT()
  const Icon = def.icon
  return (
    <button
      className="ww-gallery-card"
      onClick={onAdd}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14, border: '1px solid var(--color-border-medium)',
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
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t(def.label)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>{t(def.description)}</div>
      </div>
      <div style={{
        flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-muted)',
        background: 'var(--color-bg-3)', borderRadius: 8, padding: '4px 8px',
      }}>
        {size.w}×{size.h}
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

export default function WidgetLibraryModal({ onClose, onAdd, existingTypes, existingItems = [], hiddenWidgets, gridWidth, gridColumns }: Props) {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  useWidgetScrollFades(dialogRef)
  const registry = WIDGET_REGISTRY.filter(def => !def.legacy && !hiddenWidgets?.includes(def.type))
  const width = gridWidth ?? Math.max(1, document.documentElement.clientWidth - 64)
  const rowHeight = deskRowHeight(window.innerHeight)
  const widgetSize = (def: WidgetDef) => clampDeskWidget({i:def.type, type:def.type, x:0,y:0,w:def.defaultW,h:def.defaultH,gridVersion:2},def,width,rowHeight,64,gridColumns)
  const handleAdd = (def: WidgetDef) => {
    const id = `${def.type}-${Date.now()}`
    const existing = resolveDeskCollisions(existingItems.map(item => clampDeskWidget(item, getWidgetDef(item.type), width, rowHeight, legacyDeskRowHeight(window.innerHeight),gridColumns)))
    const size = widgetSize(def)
    const pos = findFreePosition(existing, size.w, size.h, deskColumns(width,gridColumns))
    const item: LayoutItem = {
      i: id,
      type: def.type,
      x: pos.x,
      y: pos.y,
      gridVersion: 2,
      w: size.w,
      h: size.h,
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
          ref={dialogRef}
          role="dialog" aria-modal="true" aria-label={t('Добавить виджет')}
          className="ww-gallery-dialog"
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.7 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-bg-input)',
            backdropFilter: 'var(--blur-solid)',
            borderRadius: 22,
            boxShadow: 'var(--shadow-5)',
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
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{t('Добавить виджет')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                {t('Кликните — виджет появится на столе')}
              </div>
            </div>
            <button
              aria-label={t('Закрыть')}
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'var(--color-bg-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} color="var(--color-muted)" />
            </button>
          </div>

          {/* Widget list */}
          <div className="ww-gallery-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registry.map(def => (
              <WidgetCard
                key={def.type}
                def={def}
                size={widgetSize(def)}
                onAdd={() => handleAdd(def)}
              />
            ))}
          </div>
          <a href={WIDGET_REVIEW_PATH} onClick={event => { event.preventDefault(); onClose(); window.location.hash = WIDGET_REVIEW_HASH }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '10px 18px', flexShrink: 0, borderTop: '1px solid var(--color-border-medium)', fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>{t('Вся сетка размеров')}</a>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
