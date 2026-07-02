import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Plus, RotateCcw, Check } from 'lucide-react'
import { useDeskStore } from '../../store/deskStore'
import type { DeskConfig } from '../../lib/useDeskLayouts'

type Props = {
  config: DeskConfig
  onSetActive: (id: string) => void
  onAddDesk: () => void
  onResetDesk: (id: string) => void
  onAddWidget?: () => void
}

// Matches the topbar glass card style
const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-pill)',
}

export default function DeskSwitcher({ config, onSetActive, onAddDesk, onResetDesk, onAddWidget }: Props) {
  const editMode = useDeskStore(s => s.editMode)
  const setEditMode = useDeskStore(s => s.setEditMode)
  const [hovered, setHovered] = useState(false)
  const [pencilHovered, setPencilHovered] = useState(false)
  const pencilRef = useRef<HTMLDivElement>(null)

  // Collapse the pill automatically when leaving edit mode
  useEffect(() => {
    if (!editMode) {
      setHovered(false)
      setPencilHovered(false)
    }
  }, [editMode])

  const { desks, activeDeskId } = config
  const activeDesk = desks.find(d => d.id === activeDeskId) ?? desks[0]

  // ── EDIT MODE BAR ──────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 500, damping: 36 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px',
          background: 'rgba(var(--glass-rgb), 0.96)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--color-border-glass)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}
      >
        {/* Desk tabs */}
        <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {desks.map(desk => (
            <button
              key={desk.id}
              onClick={() => onSetActive(desk.id)}
              style={{
                padding: '6px 16px', borderRadius: 100,
                border: 'none',
                background: desk.id === activeDeskId ? 'var(--color-purple-soft)' : 'rgba(var(--glass-rgb), 0.6)',
                color: desk.id === activeDeskId ? 'var(--color-text)' : 'var(--color-muted)',
                fontSize: 13, fontWeight: desk.id === activeDeskId ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                outline: desk.id === activeDeskId ? '1.5px solid var(--color-accent)' : 'none',
                outlineOffset: -1,
              }}
            >
              {desk.name}
            </button>
          ))}

          <button
            onClick={onAddDesk}
            style={{
              padding: '6px 12px', borderRadius: 100,
              border: '1.5px dashed var(--color-border-medium)',
              background: 'transparent', color: 'var(--color-muted)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={12} />
            Стол
          </button>
        </div>

        {onAddWidget && (
          <button
            onClick={onAddWidget}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 100,
              border: 'none',
              background: 'rgba(var(--glass-rgb), 0.6)',
              color: 'var(--color-text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              flexShrink: 0,
              outline: '1px solid var(--color-border-medium)',
            }}
          >
            <Plus size={14} />
            Виджет
          </button>
        )}

        <button
          onClick={() => { onResetDesk(activeDeskId); setEditMode(false) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 100,
            border: '1px solid var(--color-border-medium)',
            background: 'transparent', color: 'var(--color-muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <RotateCcw size={13} />
          Сбросить
        </button>

        <button
          onClick={() => setEditMode(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 18px', borderRadius: 100,
            border: 'none',
            background: 'var(--grad-purple)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(120,106,215,0.4)',
            flexShrink: 0,
          }}
        >
          <Check size={14} />
          Готово
        </button>
      </motion.div>
    )
  }

  // ── NORMAL: DOTS → PILL ON HOVER ──────────────────────────────────────────
  // Position: fixed so it floats above all page content; z-index 95 = above topbar (90)
  return (
    <div
      style={{
        position: 'fixed',
        top: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 95,
        // Generous hit area so the hover state is easy to trigger
        padding: '6px 16px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPencilHovered(false) }}
    >
      <AnimatePresence mode="wait">
        {hovered ? (
          <motion.div
            key="pill"
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -6 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.55 }}
            style={{
              ...GLASS_STYLE,
              display: 'flex', alignItems: 'center',
              borderRadius: 100,
              padding: '6px 6px',
              gap: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {desks.map((desk) => (
              <div key={desk.id} style={{ display: 'contents' }}>
                <button
                  onClick={() => onSetActive(desk.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 100,
                    border: 'none',
                    background: desk.id === activeDeskId ? 'var(--color-purple-soft)' : 'transparent',
                    color: desk.id === activeDeskId ? 'var(--color-text)' : 'var(--color-text-2)',
                    fontSize: 13.5, fontWeight: desk.id === activeDeskId ? 600 : 500,
                    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => {
                    if (desk.id !== activeDeskId) {
                      e.currentTarget.style.background = 'rgba(var(--glass-rgb), 0.6)'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (desk.id !== activeDeskId) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--color-text-2)'
                    }
                  }}
                >
                  {desk.name}
                </button>
              </div>
            ))}

            {/* Pencil zone — separator + button only appear when hovering this area */}
            <div
              ref={pencilRef}
              style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={() => setPencilHovered(true)}
              onMouseLeave={() => setPencilHovered(false)}
            >
              <motion.div
                animate={{ opacity: pencilHovered ? 1 : 0, width: pencilHovered ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  height: 16, borderRadius: 1,
                  background: 'var(--color-border-medium)',
                  flexShrink: 0, margin: pencilHovered ? '0 4px' : '0',
                  overflow: 'hidden',
                }}
              />
              <motion.button
                animate={{ opacity: pencilHovered ? 1 : 0, width: pencilHovered ? 32 : 8 }}
                transition={{ duration: 0.15 }}
                onClick={() => setEditMode(true)}
                title="Редактировать столы"
                style={{
                  height: 32, borderRadius: 100,
                  border: 'none',
                  background: pencilHovered ? 'rgba(var(--glass-rgb), 0.5)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-muted)',
                  overflow: 'hidden', flexShrink: 0,
                  pointerEvents: pencilHovered ? 'auto' : 'none',
                }}
              >
                <Pencil size={13} strokeWidth={2} />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 20 }}
          >
            {desks.map(desk => (
              <motion.div
                key={desk.id}
                onClick={() => onSetActive(desk.id)}
                style={{
                  height: 6, borderRadius: 100, cursor: 'pointer',
                  background: desk.id === activeDeskId ? 'var(--color-accent)' : 'var(--color-border-medium)',
                }}
                animate={{ width: desk.id === activeDeskId ? 22 : 6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
