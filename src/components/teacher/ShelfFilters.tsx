// ─────────────────────────────────────────────────────────────────────────────
// Строка фильтров витрины Конструктора
//
// ОДИН РЯД ТАБЛЕТОК НА ВСЕ ВКЛАДКИ. Курсы, виджеты и материалы отбираются
// по-разному, но выглядит и ведёт себя это одинаково: слева сортировка, за ней
// фасеты («все языки», «все уровни», «все ученики»), в конце сегмент и счётчик
// справа. Пока каждая вкладка писала свой дропдаун, они расходились по мелочам
// — ширине текста, поведению на потерю фокуса, — и ряд переставал читаться как
// один контрол.
//
// ЗАЧЕМ ОТДЕЛЬНЫМ ФАЙЛОМ. Вкладка, собранная своим компонентом («Материалы» →
// CardGroupsManager), до контролов внутри страницы не дотягивалась и осталась
// бы без фильтров вовсе — что и произошло.
//
// АКЦЕНТ — ПАРАМЕТР. Цвет отмеченной строки берётся из вкладки: у курсов
// зелёный, у виджетов синий, у материалов персиковый. Всё остальное — общее.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, type ReactNode, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown } from 'lucide-react'
import { useT } from '../../lib/i18n'
import ScrollFade from '../ScrollFade'

/**
 * Стекло таблеток шапки конструктора.
 *
 * Под прилипшей шапкой нет подложки (сплошная заливка поперёк списка читается
 * как прямоугольник чужого цвета), поэтому карточки едут прямо под кнопками —
 * и без размытия сквозь них просвечивали названия курсов. Размытие + плотный
 * фон дают каждой таблетке собственное стекло, как у плавающего топбара.
 */
export const PILL_GLASS: CSSProperties = {
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
}

/**
 * Разделитель в списке опций фасета: строка-маркер, которую дропдаун рисует
 * тонкой чертой вместо кнопки. Так список предметов делится на «все» → языки →
 * остальные, не заводя второй тип данных для опций.
 */
export const FACET_SEP = '\u0000sep'

const pillStyle = (open: boolean, extra?: CSSProperties): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
  background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.92)', ...PILL_GLASS,
  border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
  fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit',
  ...extra,
})

const menuStyle: CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 170,
  background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid var(--color-border-glass)', borderRadius: 14,
  boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5,
}

const rowStyle = (on: boolean, soft: string): CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
  background: on ? soft : 'transparent',
  fontSize: 13, fontWeight: on ? 700 : 400, color: 'var(--color-text)',
  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
})

const Caret = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Tick = ({ accent }: { accent: string }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const softOf = (accent: string) => `color-mix(in srgb, ${accent} 11%, transparent)`

/** Сортировка списка. Опции — пары [значение, подпись]; подписи переводятся тут. */
export function SortDropdown<V extends string>({ value, options, accent, minWidth = 88, onChange }: {
  value: V
  options: [V, string][]
  accent: string
  minWidth?: number
  onChange: (v: V) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const soft = softOf(accent)
  const label = t(options.find(([v]) => v === value)?.[1] ?? options[0][1])
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)} style={pillStyle(open)}>
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ minWidth, textAlign: 'left' }}>{label}</span>
        <Caret open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={{ ...menuStyle, minWidth: 160 }}>
            {options.map(([val, lbl]) => (
              <button key={val} onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
                style={rowStyle(value === val, soft)}
                onMouseEnter={e => { e.currentTarget.style.background = soft }}
                onMouseLeave={e => { e.currentTarget.style.background = value === val ? soft : 'transparent' }}>
                {t(lbl)}
                {value === val && <Tick accent={accent} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Фасет списка (предмет, язык, уровень, ученик). Опции приходят снаружи и
 * зависят от данных: если фильтровать не по чему (один язык, ни одного
 * заполненного уровня) — кнопка не рисуется вообще, чтобы не занимать строку
 * мёртвым контролом.
 */
export function FacetDropdown({ value, options, allLabel, icon, accent, minWidth = 92, iconGap = 6, labels, searchable, onChange }: {
  value: string
  options: string[]
  allLabel: string
  icon: ReactNode
  accent: string
  /**
   * Подписи для опций, если значение — не то, что видит глаз (у фильтра по
   * ученику значение это ключ человека, а в кнопке должно стоять имя).
   */
  labels?: Record<string, string>
  /** Строка поиска над списком: у учеников опций десятки, глазами не найти. */
  searchable?: boolean
  minWidth?: number
  /**
   * Отступ иконка→текст. Дефолт годится для эмодзи и иконок с полями, но у
   * стрелочных lucide-иконок штрих доходит до края бокса, и при gap 6 остриё
   * почти касается буквы — таким иконкам ставим 9.
   */
  iconGap?: number
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  if (options.filter(o => o !== FACET_SEP).length < 2) return null
  const label = (v: string) => labels?.[v] ?? v
  const soft = softOf(accent)
  // Группы разделены — значит и «все» отделяем от них, иначе первая группа
  // слипается с общей строкой.
  const grouped = options.includes(FACET_SEP)
  const q = query.trim().toLowerCase()
  // Под поиском разделители групп теряют смысл — они делят полный список.
  const shown = q ? options.filter(o => o !== FACET_SEP && label(o).toLowerCase().includes(q)) : options
  const rows = q ? shown : ['', ...(grouped ? [FACET_SEP] : []), ...shown]
  return (
    // Закрытие ловим на обёртке, а не на кнопке: со строкой поиска фокус уходит
    // с кнопки внутрь меню, и «потерял фокус — закрылись» захлопывало список
    // сразу после открытия.
    <div style={{ position: 'relative' }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setOpen(false); setQuery('') } }}>
      <button onClick={() => { setOpen(o => !o); setQuery('') }}
        // Выбранное значение помечаем только жирным текстом: своя яркая рамка у
        // заполненного фасета выбивалась из ряда таблеток шапки.
        style={pillStyle(open, { gap: iconGap, fontWeight: value ? 700 : 600 })}>
        <span style={{ display: 'flex', color: 'var(--color-text-3)' }}>{icon}</span>
        <span style={{ minWidth, textAlign: 'left' }}>{value ? label(value) : allLabel}</span>
        <Caret open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={menuStyle}>
            {searchable && (
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                placeholder={allLabel}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', marginBottom: 4,
                  borderRadius: 9, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)',
                  fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none' }} />
            )}
            <ScrollFade maxHeight={310} bg="rgba(var(--glass-rgb), 0.97)" overlayScrollbar>
              {rows.map((val, i) => val === FACET_SEP ? (
                <div key={`sep${i}`} style={{ height: 1, margin: '5px 8px', background: 'var(--color-border)' }} />
              ) : (
                <button key={val || '__all'} onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false); setQuery('') }}
                  style={rowStyle(value === val, soft)}
                  onMouseEnter={e => { e.currentTarget.style.background = soft }}
                  onMouseLeave={e => { e.currentTarget.style.background = value === val ? soft : 'transparent' }}>
                  {val ? label(val) : allLabel}
                  {value === val && <Tick accent={accent} />}
                </button>
              ))}
            </ScrollFade>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Сегмент в конце ряда: «Все / Черновик / Опубликован» у курсов, «Все / Мои /
 * Готовые» у материалов. Каждой опции можно дать свой цвет активного состояния
 * — им отбор и читается, а не подписью.
 *
 * Подпись рисуется поверх невидимой жирной копии себя: без этого выбор опции
 * менял ширину кнопки и ряд дёргался.
 */
export function SegmentFilter<V extends string>({ value, options, onChange }: {
  value: V
  options: [V, string, string?][]
  onChange: (v: V) => void
}) {
  return (
    <div style={{ display: 'flex', padding: 2, borderRadius: 999, background: 'var(--color-bg-3)', ...PILL_GLASS, gap: 2 }}>
      {options.map(([val, lbl, color]) => {
        const active = value === val
        return (
          <button key={val || 'all'} onClick={() => onChange(val)}
            style={{ padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: active ? 700 : 500,
              background: active ? 'var(--color-surface)' : 'transparent',
              color: active ? (color ?? 'var(--color-text)') : 'var(--color-text-3)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{lbl}</span>
              <span style={{ gridArea: '1 / 1' }}>{lbl}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Счётчик в конце ряда фильтров: сколько карточек осталось после отбора. */
export function ShelfCount({ children }: { children: ReactNode }) {
  return <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{children}</span>
}
