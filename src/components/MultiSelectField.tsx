import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X } from 'lucide-react'
import ScrollFade from './ScrollFade'

// ── Multi-select combobox ────────────────────────────────────────────────────
// Telegram-style trigger: selected chips live INSIDE the field, and the search
// box is the inline text input at the end of the chips. While open the field
// expands and wraps all chips; collapsed it shrinks to one line (first chip +N).
// Shared by the student trainer (TaskBankPage) and the teacher trainers
// (TrainerBank / homework).
export default function MultiSelectField({
  label, options, values, onChange,
  accent = 'var(--color-purple-text)', accentBg = 'var(--color-purple-soft)', small = false,
}: {
  label: string
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
  accent?: string
  accentBg?: string
  small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; width: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const shown = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  // Keep selection clean if the option set narrows (cascade) below current picks.
  useEffect(() => {
    if (!values.length) return
    const valid = values.filter(v => options.includes(v))
    if (valid.length !== values.length) onChange(valid)
  }, [options]) // eslint-disable-line react-hooks/exhaustive-deps

  // Position the dropdown under the (possibly expanded) field. Recompute on open
  // and whenever the field height can change — chips added/removed, query typed.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const estH = Math.min(shown.length * (small ? 30 : 34) + 16, 248)
    const up = r.bottom + estH + 12 > window.innerHeight && r.top - estH - 12 > 0
    const left = Math.min(r.left, window.innerWidth - r.width - 8)
    setPos({ top: r.bottom + 5, bottom: window.innerHeight - r.top + 5, left, width: r.width, up })
  }, [open, values.length, query, shown.length, small])

  const openDropdown = () => {
    setOpen(true); setQuery('')
    setTimeout(() => inputRef.current?.focus(), 30)
  }
  const close = () => { setOpen(false); setQuery('') }

  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt])
    // Clear the search after a pick so the next one doesn't need manual erasing.
    setQuery('')
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onScroll = (e: Event) => { if (menuRef.current?.contains(e.target as Node)) return; close() }
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

  const isEmpty = values.length === 0
  const fontSize = small ? 11 : 13
  const chipFont = small ? 10 : 11

  const chip = (v: string) => (
    <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', padding: '2px 7px', borderRadius: 7, background: accentBg, color: accent, fontSize: chipFont, fontWeight: 700 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
      <span onClick={e => { e.stopPropagation(); toggle(v) }} style={{ display: 'flex', cursor: 'pointer', opacity: 0.7 }}><X size={small ? 9 : 11} strokeWidth={2.6} /></span>
    </span>
  )

  return (
    <>
      <motion.div
        ref={btnRef}
        layout
        transition={{ layout: { type: 'spring', stiffness: 600, damping: 42, mass: 0.7 } }}
        onClick={() => { if (!open) openDropdown(); else inputRef.current?.focus() }}
        style={{
          width: '100%', boxSizing: 'border-box', padding: small ? '6px 9px' : '7px 11px',
          borderRadius: 11, border: 'none',
          background: 'var(--color-bg-input)', cursor: 'text',
          display: 'flex', alignItems: 'center', gap: 6, minHeight: small ? 32 : 38,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {open ? (
          // Expanded: input first so it stays on the same line as chips.
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={isEmpty ? label : ''}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Backspace' && !query && values.length) onChange(values.slice(0, -1)) }}
              style={{ flex: 1, minWidth: 80, border: 'none', outline: 'none', background: 'transparent', fontSize, color: 'var(--color-text)', fontFamily: 'inherit', padding: '2px 0' }}
            />
            {values.map(chip)}
          </div>
        ) : isEmpty ? (
          <span style={{ flex: 1, minWidth: 0, fontSize, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        ) : (
          // Collapsed: one line — first chip + "+N".
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
            {chip(values[0])}
            {values.length > 1 && (
              <span style={{ padding: '2px 7px', borderRadius: 7, background: 'var(--color-bg-5)', color: 'var(--color-muted)', fontSize: chipFont, fontWeight: 700, flexShrink: 0 }}>+{values.length - 1}</span>
            )}
          </div>
        )}
        {!isEmpty ? (
          <button type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange([]); if (open) inputRef.current?.focus() }}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: '0 2px', flexShrink: 0 }}>
            <X size={13} strokeWidth={2.2} />
          </button>
        ) : (
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-3)' }}>
            <ChevronDown size={small ? 11 : 13} strokeWidth={2.2} />
          </motion.span>
        )}
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              initial={{ scale: 0.92, opacity: 0, y: pos.up ? 6 : -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: pos.up ? 6 : -6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }}
              style={{
                position: 'fixed', zIndex: 2000, left: pos.left, width: pos.width,
                ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
                transformOrigin: pos.up ? 'bottom left' : 'top left',
                background: 'rgba(var(--glass-rgb), 0.96)',
                backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid var(--color-border-glass)', borderRadius: 14,
                boxShadow: 'var(--shadow-dropdown)', padding: 6,
              }}
            >
              <ScrollFade maxHeight={224} bg="rgba(var(--glass-rgb), 0.96)" overlayScrollbar>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {shown.length === 0 ? (
                    <div style={{ padding: '8px 11px', fontSize: 12, color: 'var(--color-text-3)' }}>Ничего не найдено</div>
                  ) : shown.map(o => {
                    const selected = values.includes(o)
                    return (
                      <div key={o} onClick={() => toggle(o)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: small ? '6px 10px' : '8px 12px', borderRadius: 9,
                          cursor: 'pointer', fontSize, fontWeight: selected ? 650 : 500, fontFamily: 'inherit',
                          background: selected ? accentBg : 'transparent', color: selected ? accent : 'var(--color-text)',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-5)' }}
                        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>{o}</span>
                        {selected && <Check size={small ? 13 : 15} strokeWidth={2.6} style={{ flexShrink: 0, color: accent }} />}
                      </div>
                    )
                  })}
                </div>
              </ScrollFade>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
