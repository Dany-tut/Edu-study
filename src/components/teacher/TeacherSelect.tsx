import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export type TeacherSelectOption = string | { value: string; label: string }

const norm = (o: TeacherSelectOption) => (typeof o === 'string' ? { value: o, label: o } : o)

const baseTrigger: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, borderWidth: 1.5, borderStyle: 'solid', borderColor: 'var(--color-border-medium)',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8, textAlign: 'left',
}

export default function TeacherSelect({
  value, options, onChange, placeholder, triggerStyle, small = false,
  accent = 'var(--color-purple-text)', accentBg = 'var(--color-purple-soft)',
}: {
  value: string
  options: TeacherSelectOption[]
  onChange: (v: string) => void
  placeholder?: string
  triggerStyle?: React.CSSProperties
  small?: boolean
  accent?: string
  accentBg?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; width: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const opts = options.map(norm)
  const current = opts.find(o => o.value === value)
  const isEmpty = !current || current.value === ''
  const shownLabel = current ? current.label : (placeholder ?? '')

  const toggle = () => {
    if (open) { setOpen(false); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const itemH = small ? 28 : 33
    const estH = Math.min(opts.length * itemH + 12, 276)
    const up = r.bottom + estH + 12 > window.innerHeight && r.top - estH - 12 > 0
    const menuW = Math.max(r.width, 300)
    const left = Math.min(r.left, window.innerWidth - menuW - 8)
    setPos({
      top: r.bottom + 5,
      bottom: window.innerHeight - r.top + 5,
      left, width: r.width, up,
    })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          ...baseTrigger,
          ...triggerStyle,
          ...(open ? { borderColor: 'var(--color-border-strong)' } : null),
        }}
      >
        <span style={{
          flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: isEmpty && placeholder !== undefined ? 'var(--color-text-3)' : undefined,
        }}>
          {shownLabel}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-3)' }}
        >
          <ChevronDown size={small ? 11 : 13} strokeWidth={2.2} />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              className="no-scrollbar"
              initial={{ scale: 0.92, opacity: 0, y: pos.up ? 6 : -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: pos.up ? 6 : -6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }}
              style={{
                position: 'fixed', zIndex: 2000,
                left: pos.left, width: pos.width,
                ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
                transformOrigin: pos.up ? 'bottom left' : 'top left',
                background: 'rgba(var(--glass-rgb), 0.96)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid var(--color-border-glass)',
                borderRadius: 14,
                boxShadow: 'var(--shadow-dropdown)',
                padding: 6, maxHeight: 276, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              {opts.map(o => {
                const selected = o.value === value
                const muted = o.value === ''
                return (
                  <button
                    key={o.value || '∅'}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)' }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: small ? '6px 9px' : '8px 11px', borderRadius: 9,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: small ? 11 : 13, fontWeight: selected ? 650 : 500,
                      fontFamily: 'inherit',
                      background: selected ? accentBg : 'transparent',
                      color: selected ? accent : muted ? 'var(--color-text-3)' : 'var(--color-text)',
                      transition: 'background 0.12s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {o.label}
                    </span>
                    {selected && <Check size={small ? 11 : 13} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
