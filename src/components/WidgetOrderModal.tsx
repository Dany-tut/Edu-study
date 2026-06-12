import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, Plus, Minus, X } from 'lucide-react'
import { useDashboard } from '../store/dashboardStore'
import { WIDGET_META } from '../data/widgets'

const EASE = [0.32, 0.72, 0, 1] as const

type Props = { open: boolean; onClose: () => void }

// One shown widget. Reorder.Item handles all the drag + layout maths, so rows
// never "fly" the way a hand-rolled drag + layout animation does. Dragging is
// limited to the grip handle (dragListener=false + dragControls) so tapping the
// row or the "−" button never starts a drag.
function ShownRow({ id, onHide, disabled }: { id: number; onHide: (id: number) => void; disabled: boolean }) {
  const w = WIDGET_META.find(m => m.id === id)
  const controls = useDragControls()
  if (!w) return null
  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: '0 14px 30px rgba(0,0,0,0.16)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 42 }}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 14,
        background: 'var(--color-bg-2)',
        border: '1.5px solid transparent',
        listStyle: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <span
        onPointerDown={e => controls.start(e)}
        style={{ display: 'flex', cursor: 'grab', touchAction: 'none', color: 'var(--color-text-4)', flexShrink: 0 }}
      >
        <GripVertical size={16} />
      </span>
      <span
        style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: w.soft, color: w.color,
        }}
      >
        <w.Icon size={17} />
      </span>
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)' }}>{w.label}</span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onHide(id)}
        disabled={disabled}
        aria-label={`Скрыть «${w.label}»`}
        title={disabled ? 'Должен остаться хотя бы один виджет' : 'Скрыть'}
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0, border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.35 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg-2)', color: 'var(--color-muted)',
        }}
      >
        <Minus size={16} />
      </motion.button>
    </Reorder.Item>
  )
}

// Manage modal: widgets are a single vertical list (one per row), not a grid of
// tiles. Shown widgets sit above the divider — drag the handle to reorder, "−"
// hides. Hidden widgets sit below — "+" brings them back. "Hidden" is simply the
// ids absent from `order`. Edits are committed to the store only on "Готово", so
// "Отмена" / Esc / backdrop discard them.
export default function WidgetOrderModal({ open, onClose }: Props) {
  const savedOrder = useDashboard(s => s.widgetOrder)
  const setWidgetOrder = useDashboard(s => s.setWidgetOrder)

  const [order, setOrder] = useState<number[]>(savedOrder)

  // Start each session from the saved order (intentionally only on open).
  useEffect(() => { if (open) setOrder(savedOrder) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const hidden = WIDGET_META.filter(w => !order.includes(w.id))
  const lastOne = order.length <= 1

  // Keep at least one widget visible — the carousel needs something to show.
  const hide = (id: number) => setOrder(prev => (prev.length <= 1 ? prev : prev.filter(x => x !== id)))
  const show = (id: number) => setOrder(prev => (prev.includes(id) ? prev : [...prev, id]))

  const apply = () => { setWidgetOrder(order); onClose() }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            background: 'rgba(15,12,24,0.42)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{
              width: 'min(420px, 100%)', maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--color-bg)', borderRadius: 24, padding: 24,
              boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Виджеты</h2>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
                  Перетащите за ручку, чтобы изменить порядок. Скрытые — ниже черты.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                aria-label="Закрыть"
                style={{
                  width: 34, height: 34, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-3)', color: 'var(--color-muted)',
                }}
              >
                <X size={17} />
              </motion.button>
            </div>

            {/* Shown widgets — vertical reorderable list */}
            <Reorder.Group
              as="div"
              axis="y"
              values={order}
              onReorder={setOrder}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0 0', listStyle: 'none', padding: 0 }}
            >
              {order.map(id => (
                <ShownRow key={id} id={id} onHide={hide} disabled={lastOne} />
              ))}
            </Reorder.Group>

            {/* Divider + hidden widgets — "+" brings one back into the carousel */}
            {hidden.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 2px 12px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-text-4)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
                    Скрытые
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-text-4)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {hidden.map(w => (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 14,
                        background: 'var(--color-bg-2)', border: '1px dashed color-mix(in srgb, var(--color-text-4) 50%, transparent)',
                      }}
                    >
                      <span
                        style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: w.soft, color: w.color, opacity: 0.7,
                        }}
                      >
                        <w.Icon size={17} />
                      </span>
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--color-muted)' }}>{w.label}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => show(w.id)}
                        aria-label={`Показать «${w.label}»`}
                        title="Добавить"
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0, border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--color-purple-soft)', color: '#7B3FCC',
                        }}
                      >
                        <Plus size={16} />
                      </motion.button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  padding: '0 18px', height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600,
                }}
              >
                Отмена
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={apply}
                style={{
                  padding: '0 22px', height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #C58BFF, #7B61FF)', color: '#fff', fontSize: 14, fontWeight: 650,
                }}
              >
                Готово
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
