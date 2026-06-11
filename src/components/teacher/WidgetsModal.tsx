import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { X, GripVertical, Minus, Plus, BarChart2, CalendarDays, ClipboardCheck, Bell, CreditCard, Users, BookOpen, type LucideIcon } from 'lucide-react'

type Widget = {
  id: string
  label: string
  icon: LucideIcon
  bg: string
  color: string
  visible: boolean
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'schedule',   label: 'Расписание',       icon: CalendarDays,   bg: 'var(--color-purple-soft)', color: '#6C5CE7', visible: true },
  { id: 'homework',   label: 'ДЗ на проверку',   icon: ClipboardCheck, bg: 'var(--color-red-soft)', color: '#C0392B', visible: true },
  { id: 'reminders',  label: 'Напоминания',       icon: Bell,           bg: 'var(--color-peach-soft)', color: '#E67E22', visible: true },
  { id: 'payments',   label: 'Оплата',            icon: CreditCard,     bg: 'var(--color-green-soft)', color: '#1a8a5a', visible: true },
  { id: 'stats',      label: 'Статистика',        icon: BarChart2,      bg: 'var(--color-purple-soft)', color: '#6C5CE7', visible: false },
  { id: 'students',   label: 'Студенты',          icon: Users,          bg: 'var(--color-blue-pill-bg)', color: '#3B5BDB', visible: false },
  { id: 'lessons',    label: 'Уроки',             icon: BookOpen,       bg: 'var(--color-green-soft)', color: '#1a8a5a', visible: false },
]

function WidgetIcon({ icon: Icon, bg, color }: { icon: LucideIcon; bg: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={18} strokeWidth={1.8} color={color} />
    </div>
  )
}

export default function WidgetsModal({ onClose }: { onClose: () => void }) {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS)

  const visible  = widgets.filter(w => w.visible)
  const hidden   = widgets.filter(w => !w.visible)

  const toggle = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }, [])

  const reorderVisible = useCallback((newOrder: Widget[]) => {
    setWidgets(prev => [...newOrder, ...prev.filter(w => !w.visible)])
  }, [])

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="widgets-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(11,11,13,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-bg-input)', borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            width: 420, maxWidth: '92vw',
            padding: '28px 24px 20px',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Виджеты</div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.4 }}>
                Перетащите за ручку, чтобы изменить порядок.<br />
                Скрытые — ниже черты.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'var(--color-bg-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Visible widgets (reorderable) */}
          <div style={{ marginTop: 20 }}>
            <Reorder.Group
              axis="y"
              values={visible}
              onReorder={reorderVisible}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {visible.map(w => (
                <Reorder.Item
                  key={w.id}
                  value={w}
                  style={{ display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--color-bg-4)', borderRadius: 12, padding: '10px 12px',
                    cursor: 'grab', userSelect: 'none',
                  }}
                >
                  <GripVertical size={16} color="#C0C0CC" style={{ flexShrink: 0 }} />
                  <WidgetIcon icon={w.icon} bg={w.bg} color={w.color} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>{w.label}</span>
                  <button
                    onClick={() => toggle(w.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'var(--color-bg-5)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Minus size={14} color="#555" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          {/* Hidden section */}
          {hidden.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#A0A0AC', letterSpacing: '0.08em',
                textAlign: 'center', margin: '16px 0 10px',
              }}>
                СКРЫТЫЕ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hidden.map(w => (
                  <motion.div
                    key={w.id}
                    initial={false}
                    whileHover="hovered"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--color-bg-4)', borderRadius: 12, padding: '10px 12px',
                      border: '1.5px dashed #E0E0EA',
                    }}
                  >
                    <motion.div
                      variants={{ hovered: { x: -8 }, default: { x: 0 } }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    >
                      <WidgetIcon icon={w.icon} bg={w.bg} color={w.color} />
                    </motion.div>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--color-muted)' }}>{w.label}</span>
                    <button
                      onClick={() => toggle(w.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, border: 'none',
                        background: 'var(--color-purple-soft)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} color="#7B3FCC" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 12, border: '1.5px solid #E0E0EA',
                background: 'var(--color-bg-input)', fontSize: 14, fontWeight: 600, color: '#555', cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none',
                background: '#7B3FCC', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Готово
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
