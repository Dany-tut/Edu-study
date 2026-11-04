import { clampDeskWidget, resolveDeskCollisions, deskColumns, deskRowHeight, legacyDeskRowHeight } from '../../lib/deskWidgetSizing'
import { metricObjects } from '../../lib/widgetMetricObjects'
import { useRef } from 'react'
import { useWidgetScrollFades } from '../../lib/useWidgetScrollFades'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Pencil } from '../icons/appIcons'
import { WIDGET_REGISTRY, getWidgetDef, type WidgetDef } from './widgets/registry'
import type { LayoutItem } from '../../lib/useDeskLayouts'
import FadeText from '../FadeText'
import { useT } from '../../lib/i18n'

type Props = {
  onClose: () => void
  onEditDesk?: () => void
  onAdd: (item: LayoutItem) => void
  existingTypes: string[]
  existingItems?: LayoutItem[]
  hiddenWidgets?: string[]
  gridWidth?: number
  gridColumns?: number
}

function WidgetCard({ def, onAdd }: { def: WidgetDef; onAdd: () => void }) {
  const t = useT()
  const Icon = def.icon
  return (
    <div className="ww-gallery-card">
      <div className="ww-gallery-icon" style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: def.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <>{metricObjects[def.type]?<img src={metricObjects[def.type]} alt="" width="42" height="42" style={{objectFit:'contain'}}/>:<Icon size={20} strokeWidth={1.8} color={def.iconColor} />}</>
      </div>
      <div className="ww-gallery-copy" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t(def.label)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>{t(def.description)}</div>
      </div>
      <button type="button" className="ww-gallery-add" aria-label={`${t('Добавить')}: ${t(def.label)}`} onClick={onAdd}><Plus size={18}/><span>{t('Добавить')}</span></button>
    </div>
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

export default function WidgetLibraryModal({ onClose, onEditDesk, onAdd, existingTypes, existingItems = [], hiddenWidgets, gridWidth, gridColumns }: Props) {
  const t = useT()
  const title = onEditDesk ? t('Виджеты') : t('Добавить виджет')
  const dialogRef = useRef<HTMLDivElement>(null)
  useWidgetScrollFades(dialogRef)
  const registry = WIDGET_REGISTRY.filter(def => !def.legacy && !def.unavailable && !hiddenWidgets?.includes(def.type))
  const width = gridWidth ?? Math.max(1, document.documentElement.clientWidth - 64)
  const rowHeight = deskRowHeight(window.innerHeight)
  const handleAdd = (def: WidgetDef) => {
    const id = `${def.type}-${Date.now()}`
    const existing = resolveDeskCollisions(existingItems.map(item => clampDeskWidget(item, getWidgetDef(item.type), width, rowHeight, legacyDeskRowHeight(window.innerHeight),gridColumns)))
    const size = clampDeskWidget(
      { i: id, type: def.type, x: 0, y: 0, w: 1, h: 1, gridVersion: 2 },
      def, width, rowHeight, legacyDeskRowHeight(window.innerHeight), gridColumns,
    )
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
          role="dialog" aria-modal="true" aria-label={title}
          className="ww-gallery-dialog"
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.7 }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Escape' && e.currentTarget.contains(e.target as Node)) onClose()
          }}
          style={{
            background: 'var(--color-bg-input)',
            backdropFilter: 'var(--blur-solid)',
            borderRadius: 22,
            boxShadow: 'var(--shadow-5)',
            width: 520, maxWidth: '94vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 22px 14px', gap:12,
            borderBottom: '1px solid var(--color-border-medium)',
            flexShrink: 0,
          }}>
            <div style={{ minWidth:0, flex:1 }}>
              <FadeText lines={2} style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{title}</FadeText>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                {t('Кликните — виджет появится на столе')}
              </div>
            </div>
            <button
              autoFocus
              aria-label={t('Закрыть')}
              onClick={onClose}
              style={{
                width: 44, height: 44, flexShrink:0, borderRadius: '50%', border: 'none',
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
                onAdd={() => handleAdd(def)}
              />
            ))}
          </div>
          {onEditDesk && (
            <button type="button" className="ww-gallery-edit" onClick={onEditDesk}>
              <Pencil size={16} />{t('Настроить на экране')}
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
