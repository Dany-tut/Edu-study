import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { Subject } from '../data/mockData'
import Tooltip from './Tooltip'
import ScrollFade from './ScrollFade'
import { DROPDOWN_GLASS, dropdownSurface, dropdownRow, dropdownRowHover } from '../lib/dropdownStyle'
import { Z } from '../lib/layers'
import { useT, useTc } from '../lib/i18n'

/**
 * ПЕРЕКЛЮЧАТЕЛЬ КУРСА И МОДУЛЯ над треком главной — одна строка 36 px.
 *
 * Было два ряда пилюль (курсы, под ними модули) — 180 px от карточек до трека,
 * и при десяти курсах по десять модулей половина вкладок уезжала за фейд.
 * Стало (концепт B, Figma «Искра» → «Курсы и модули · концепты»): курс — один
 * селект со списком, модули — цепочка кружков с номерами, текущий раскрыт с
 * названием. Высота строки не зависит от числа курсов и модулей.
 */

export const BAR_H = 36
const DOT = 30

const GLASS_PILL: CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.72)',
  backdropFilter: 'var(--blur-thin)',
  WebkitBackdropFilter: 'var(--blur-thin)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-pill)',
}

// Активная плашка модуля — тот же тинт поверх стекла, что был у бегающей пилюли.
const ACTIVE_PILL: CSSProperties = {
  background: 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.55)',
  backdropFilter: 'var(--blur-glass)',
  WebkitBackdropFilter: 'var(--blur-glass)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-xs)',
}

// Подпись в таблетке — к оптическому центру. Полный подъём −0.12em перебирал:
// замер (центр заглавных против центра таблетки) давал 1,1–1,25 px выше
// середины, как у кнопки в алерте. −0.04em ставит их в центр с точностью 0,2 px.
const TEXT_LIFT: CSSProperties = { position: 'relative', top: '-0.04em' }

export function coursePct(s: Subject): number {
  const lessons = s.modules.flatMap(m => m.lessons)
  if (lessons.length === 0) return 0
  return Math.round((lessons.filter(l => l.status === 'completed').length / lessons.length) * 100)
}

// ─── Курс ───────────────────────────────────────────────────────────────

/** Строк в списке больше этого — сверху появляется поиск. */
const SEARCH_FROM = 8

export function CourseSelect({ subjects, activeId, onSelect }: {
  subjects: Subject[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const t = useT()
  const { tc } = useTc()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const active = subjects.find(s => s.id === activeId) ?? subjects[0]
  const many = subjects.length > 1

  useLayoutEffect(() => {
    if (!open) return
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(420, Math.max(320, r.width))
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), top: r.bottom + 8, width })
  }, [open])

  // Закрываем по клику мимо, Esc, прокрутке и ресайзу — список стоит fixed и
  // от кнопки на прокрутке отъехал бы.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node
      if (menuRef.current?.contains(el) || btnRef.current?.contains(el)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) close() }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  useEffect(() => { if (!open) setQuery('') }, [open])

  if (!active) return null
  const q = query.trim().toLowerCase()
  const shown = q ? subjects.filter(s => tc(s.name).toLowerCase().includes(q)) : subjects

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => many && setOpen(o => !o)}
        aria-haspopup={many ? 'listbox' : undefined}
        aria-expanded={many ? open : undefined}
        style={{
          ...GLASS_PILL,
          // Рамка целиком, не borderColor поверх border: React при закрытии
          // снимает longhand и роняет цвет шорткода в дефолтный серый.
          border: `1px solid ${open ? 'var(--color-accent)' : 'var(--color-border-glass)'}`,
          height: BAR_H, padding: many ? '0 12px 0 16px' : '0 16px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: 340,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
          cursor: many ? 'pointer' : 'default', transition: 'border-color 0.15s',
        }}
      >
        <span style={{ ...TEXT_LIFT, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc(active.name)}</span>
        <span style={{ ...TEXT_LIFT, fontSize: 12, fontWeight: 500, color: 'var(--color-purple)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{coursePct(active)}%</span>
        {many && (
          <ChevronDown size={14} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              role="listbox"
              initial={{ scale: 0.96, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 30, mass: 0.7 }}
              style={{ position: 'fixed', zIndex: Z.dropdown, left: pos.left, top: pos.top, width: pos.width, transformOrigin: 'top left', ...dropdownSurface, borderRadius: 18 }}
            >
              {subjects.length >= SEARCH_FROM && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', margin: '2px 2px 6px', borderRadius: 12, background: 'var(--color-bg-input)', cursor: 'text' }}>
                  <Search size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('Найти курс')}
                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--color-text)', padding: 0 }}
                  />
                </label>
              )}
              <ScrollFade maxHeight={360} bg={DROPDOWN_GLASS} overlayScrollbar>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {shown.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-3)' }}>{t('Ничего не найдено')}</div>
                  )}
                  {shown.map(s => {
                    const selected = s.id === active.id
                    const pct = coursePct(s)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => { setOpen(false); if (!selected) onSelect(s.id) }}
                        style={{ ...dropdownRow(selected, { accent: 'var(--color-purple-text)', accentBg: 'var(--color-purple-soft)' }), gap: 10, minHeight: 40, fontSize: 14 }}
                        {...dropdownRowHover(selected)}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>{tc(s.name)}</span>
                        <span style={{ width: 44, height: 4, borderRadius: 2, background: 'var(--color-bg-5)', overflow: 'hidden', flexShrink: 0 }}>
                          <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--color-accent)' }} />
                        </span>
                        <span style={{ width: 34, textAlign: 'right', fontSize: 12, fontWeight: 500, color: selected ? 'inherit' : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pct}%</span>
                      </button>
                    )
                  })}
                </div>
              </ScrollFade>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

// ─── Модули ─────────────────────────────────────────────────────────────

type ModuleId = Subject['modules'][number]['id']

export function ModuleChain({ subject, activeId, onSelect }: {
  subject: Subject
  activeId: ModuleId | undefined
  onSelect: (id: ModuleId) => void
}) {
  const t = useT()
  const { tc } = useTc()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {subject.modules.map((mod, i) => {
        const total = mod.lessons.length
        const done = mod.lessons.filter(l => l.status === 'completed').length
        const isDone = total > 0 && done === total
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        // Модуль закрыт, пока не пройден последний урок предыдущего.
        const prev = i > 0 ? subject.modules[i - 1] : null
        const isLocked = prev != null && prev.lessons.length > 0
          && prev.lessons[prev.lessons.length - 1].status !== 'completed'
        const isActive = mod.id === activeId
        const name = tc(mod.label) || t('Уроки')
        const num = i + 1

        if (isActive) {
          return (
            <div
              key={mod.id}
              data-module-tab={mod.id}
              style={{
                ...ACTIVE_PILL, height: BAR_H, padding: '0 14px 0 5px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? 'var(--color-green-soft)' : 'var(--color-accent)',
                color: isDone ? 'var(--color-green-text)' : '#fff', fontSize: 12, fontWeight: 700,
              }}>
                {isDone ? <Check size={13} strokeWidth={2.8} /> : <span style={{ ...TEXT_LIFT, fontVariantNumeric: 'tabular-nums' }}>{num}</span>}
              </span>
              <span style={{ ...TEXT_LIFT, fontSize: 13, fontWeight: 600, color: isDone ? 'var(--color-green-text)' : 'var(--color-text)' }}>{name}</span>
              {pct > 0 && (
                <span style={{ ...TEXT_LIFT, fontSize: 11, fontWeight: 500, color: isDone ? 'var(--color-green-text)' : 'var(--color-purple-text)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              )}
            </div>
          )
        }

        const label = isLocked && prev
          ? `${num} · ${name} — ${t('откроется после')} «${tc(prev.label) || num - 1}»`
          : pct > 0 && !isDone ? `${num} · ${name} · ${pct}%` : `${num} · ${name}`

        return (
          <Tooltip key={mod.id} label={label}>
            <motion.button
              type="button"
              data-module-tab={mod.id}
              whileHover={isLocked ? undefined : { scale: 1.08 }}
              whileTap={isLocked ? undefined : { scale: 0.94 }}
              onClick={() => { if (!isLocked) onSelect(mod.id) }}
              style={{
                width: DOT, height: DOT, borderRadius: DOT / 2, flexShrink: 0, padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                background: isDone ? 'var(--color-green-soft)' : 'transparent',
                border: isDone ? '1.5px solid transparent' : '1.5px solid var(--color-text-4)',
                color: isDone ? 'var(--color-green-text)' : isLocked ? 'var(--color-muted)' : 'var(--color-text-2)',
                opacity: isLocked ? 0.6 : 1,
                cursor: isLocked ? 'default' : 'pointer',
              }}
            >
              {isDone
                ? <Check size={14} strokeWidth={2.8} />
                : <span style={{ ...TEXT_LIFT, fontVariantNumeric: 'tabular-nums' }}>{num}</span>}
            </motion.button>
          </Tooltip>
        )
      })}
    </div>
  )
}
