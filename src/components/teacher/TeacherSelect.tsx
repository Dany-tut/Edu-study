import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react'
import ScrollFade from '../ScrollFade'

export type TeacherSelectOption = string | { value: string; label: string }

const norm = (o: TeacherSelectOption) => (typeof o === 'string' ? { value: o, label: o } : o)

const baseTrigger: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: 'none',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8, textAlign: 'left',
}

export default function TeacherSelect({
  value, options, onChange, placeholder, triggerStyle, small = false,
  accent = 'var(--color-purple-text)', accentBg = 'var(--color-purple-soft)',
  onAddOption, onDeleteOption, clearable = true,
}: {
  value: string
  options: TeacherSelectOption[]
  onChange: (v: string) => void
  placeholder?: string
  triggerStyle?: React.CSSProperties
  small?: boolean
  accent?: string
  accentBg?: string
  /** When false, the trigger never shows the × clear button (for required fields). */
  clearable?: boolean
  /** When provided, the dropdown grows an "add option" row + per-row delete. */
  onAddOption?: (label: string) => void
  onDeleteOption?: (value: string) => void
}) {
  const editable = !!onAddOption
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const [hoverDel, setHoverDel] = useState<string | null>(null)
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
    const left = Math.min(r.left, window.innerWidth - r.width - 8)
    setPos({ top: r.bottom + 5, bottom: window.innerHeight - r.top + 5, left, width: r.width, up })
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const closeDropdown = () => { setOpen(false); setQuery(''); setAdding(false); setDraft('') }

  const commitAdd = () => {
    const v = draft.trim()
    if (v && onAddOption) { onAddOption(v); onChange(v) }
    setAdding(false); setDraft(''); closeDropdown()
  }

  const handleTriggerClick = () => {
    // Plain toggle — never wipes the current selection. Clearing is the × button's job.
    if (open) closeDropdown()
    else openDropdown()
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
          ...(open ? {} : {}),
        }}
      >
        {open && searchable ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder ?? ''}
            onClick={e => { if (!query) { e.stopPropagation(); closeDropdown() } }}
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
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            {isEmpty ? (placeholder ?? '') : current!.label}
          </span>
        )}

        {!isEmpty && clearable ? (
          <button
            type="button"
            onMouseDown={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
          >×</button>
        ) : (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-3)' }}
          >
            <ChevronDown size={small ? 11 : 13} strokeWidth={2.2} />
          </motion.span>
        )}
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
                padding: 6, overflow: 'hidden',
              }}
            >
              {editable && (
                adding ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                    padding: small ? '5px 8px' : '6px 10px', borderRadius: 9,
                    border: `1.5px solid ${accent}`, background: 'var(--color-bg-input)',
                  }}>
                    <input
                      ref={addInputRef}
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitAdd() }
                        if (e.key === 'Escape') { e.preventDefault(); setAdding(false); setDraft('') }
                      }}
                      placeholder="Название…"
                      style={{
                        flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                        fontSize: small ? 11 : 13, color: 'var(--color-text)', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); commitAdd() }}
                      style={{ display: 'flex', background: accentBg, border: 'none', borderRadius: 7, padding: 4, cursor: 'pointer', color: accent, flexShrink: 0 }}
                    >
                      <Check size={small ? 12 : 14} strokeWidth={2.6} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAdding(true); setTimeout(() => addInputRef.current?.focus(), 20) }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4,
                      padding: small ? '6px 9px' : '8px 11px', borderRadius: 9,
                      border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                      fontSize: small ? 11 : 13, fontWeight: 600, fontFamily: 'inherit',
                      background: 'transparent', color: accent, transition: 'background 0.12s',
                    }}
                  >
                    <Plus size={small ? 12 : 14} strokeWidth={2.6} /> Добавить
                  </button>
                )
              )}
              <ScrollFade maxHeight={220} bg="rgba(var(--glass-rgb), 0.96)" overlayScrollbar>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '8px 11px', fontSize: 12, color: 'var(--color-text-3)' }}>Ничего не найдено</div>
                  ) : filtered.map(o => {
                    const selected = o.value === value
                    const showDel = editable && hoverDel === o.value
                    return (
                      <div
                        key={o.value || '∅'}
                        onClick={() => { onChange(o.value); closeDropdown() }}
                        style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: small ? '6px 9px' : '8px 11px', borderRadius: 9,
                          cursor: 'pointer', textAlign: 'left',
                          fontSize: small ? 11 : 13, fontWeight: selected ? 650 : 500,
                          fontFamily: 'inherit',
                          background: selected ? accentBg : 'transparent',
                          color: selected ? accent : 'var(--color-text)',
                          transition: 'background 0.12s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-5)' }}
                        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; setHoverDel(p => p === o.value ? null : p) }}
                      >
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {o.label}
                        </span>
                        {selected && !showDel && <Check size={small ? 11 : 13} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                        {editable && onDeleteOption && (
                          <>
                            {/* Right 1/3 hover zone — reveals the trash. Clearing is
                                handled by the row's onMouseLeave so moving onto the
                                trash button itself doesn't make it vanish. */}
                            <div
                              onMouseEnter={() => setHoverDel(o.value)}
                              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '33%' }}
                            />
                            <AnimatePresence>
                              {showDel && (
                                <motion.button
                                  type="button"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.12 }}
                                  onMouseEnter={() => setHoverDel(o.value)}
                                  onClick={e => { e.stopPropagation(); onDeleteOption(o.value); setHoverDel(null); if (selected) onChange('') }}
                                  style={{
                                    // Out of flow so revealing it never grows the row height.
                                    position: 'absolute', top: 0, bottom: 0, right: small ? 6 : 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'none', border: 'none', padding: 0, margin: 0,
                                    cursor: 'pointer', color: 'var(--color-peach-text)', zIndex: 1,
                                  }}
                                >
                                  <span style={{ display: 'flex', background: 'var(--color-peach-soft)', borderRadius: 7, padding: 4 }}>
                                    <Trash2 size={small ? 12 : 14} strokeWidth={2.2} />
                                  </span>
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </>
                        )}
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
