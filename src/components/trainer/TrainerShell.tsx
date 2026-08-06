// ─────────────────────────────────────────────────────────────────────────────
// Скелет тренажёра: рейл слева, строка управления сверху, содержимое справа
//
// ЗАЧЕМ. Банк заданий ЕГЭ давно устроен правильно — карточка-рейл с фильтрами,
// строка с поиском, статусами, видом и сортировкой, сетка результатов. Языковой
// тренажёр рос отдельно и накопил три разных способа показать список: ряд
// таблеток по центру для режимов, ряд чипсов под ними для фильтров чтения и
// самодельная колонка полок в наборах фраз. Одно и то же действие — «сузить
// выборку» — выглядело по-разному на трёх соседних вкладках.
//
// Здесь тот же скелет, вынесенный в переиспользуемый вид. Меняется только
// НАПОЛНЕНИЕ рейла: режим сам решает, какие карточки в него положить.
//
// ЧТО ЭТО НЕ ДЕЛАЕТ. Банк заданий на этот компонент пока НЕ переведён: его
// страница — под три тысячи строк с собственными StatusTabs/ViewTabs/
// SortDropdown, и переезд туда — отдельная работа со своим риском. Здесь
// повторена его визуальная логика, а не импортированы его куски. Когда банк
// поедет сюда, свои копии он потеряет — сверять придётся именно с этим файлом.
//
// ШИРИНА РЕЙЛА. 300 px, как в банке. На узком экране (< 1000) рейл уезжает
// НАД содержимым, а не сжимается: сжатая до 180 px карточка фильтров
// нечитаема, а телефону всё равно нужна своя вёрстка со шторками.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Check } from 'lucide-react'
import { useT } from '../../lib/i18n'

const RAIL_W = 300

/** Ширина, ниже которой рейл встаёт над содержимым. */
const BREAK = 1000

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAK,
  )
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < BREAK)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

// ─── Каркас ──────────────────────────────────────────────────────────────────

export default function TrainerShell({ rail, toolbar, children }: {
  /** Карточки рейла — обычно RailHero + RailCard'ы. */
  rail: React.ReactNode
  /** Строка управления над содержимым. */
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  const narrow = useNarrow()
  return (
    <div style={{
      width: '100%', maxWidth: 1280, margin: '0 auto', padding: '8px 20px 80px',
      display: 'flex', flexDirection: narrow ? 'column' : 'row',
      gap: narrow ? 16 : 22, alignItems: 'flex-start',
    }}>
      {/* sticky отдельной обёрткой, а не на самой карточке: у карточки есть
          собственный фон и тень, и position на ней ловит их в отдельный слой,
          из-за чего тень начинает мигать при остановке скролла. */}
      <div style={{
        position: narrow ? 'static' : 'sticky', top: 8,
        flexShrink: 0, width: narrow ? '100%' : RAIL_W,
      }}>
        <aside style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: 14, borderRadius: 24,
          background: 'rgba(var(--glass-rgb), 0.97)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          {rail}
        </aside>
      </div>

      <main style={{ flex: 1, minWidth: 0, width: narrow ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {toolbar}
        {children}
      </main>
    </div>
  )
}

// ─── Карточки рейла ──────────────────────────────────────────────────────────

/** Градиентная шапка рейла — предмет, переключатель языков, строчка контекста. */
export function RailHero({ title, subtitle, chips, palette }: {
  title: string
  subtitle?: string
  /** Переключатель — языки ученика. Один язык не рисуется: выбирать не из чего. */
  chips?: { id: string; label: string; on: boolean; onPick: () => void }[]
  palette: { accent: string; text: string; ring: string }
}) {
  return (
    <div style={{
      padding: 16, borderRadius: 16, color: '#fff',
      background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`,
      boxShadow: `0 18px 44px ${palette.ring}`,
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10, opacity: 0.95 }}>
        {title}
      </div>
      {chips && chips.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {chips.map(c => (
            <button
              key={c.id}
              onClick={c.onPick}
              style={{
                height: 28, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
                border: `1.5px solid ${c.on ? 'var(--color-border-glass)' : 'var(--color-border-medium)'}`,
                background: c.on ? 'rgba(255,255,255,0.22)' : 'transparent',
                color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                whiteSpace: 'nowrap', lineHeight: 1,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {subtitle && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>{subtitle}</p>
      )}
    </div>
  )
}

/** Обычная карточка рейла: заголовок с иконкой и содержимое столбиком. */
export function RailCard({ icon, title, accent, children, action }: {
  icon?: React.ReactNode
  title: string
  accent: string
  children: React.ReactNode
  /** Ссылка-действие в правом углу заголовка — «сбросить», «все». */
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 16,
      background: 'rgba(var(--glass-rgb), 0.94)',
      border: '1px solid var(--color-border-soft)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon && <span style={{ display: 'flex', color: accent }}>{icon}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11.5, fontWeight: 650, color: accent, padding: 0,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

/** Список режимов — вертикальный, со счётчиком справа. */
export function RailModes<T extends string>({ items, value, onChange, accent, soft }: {
  items: { id: T; label: string; count?: number; Icon?: React.ComponentType<{ size?: number }> }[]
  value: T
  onChange: (v: T) => void
  accent: string
  soft: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map(m => {
        const on = m.id === value
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', textAlign: 'left',
              background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 13.5, fontWeight: on ? 700 : 550,
            }}
          >
            {m.Icon && <m.Icon size={15} />}
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t(m.label)}
            </span>
            {m.count !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 700, color: on ? accent : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                {m.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Сегмент — выбор одного из немногих. Значение '' допустимо и означает «все».
 *
 * Отдельно от RailModes: тот всегда что-то выбран и живёт как навигация, а
 * сегмент — это фильтр, который можно снять повторным нажатием.
 */
export function RailSegment({ options, value, onChange, accent, soft, clearable = true }: {
  options: { value: string; label: string; badge?: number }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
  clearable?: boolean
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(o => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(on && clearable ? '' : o.value)}
            style={{
              flex: 1, minWidth: 0, padding: '8px 6px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              border: `1px solid ${on ? 'transparent' : 'var(--color-border-soft)'}`,
              background: on ? soft : 'var(--color-bg-input)',
              color: on ? accent : 'var(--color-muted)',
            }}
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(o.label)}</span>
            {o.badge !== undefined && o.badge > 0 && (
              <span style={{
                padding: '1px 6px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                background: on ? 'var(--color-bg-2)' : soft, color: accent, fontVariantNumeric: 'tabular-nums',
              }}>
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Список-выбор внутри карточки рейла: полки разговорника, словарик текста. */
export function RailList({ items, value, onChange, accent, soft }: {
  items: { id: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflowY: 'auto' }} className="no-scrollbar">
      {items.map(i => {
        const on = i.id === value
        return (
          <button
            key={i.id}
            onClick={() => onChange(i.id)}
            title={i.label}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8, width: '100%', textAlign: 'left',
              padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 12.5, fontWeight: on ? 700 : 550,
            }}
          >
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {i.label}
            </span>
            {i.hint && (
              <span style={{ fontSize: 11, color: on ? accent : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {i.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Тумблер настройки показа. */
export function RailToggle({ label, on, onChange, accent }: {
  label: string; on: boolean; onChange: (v: boolean) => void; accent: string
}) {
  const t = useT()
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        width: '100%', padding: '5px 0', border: 'none', background: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 550, color: 'var(--color-text-2)', textAlign: 'left',
      }}
      role="switch"
      aria-checked={on}
    >
      <span>{t(label)}</span>
      <span style={{
        position: 'relative', flexShrink: 0, width: 32, height: 18, borderRadius: 999,
        background: on ? accent : 'var(--color-border-medium)', transition: 'background .16s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .16s',
        }} />
      </span>
    </button>
  )
}

/** Строка «подпись — значение» в рейле: счётчики сессии. */
export function RailStat({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: 'good' | 'warn'
}) {
  const t = useT()
  const color = tone === 'good' ? 'var(--color-green-text)' : tone === 'warn' ? '#E0A22A' : 'var(--color-text)'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
      <span style={{ color: 'var(--color-text-2)' }}>{t(label)}</span>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

// ─── Строка управления ───────────────────────────────────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
      {children}
    </div>
  )
}

/** Поиск-таблетка: свёрнут до иконки, раскрывается по клику. Как в банке. */
export function SearchPill({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const wide = open || !!value
  return (
    <div
      onClick={() => { setOpen(true); ref.current?.focus() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.96)',
        border: `1px solid ${wide ? 'var(--color-accent, #7c3aed)' : 'var(--color-border-medium)'}`,
        width: wide ? 250 : 112, transition: 'width .22s cubic-bezier(.4,0,.2,1), border-color .15s',
        overflow: 'hidden', cursor: wide ? 'text' : 'pointer', flexShrink: 0,
      }}
    >
      <Search size={14} style={{ color: wide ? 'var(--color-text)' : 'var(--color-text-3)', flexShrink: 0 }} />
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!value) setOpen(false) }}
        placeholder={wide ? (placeholder ?? t('Поиск')) : t('Поиск')}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit',
          width: wide ? 'auto' : 0, pointerEvents: wide ? 'auto' : 'none',
        }}
      />
      {value && (
        <button
          onClick={e => { e.stopPropagation(); onChange('') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
        >×</button>
      )}
    </div>
  )
}

/** Статусы выборки: Все / … . Общий словарь на все режимы. */
export function StatusTabs({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const t = useT()
  return (
    <div style={{
      display: 'flex', padding: 3, borderRadius: 999,
      background: 'rgba(var(--glass-rgb), 0.9)', border: '1px solid var(--color-border-medium)',
    }}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 550,
              background: on ? 'var(--color-bg-3)' : 'transparent',
              color: on ? 'var(--color-text)' : 'var(--color-text-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {t(o.label)}
          </button>
        )
      })}
    </div>
  )
}

/** Кнопка-таблетка строки: вид, избранное, назад. */
export function ToolButton({ children, on, onClick, accent }: {
  children: React.ReactNode; on?: boolean; onClick: () => void; accent?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 999,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 550,
        border: `1px solid ${on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-border-medium)'}`,
        background: 'rgba(var(--glass-rgb), 0.88)',
        color: on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-text-2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** Сортировка — выпадающий список, портал поверх всего. */
export function SortMenu({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (menu.current?.contains(e.target as Node)) return
      if (btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const scroll = () => setOpen(false)
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 172) })
          setOpen(o => !o)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 999,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 550,
          border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.88)',
          color: 'var(--color-text-2)', whiteSpace: 'nowrap',
        }}
      >
        {t(current?.label ?? '')}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
          <ChevronDown size={13} />
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
                padding: 6, borderRadius: 14,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
              }}
            >
              {options.map(o => {
                const on = o.value === value
                return (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 550,
                      background: 'transparent', color: on ? 'var(--color-text)' : 'var(--color-text-2)',
                    }}
                  >
                    <span style={{ flex: 1 }}>{t(o.label)}</span>
                    {on && <Check size={14} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/** Счётчик, прижатый вправо. */
export function ToolCount({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

// ─── Единица содержимого ─────────────────────────────────────────────────────

/**
 * Карточка сетки — общая геометрия для текста, стопки, записи и задания.
 *
 * `stack` дорисовывает две подложки сзади: так плашка читается как пачка
 * карточек, а не как ещё одна кнопка перехода.
 */
export function Tile({ children, onClick, accent, stack }: {
  children: React.ReactNode
  onClick?: () => void
  accent: string
  stack?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ position: 'relative', paddingTop: stack ? 8 : 0, paddingRight: stack ? 8 : 0 }}>
      {stack && [2, 1].map(k => (
        <div
          key={k}
          aria-hidden
          style={{
            position: 'absolute', inset: 0, left: k * 4, top: 8 - k * 4, right: 8 - k * 4, bottom: k * 4,
            borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
            opacity: k === 1 ? 0.85 : 0.5, pointerEvents: 'none',
            transform: hover ? `translate(${k * 2}px, ${-k * 2}px)` : 'none', transition: 'transform .16s',
          }}
        />
      ))}
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', width: '100%', height: '100%', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 7,
          padding: '13px 15px', borderRadius: 16, cursor: onClick ? 'pointer' : 'default',
          fontFamily: 'inherit', background: 'var(--color-bg-2)',
          border: `1px solid ${hover && onClick ? accent : 'var(--color-border)'}`,
          transition: 'border-color .16s',
        }}
      >
        {children}
      </button>
    </div>
  )
}

/** Сетка карточек. */
export function TileGrid({ min = 210, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 }}>
      {children}
    </div>
  )
}

/** Полоска прогресса внутри карточки. */
export function TileMeter({ value }: { value: number }) {
  return (
    <span style={{ display: 'block', height: 3, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
      <span style={{
        display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
        borderRadius: 999, background: 'var(--color-green-accent)',
      }} />
    </span>
  )
}

/** Плашка-подпись в углу карточки: уровень, тип, длительность. */
export function TileChip({ children, tone, accent, soft }: {
  children: React.ReactNode
  tone?: 'accent' | 'mute'
  accent?: string
  soft?: string
}) {
  const isAccent = tone === 'accent'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap',
      background: isAccent ? (soft ?? 'var(--color-bg-3)') : 'var(--color-bg-3)',
      color: isAccent ? (accent ?? 'var(--color-text-2)') : 'var(--color-muted)',
    }}>
      {children}
    </span>
  )
}

/** Пустая выборка. */
export function Empty({ text }: { text: string }) {
  const t = useT()
  return (
    <div style={{
      padding: '34px 22px', borderRadius: 18, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
      fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)',
    }}>
      {t(text)}
    </div>
  )
}
