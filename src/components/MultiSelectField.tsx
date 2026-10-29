import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X, Plus } from 'lucide-react'
import ScrollFade from './ScrollFade'
import { useT } from '../lib/i18n'
import { DROPDOWN_GLASS, dropdownRing, dropdownRow, dropdownRowHover, dropdownSurface } from '../lib/dropdownStyle'
import { useScrollLock } from '../lib/useScrollLock'

// ── Multi-select combobox ────────────────────────────────────────────────────
// Telegram-style trigger: selected chips live INSIDE the field, and the search
// box is the inline text input at the end of the chips. While open the field
// expands and wraps all chips; collapsed it shrinks to one line (first chip +N).
// Shared by the student trainer (BankTrainer) and the teacher trainers
// (TrainerBank / homework).
//
// ПОДПИСЬ ПЕРЕВОДИТСЯ, ЗНАЧЕНИЕ — НЕТ. `options` и `values` это ключи данных:
// по ним идёт сравнение с разметкой материала («Кафе и ресторан» стоит в
// поле topic текста). Показывать их как есть нельзя — в английском интерфейсе
// фильтр остаётся русским; переводить сами значения нельзя тем более — тогда
// сравнение перестанет совпадать и фильтр молча вернёт пустой список. Поэтому
// наружу отдаётся ключ, а на экран — t(ключ), который сам падает обратно в
// русский, если перевода нет.
export default function MultiSelectField({
  label, options, values, onChange,
  accent = 'var(--color-purple-text)', accentBg = 'var(--color-purple-soft)', small = false,
  lockScroll = false, creatable = false, createLabel = 'Добавить', field,
}: {
  label: string
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
  accent?: string
  accentBg?: string
  small?: boolean
  /**
   * Пока список открыт, фон не скроллится (lib/useScrollLock).
   *
   * Включено в тренажёре ученика: там фильтры стоят в рейле рядом с
   * переключателем предмета, и один дропдаун не может вести себя иначе, чем
   * соседний. В формах кабинета учителя осталось прежнее поведение — фон едет,
   * список закрывается (см. onScroll ниже), потому что коробка позиционируется
   * один раз и за уехавшим полем не следит.
   */
  lockScroll?: boolean
  /**
   * Можно добавить своё значение: набранное, которого нет в списке, встаёт
   * последней строкой «Добавить „…“» (и по Enter). Свои значения не
   * вычищаются, когда список вариантов меняется.
   */
  creatable?: boolean
  /** Подпись строки «Добавить „…“» — ключ перевода. */
  createLabel?: string
  /**
   * Поле стоит в форме среди обычных полей ввода (регистрация, профиль), а не в
   * колонке фильтров: коробка, рамка покоя и кегль — как у соседних инпутов.
   */
  field?: { padding: string; borderRadius: number; background: string; restBorder: string; borderWidth?: number; fontSize: number; minHeight: number }
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; width: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Ищем и по исходной строке, и по переводу: подпись в списке переведена
  // (см. t(o) ниже), а значение осталось русским — без второй проверки
  // англоязычный ученик набирал бы то, что видит, и ничего не находил.
  const shown = query
    ? options.filter(o => {
        const q = query.toLowerCase()
        return o.toLowerCase().includes(q) || t(o).toLowerCase().includes(q)
      })
    : options
  const typed = query.trim()
  const canCreate = creatable && !!typed
    && !options.some(o => o.toLowerCase() === typed.toLowerCase() || t(o).toLowerCase() === typed.toLowerCase())
    && !values.some(v => v.toLowerCase() === typed.toLowerCase())

  // Keep selection clean if the option set narrows (cascade) below current picks.
  useEffect(() => {
    if (!values.length || creatable) return
    const valid = values.filter(v => options.includes(v))
    if (valid.length !== values.length) onChange(valid)
  }, [options]) // eslint-disable-line react-hooks/exhaustive-deps

  // Position the dropdown under the (possibly expanded) field. Recompute on open
  // and whenever the field height can change — chips added/removed, query typed.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const estH = Math.min((shown.length + (canCreate ? 1 : 0)) * (small ? 30 : 34) + 16, 248)
    const up = r.bottom + estH + 12 > window.innerHeight && r.top - estH - 12 > 0
    const left = Math.min(r.left, window.innerWidth - r.width - 8)
    setPos({ top: r.bottom + 5, bottom: window.innerHeight - r.top + 5, left, width: r.width, up })
  }, [open, values.length, query, shown.length, small, canCreate])

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

  function create() {
    if (!canCreate) return
    onChange([...values, typed])
    setQuery('')
    inputRef.current?.focus()
  }

  useScrollLock(lockScroll && open, menuRef)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    // resize приходит с target === window, а window — не Node: contains() на нём
    // бросал «Failed to execute 'contains' on 'Node'». Меню на ресайзе и так
    // положено закрыть, поэтому не-Node просто считаем «клик мимо».
    const onScroll = (e: Event) => {
      const tgt = e.target instanceof Node ? e.target : null
      if (tgt && menuRef.current?.contains(tgt)) return
      close()
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

  const isEmpty = values.length === 0
  const fontSize = field?.fontSize ?? (small ? 11 : 13)
  const chipFont = field ? 12 : small ? 10 : 11

  const chip = (v: string) => (
    <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', padding: field ? '3px 8px' : '2px 7px', borderRadius: field ? 8 : 7, background: accentBg, color: accent, fontSize: chipFont, fontWeight: 700 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(v)}</span>
      <span onClick={e => { e.stopPropagation(); toggle(v) }} style={{ display: 'flex', cursor: 'pointer', opacity: 0.7 }}><X size={small ? 9 : 11} strokeWidth={2.6} /></span>
    </span>
  )

  return (
    <>
      <motion.div
        ref={btnRef}
        layout
        transition={{ layout: { type: 'spring', stiffness: 600, damping: 42, mass: 0.7 } }}
        onClick={() => { if (!open) openDropdown(); else if (!query && isEmpty) close(); else inputRef.current?.focus() }}
        style={{
          width: '100%', boxSizing: 'border-box', padding: field?.padding ?? (small ? '6px 9px' : '7px 11px'),
          borderRadius: field?.borderRadius ?? 11,
          ...(field
            ? { border: `${field.borderWidth ?? 1}px solid ${open ? accent : field.restBorder}`, transition: 'border-color 0.15s' }
            : dropdownRing(open, accent)),
          background: field?.background ?? 'var(--color-bg-input)', cursor: 'text',
          display: 'flex', alignItems: 'center', gap: 6, minHeight: field?.minHeight ?? (small ? 32 : 38),
        }}
      >
        {open ? (
          // Expanded: input first so it stays on the same line as chips.
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* В форме выбранное — первым, курсор за ним, как в поле ввода:
                справа от длинной строки ввода плашки читались как чужие. */}
            {field && values.map(chip)}
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              className="mobile-input-16"
              placeholder={isEmpty ? label : ''}
              onClick={e => { if (open && !query && isEmpty) { e.stopPropagation(); close() } }}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !query && values.length) onChange(values.slice(0, -1))
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (shown.length === 1 && !values.includes(shown[0])) toggle(shown[0])
                  else create()
                }
              }}
              // ВЫСОТА СТРОКИ ПРИБИТА, А НЕ УНАСЛЕДОВАНА.
              //
              // Поле раскрывается подменой подписи на поле ввода, и без этого
              // подмена меняла высоту всей коробки: на телефоне у input'а
              // насильно 16px (.mobile-input-16 — иначе iOS зумит страницу
              // при фокусе), а межстрочный он брал у body (24px), и открытое
              // поле оказывалось на 4px выше закрытого. В шторке, которая
              // растёт снизу вверх, эти 4px подбрасывали ВЕСЬ её контент —
              // заголовок уезжал вверх ровно в момент тапа по полю.
              //
              // Двадцать пикселей при кегле 16 — свободная строка, и вся
              // коробка остаётся на своих 38.
              style={{ flex: 1, minWidth: 80, border: 'none', outline: 'none', background: 'transparent', fontSize, lineHeight: '20px', height: 20, color: 'var(--color-text)', fontFamily: 'inherit', padding: 0 }}
            />
            {!field && values.map(chip)}
          </div>
        ) : isEmpty ? (
          <span style={{ flex: 1, minWidth: 0, fontSize, color: field ? 'var(--color-muted)' : 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        ) : field ? (
          // В форме выбранного немного и прятать его за «+N» незачем — всё видно.
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {values.map(chip)}
          </div>
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
                ...dropdownSurface,
              }}
            >
              <ScrollFade maxHeight={224} bg={DROPDOWN_GLASS} overlayScrollbar>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {shown.length === 0 && !canCreate ? (
                    <div style={{ padding: '8px 11px', fontSize: 12, color: 'var(--color-text-3)' }}>{t('Ничего не найдено')}</div>
                  ) : shown.map(o => {
                    const selected = values.includes(o)
                    return (
                      <div key={o} onClick={() => toggle(o)}
                        style={{ ...dropdownRow(selected, { small, accent, accentBg }), fontSize }}
                        {...dropdownRowHover(selected)}
                      >
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>{t(o)}</span>
                        {selected && <Check size={13} strokeWidth={2.5} style={{ flexShrink: 0, color: accent }} />}
                      </div>
                    )
                  })}
                  {canCreate && (
                    <div onClick={create}
                      style={{ ...dropdownRow(false, { small, accent, accentBg }), fontSize, color: 'var(--color-text-2)' }}
                      {...dropdownRowHover(false)}
                    >
                      <Plus size={13} strokeWidth={2.4} style={{ flexShrink: 0, color: accent }} />
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>{t(createLabel)} «{typed}»</span>
                    </div>
                  )}
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
