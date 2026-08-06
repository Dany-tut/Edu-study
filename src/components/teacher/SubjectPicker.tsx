import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import ScrollFade from '../ScrollFade'
import { DROPDOWN_GLASS, dropdownRing, dropdownRow, dropdownRowHover, dropdownSurface } from '../../lib/dropdownStyle'

// Adaptive subject selector — the single control behind every "pick a subject"
// surface. It changes SHAPE by option count so screens/grids never break as more
// subjects appear:
//   • 1 option   → a static label (nothing to switch)
//   • 2–3        → segmented pills in a row (flex, always fits)
//   • 4 and more → a fixed-width chevron button + popover list (never widens)
// Options must arrive already scoped (per teacher/subject) and display-ready
// (labels translated by the caller).

export type SubjectOption = { value: string; label: string; icon?: string }

const SEGMENTED_MAX = 3

export default function SubjectPicker({
  options,
  value,
  onChange,
  accent = 'var(--color-accent)',
  accentBg = 'var(--color-purple-soft)',
  activeColor = 'var(--color-purple-text)',
  idleBg = 'var(--color-bg-3)',
  idleColor = 'var(--color-muted)',
  size = 'md',
  ariaLabel = 'Предмет',
}: {
  options: SubjectOption[]
  value: string
  onChange: (value: string) => void
  accent?: string
  accentBg?: string
  activeColor?: string
  idleBg?: string
  idleColor?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  const pad = size === 'sm' ? '6px 0' : '7px 0'
  const fs = size === 'sm' ? 11 : 12

  if (options.length === 0) return null

  // 1 option — static label, nothing to switch.
  if (options.length === 1) {
    const only = options[0]
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: size === 'sm' ? '6px 11px' : '7px 12px',
        borderRadius: 10, background: accentBg, color: activeColor, fontSize: fs, fontWeight: 700, alignSelf: 'flex-start',
      }}>
        {only.icon && <span aria-hidden>{only.icon}</span>}
        {only.label}
      </div>
    )
  }

  // 2–3 options — segmented pills.
  if (options.length <= SEGMENTED_MAX) {
    return (
      <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 6 }}>
        {options.map(o => {
          const on = value === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={on}
              style={{
                flex: 1, padding: pad, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: fs,
                fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, minWidth: 0, background: on ? accentBg : idleBg, color: on ? activeColor : idleColor,
              }}>
              {o.icon && <span aria-hidden>{o.icon}</span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // 4+ options — chevron button + popover.
  return <SubjectDropdown {...{ options, value, onChange, accent, accentBg, activeColor, idleBg, idleColor, size, ariaLabel }} />
}

function SubjectDropdown({
  options, value, onChange, accent, accentBg, activeColor, idleBg, size, ariaLabel,
}: {
  options: SubjectOption[]; value: string; onChange: (v: string) => void
  accent: string; accentBg: string; activeColor: string; idleBg: string; idleColor: string
  size: 'sm' | 'md'; ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const current = options.find(o => o.value === value) ?? options[0]
  // Кегль тот же, что у соседних MultiSelectField, иначе строки в колонке
  // фильтров разной величины.
  const fs = size === 'sm' ? 11 : 13

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + 5, left: r.left, width: r.width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || popRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      {/* Скин один в один с MultiSelectField: пикер стоит с ним в одной колонке
          фильтров, и своя заливка (--color-bg) с постоянной рамкой читалась как
          поле другого рода — темнее соседей и в рамке, когда те безрамочные.
          Рамка прозрачная, а не отсутствует: иначе на открытии коробка прыгает. */}
      <button ref={btnRef} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        style={{
          width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8,
          padding: size === 'sm' ? '6px 9px' : '7px 11px', minHeight: size === 'sm' ? 32 : 38,
          borderRadius: 11, ...dropdownRing(open, accent), cursor: 'pointer',
          background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: fs, fontWeight: 700, fontFamily: 'inherit',
        }}>
        {current.icon && <span aria-hidden>{current.icon}</span>}
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.label}</span>
        <ChevronDown size={14} style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>
      {open && rect && createPortal(
        <div ref={popRef} role="listbox" style={{
          position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 3000,
          ...dropdownSurface,
        }}>
          <ScrollFade maxHeight={272} bg={DROPDOWN_GLASS} overlayScrollbar
            scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {options.map(o => {
            const on = o.value === value
            return (
              <button key={o.value} role="option" aria-selected={on}
                onClick={() => { onChange(o.value); setOpen(false) }}
                {...dropdownRowHover(on)}
                style={{
                  ...dropdownRow(on, { small: size === 'sm', accent: activeColor, accentBg }),
                  fontSize: fs,
                }}>
                {o.icon && <span aria-hidden>{o.icon}</span>}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                {on && <Check size={13} strokeWidth={2.5} style={{ color: activeColor, flexShrink: 0 }} />}
              </button>
            )
          })}
          </ScrollFade>
        </div>,
        document.body,
      )}
    </>
  )
}
