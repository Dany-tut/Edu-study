import { textFadeStyle } from '../lib/textFades'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Search } from './icons/appIcons'
import type { Subject } from '../data/mockData'
import Tooltip from './Tooltip'

// Подсказка над таблеткой модуля — только там, где есть наведение (ПК, мышь).
// На касании (iPhone, iPad, Android) Tooltip всё равно мог всплыть по фокусу:
// после тапа и возврата назад WebKit отдаёт кнопке :focus-visible. Имя модуля
// и долги там и так видны на самой таблетке и в aria-label.
const CAN_HOVER = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches
const ModuleTip = CAN_HOVER
  ? Tooltip
  : ({ children }: { label: string; children: React.ReactElement<Record<string, unknown>> }) => children
import ScrollFade from './ScrollFade'
import { DROPDOWN_GLASS, dropdownSurface, dropdownRow, dropdownRowHover } from '../lib/dropdownStyle'
import { Z } from '../lib/layers'
import { useT, useTc } from '../lib/i18n'
import { isCourseModuleLocked } from '../lib/moduleAccess'
import { getDisplayLessonStatus } from '../lib/lessonStatus'

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
  return Math.round((lessons.filter(l => l.result ? l.result.passed : l.status === 'completed').length / lessons.length) * 100)
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
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  // Список живёт дольше open: после закрытия он ещё уходит CSS-анимацией и
  // снимается по её концу. framer-motion здесь не годится ни на вход, ни на
  // выход: его аппаратная анимация непрозрачности кончается раньше, чем
  // итог ляжет на элемент, — на входе мигал полупрозрачный кадр, на выходе
  // меню на кадр возвращалось целиком, пока React его не снимет.
  const [shownMenu, setShownMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; listHeight: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const active = subjects.find(s => s.id === activeId) ?? subjects[0]
  const many = subjects.length > 1

  useLayoutEffect(() => {
    if (!open) return
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(420, Math.max(320, r.width), window.innerWidth - 16)
    const aboveSpace = Math.max(0, r.top - 16)
    const belowSpace = Math.max(0, window.innerHeight - r.bottom - 16)
    const chrome = 14 + (subjects.length >= SEARCH_FROM ? 46 : 0)
    const desiredHeight = Math.min(360, subjects.length * 42 - 2) + chrome
    const above = desiredHeight > belowSpace && aboveSpace > belowSpace
    const available = above ? aboveSpace : belowSpace
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width,
      ...(above ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
      listHeight: Math.max(0, Math.min(360, available - chrome)),
    })
  }, [open, subjects.length])

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

  useLayoutEffect(() => {
    if (open) { setShownMenu(true); return }
    // Без анимации (reduced motion) animationend не придёт — снимаем сразу;
    // таймер — страховка, если вкладка спит и событие потерялось.
    if (reduceMotion) { setShownMenu(false); return }
    const id = window.setTimeout(() => setShownMenu(false), 400)
    return () => window.clearTimeout(id)
  }, [open, reduceMotion])

  if (!active) return null
  const q = query.trim().toLowerCase()
  const shown = q ? subjects.filter(s => tc(s.name).toLowerCase().includes(q)) : subjects

  return (
    <>
      <button data-hover="layer"
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
        <span style={{ ...TEXT_LIFT, minWidth: 0, overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap' }}>{tc(active.name)}</span>
        <span style={{ ...TEXT_LIFT, fontSize: 12, fontWeight: 500, color: 'var(--color-purple)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{coursePct(active)}%</span>
        {many && (
          <ChevronDown size={14} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        )}
      </button>

      {createPortal(
        <>
          {(open || shownMenu) && pos && (
            <div
              ref={menuRef}
              role="listbox"
              aria-hidden={open ? undefined : true}
              // Вход и уход — CSS-классами (index.css); уход держит opacity 0
              // (fill forwards) до самого снятия, поэтому вспышки нет.
              className={open ? 'iskra-dropdown-enter' : 'iskra-dropdown-leave'}
              onAnimationEnd={e => { if (!open && e.target === e.currentTarget) setShownMenu(false) }}
              style={{ position: 'fixed', zIndex: Z.dropdown, left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, ...dropdownSurface, borderRadius: 18, pointerEvents: open ? undefined : 'none' }}
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
              <ScrollFade maxHeight={pos.listHeight} bg={DROPDOWN_GLASS} overlayScrollbar>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {shown.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-3)' }}>{t('Ничего не найдено')}</div>
                  )}
                  {shown.map(s => {
                    const selected = s.id === active.id
                    const pct = coursePct(s)
                    return (
                      <button data-hover="layer"
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
            </div>
          )}
        </>,
        document.body,
      )}
    </>
  )
}

// ─── Модули ─────────────────────────────────────────────────────────────

type ModuleId = Subject['modules'][number]['id']

export function ModuleChain({ subject, activeId, onSelect, debtCounts, onOpenDebts }: {
  subject: Subject
  activeId: ModuleId | undefined
  onSelect: (id: ModuleId) => void
  debtCounts?: Readonly<Record<number, number>>
  onOpenDebts?: (id: ModuleId) => void
}) {
  const t = useT()
  const { tc } = useTc()
  const reduceMotion = useReducedMotion()
  const labelRefs = useRef(new Map<number, HTMLSpanElement>())
  const [labelWidths, setLabelWidths] = useState<Record<number, number>>({})
  useLayoutEffect(() => {
    let live = true
    const measure = () => {
      if (!live) return
      const widths = Object.fromEntries(Array.from(labelRefs.current, ([id, el]) => [id, el.getBoundingClientRect().width]))
      setLabelWidths(previous => Object.keys(widths).length === Object.keys(previous).length
        && Object.keys(widths).every(id => widths[Number(id)] === previous[Number(id)]) ? previous : widths)
    }
    measure()
    const observer = new ResizeObserver(measure)
    labelRefs.current.forEach(el => observer.observe(el))
    void document.fonts.ready.then(measure)
    return () => { live = false; observer.disconnect() }
  }, [subject.modules, tc])


  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {subject.modules.map((mod, i) => {
        const total = mod.lessons.length
        const done = mod.lessons.filter(l => l.result ? l.result.passed : l.status === 'completed').length
        const isDone = total > 0 && done === total
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const prev = i > 0 ? subject.modules[i - 1] : null
        const isLocked = isCourseModuleLocked(subject, i, lesson => getDisplayLessonStatus(lesson) !== 'locked')
        const isActive = mod.id === activeId
        const name = tc(mod.label) || t('Уроки')
        const num = i + 1
        const debts = debtCounts?.[mod.id] ?? 0
        const label = isLocked && prev
          ? `${num} · ${name} — ${t('откроется после')} «${tc(prev.label) || num - 1}»`
          : pct > 0 && !isDone ? `${num} · ${name} · ${pct}%` : `${num} · ${name}`
        const transition = { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] as const }

        return (
          <div key={mod.id}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: BAR_H, flexShrink: 0, marginRight: debts ? 10 : 0 }}>
            <ModuleTip label={debts ? `${label} · несданных работ: ${debts}` : label}>
              <motion.button data-hover="layer"
                type="button"
                data-module-tab={mod.id}
                aria-label={label}
                aria-pressed={isActive}
                disabled={isLocked}
                whileTap={isLocked || reduceMotion ? undefined : { opacity: 0.85 }}
                initial={false}
                animate={{ height: isActive ? BAR_H : DOT }}
                transition={transition}
                onClick={() => { if (!isLocked) onSelect(mod.id) }}
                style={{
                  ...(isActive ? ACTIVE_PILL : {}),
                  height: isActive ? BAR_H : DOT, padding: 0, borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  background: isActive ? ACTIVE_PILL.background : isDone ? 'var(--color-green-soft)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-border-glass)' : isDone ? 'transparent' : 'var(--color-text-4)'}`,
                  color: isDone ? 'var(--color-green-text)' : isLocked ? 'var(--color-muted)' : 'var(--color-text-2)',
                  opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'default' : 'pointer',
                }}
              >
                <motion.span initial={false} animate={{ width: isActive ? BAR_H - 2 : DOT - 2 }} transition={transition} style={{ height: 24, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? isDone ? 'var(--color-green-soft)' : 'var(--color-accent)' : 'transparent',
                    color: isActive && !isDone ? '#fff' : 'inherit', fontSize: 12, fontWeight: 700 }}>
                    {isDone ? <Check size={14} strokeWidth={2.8} /> : <span style={{ ...TEXT_LIFT, fontVariantNumeric: 'tabular-nums' }}>{num}</span>}
                  </span>
                </motion.span>
                <motion.span initial={false} animate={{ width: isActive ? (labelWidths[mod.id] ?? 'auto') : 0, opacity: isActive ? 1 : 0 }} transition={transition}
                  style={{ display: 'inline-flex', overflow: 'hidden', minWidth: 0 }} aria-hidden={!isActive}>
                  <span ref={el => { if (el) labelRefs.current.set(mod.id, el); else labelRefs.current.delete(mod.id) }} style={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 8, paddingLeft: debts ? 18 : 8, paddingRight: 14 }}>
                    <span style={{ ...TEXT_LIFT, fontSize: 13, fontWeight: 600, color: isDone ? 'var(--color-green-text)' : 'var(--color-text)' }}>{name}</span>
                    {pct > 0 && <span style={{ ...TEXT_LIFT, fontSize: 11, fontWeight: 500, color: isDone ? 'var(--color-green-text)' : 'var(--color-purple-text)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>}
                  </span>
                </motion.span>
              </motion.button>
            </ModuleTip>
            {/* Anchor to the number, independent of the expanding module title. */}
            {debts > 0 && <motion.button data-hover="layer" type="button" aria-label={`Модуль ${num}: ${debts} несданных работ`}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              onClick={() => onOpenDebts ? onOpenDebts(mod.id) : onSelect(mod.id)}
              style={{ position: 'absolute', top: -4, left: 20, zIndex: 1, border: 0, borderRadius: 999,
                minWidth: 20, height: 20, padding: '0 5px', background: 'var(--color-red-soft)', color: 'var(--color-red-text)',
                fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{debts}</motion.button>}
          </div>
        )
      })}
    </div>
  )
}
