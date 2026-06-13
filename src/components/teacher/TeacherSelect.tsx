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
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; width: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const opts = options.map(norm).filter(o => o.value !== '')
  const current = opts.find(o => o.value === value)
  const isEmpty = !current
  const searchable = opts.length > 4

  const filtered = (searchable && query)
    ? opts.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : opts

  const openDropdown = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const itemH = small ? 28 : 33
    const estH = Math.min(opts.length * itemH + 12, 232)
    const up = r.bottom + estH + 12 > window.innerHeight && r.top - estH - 12 > 0
    const menuW = Math.max(r.width, 300)
    const left = Math.min(r.left, window.innerWidth - menuW - 8)
    setPos({ top: r.bottom + 5, bottom: window.innerHeight - r.top + 5, left, width: menuW, up })
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const closeDropdown = () => { setOpen(false); setQuery('') }

  const handleTriggerClick = () => {
    if (open) { closeDropdown(); return }
    openDropdown()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    closeDropdown()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown() }
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      closeDropdown()
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
      <div
        ref={btnRef}
        onClick={handleTriggerClick}
        style={{
          ...baseTrigger,
          ...triggerStyle,
          cursor: 'text',
          ...(open ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}22` } : {}),
        }}
      >
        {open && searchable ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={current ? current.label : (placeholder ?? '')}
            onClick={e => { if (open) { closeDropdown(); e.stopPropagation() } }}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: small ? 11 : 13, color: 'var(--color-text)', fontFamily: 'inherit',
              cursor: 'text',
            }}
          />
        ) : (
          <span style={{
            flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: isEmpty ? 'var(--color-text-3)' : undefined,
            fontWeight: isEmpty ? 400 : 600,
            cursor: 'pointer',
          }}>
            {isEmpty ? (placeholder ?? '') : current!.label}
          </span>
        )}

        {!isEmpty && !open && (
          <button
            type="button"
            onMouseDown={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
          >×</button>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-3)' }}
        >
          <ChevronDown size={small ? 11 : 13} strokeWidth={2.2} />
        </motion.span>
      </div>

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
                padding: 6,
                display: 'flex', flexDirection: 'column', gap: 2,
                maxHeight: 232, overflowY: 'auto',
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: '8px 11px', fontSize: 12, color: 'var(--color-text-3)' }}>Ничего не найдено</div>
              ) : filtered.map(o => {
                const selected = o.value === value
                return (
                  <button
                    key={o.value || '∅'}
                    type="button"
                    onClick={() => { onChange(o.value); closeDropdown() }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: small ? '6px 9px' : '8px 11px', borderRadius: 9,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: small ? 11 : 13, fontWeight: selected ? 650 : 500,
                      fontFamily: 'inherit',
                      background: selected ? accentBg : 'transparent',
                      color: selected ? accent : 'var(--color-text)',
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
