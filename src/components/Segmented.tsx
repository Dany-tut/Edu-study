import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from './icons/appIcons'
import Tooltip from './Tooltip'
import CountBadge, { COUNT_BADGE_H } from './CountBadge'

/**
 * ПЕРЕКЛЮЧАТЕЛЬ-СЕГМЕНТ — три роли, у каждой своя спецификация (круг 2).
 *
 * Дани: «это разные переключатели» — сливать их в один нельзя.
 *  - mode   — режим экрана (Урок / Запись / Домашки…). Тинт: выбранный — мягкая
 *             фиолетовая подложка и фиолетовый текст, чтобы главное разделение
 *             в курсе было видно сразу. Дорожка 12 / 3, кнопка 9.
 *  - filter — фильтр списка (Все / Просрочено…). Выбранный — белая плашка с
 *             тенью, ширина кнопки по тексту. Капсула 999 / 3 / 999.
 *  - narrow — длинные названия (темы, разделы). Равные ячейки; не влезшее
 *             тает фейдом у правого края (не «…»), чтобы ряд не растягивался
 *             в ленту на телефоне и ПК; полное название — в подсказке.
 * Скругления концентричны: внутренний радиус = внешний − отступ дорожки.
 */
// Не влезло — текст уходит в прозрачность у правого края, без «…» (Дани:
// «давай не ... а фейд»). Подпись занимает всю ячейку: короткая стоит по
// центру и под фейд не попадает, длинная начинается слева и тает справа.
const NARROW_FADE = 'linear-gradient(90deg, #000 calc(100% - 18px), transparent)'
const NARROW_LABEL: CSSProperties = {
  flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center',
  WebkitMaskImage: NARROW_FADE, maskImage: NARROW_FADE,
}

const BOLD_RESERVE: CSSProperties = { display: 'inline-grid', justifyItems: 'center' }

export interface SegmentItem<T extends string> {
  id: T
  label: ReactNode
  /** Полное название для подсказки (narrow), если label — не строка. */
  title?: string
  icon?: LucideIcon
  /** Счётчик внутри кнопки после подписи (концепт «Вкладыш»). */
  count?: number
  countTone?: 'accent' | 'danger'
}

// Высота кнопки — 8 + 13 × 1.2 + 8. Счётчик в неё вписан без роста высоты
// (отрицательные поля), а правый отступ кнопки равен зазору над и под ним.
const ITEM_H = 16 + 13 * 1.2
const BADGE_GAP = Math.round((ITEM_H - COUNT_BADGE_H) / 2)
const BADGE_PULL = -(COUNT_BADGE_H - 13 * 1.2) / 2

export default function Segmented<T extends string>({ variant, items, value, onChange, cellWidth = 120, style }: {
  variant: 'mode' | 'filter' | 'narrow'
  items: SegmentItem<T>[]
  value: T
  onChange: (id: T) => void
  /** Ширина ячейки у narrow. */
  cellWidth?: number
  style?: CSSProperties
}) {
  const mode = variant === 'mode'
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', gap: 2, padding: 4, maxWidth: '100%',
        background: 'var(--color-bg-3)', borderRadius: mode ? 12 : 999,
        ...style,
      }}
    >
      {items.map(it => {
        const on = it.id === value
        const Icon = it.icon
        const btn = (
          <button data-hover="layer"
            key={it.id}
            type="button" role="tab" aria-selected={on}
            onClick={() => onChange(it.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: it.count ? `8px ${BADGE_GAP}px 8px 14px` : '8px 14px', borderRadius: mode ? 9 : 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600, lineHeight: 1.2, whiteSpace: 'nowrap',
              background: on ? (mode ? 'var(--color-purple-soft)' : 'var(--color-surface)') : 'transparent',
              color: on ? (mode ? 'var(--color-purple-text)' : 'var(--color-text)') : 'var(--color-text-3)',
              boxShadow: on && !mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.15s, color 0.15s',
              ...(variant === 'narrow' ? { width: cellWidth, minWidth: 0, flexShrink: 1 } : { flexShrink: 0 }),
            }}
          >
            {Icon && <Icon size={14} />}
            {variant === 'narrow'
              ? <span style={NARROW_LABEL}>{it.label}</span>
              // Выбранная подпись жирнее — ширина под жирную копию занята
              // заранее, иначе кнопка и соседи сдвигались на 1–2 px при клике.
              : <span style={BOLD_RESERVE}>
                <span style={{ gridArea: '1 / 1' }}>{it.label}</span>
                <span aria-hidden style={{ gridArea: '1 / 1', fontWeight: 700, visibility: 'hidden' }}>{it.label}</span>
              </span>}
            {!!it.count && (
              <CountBadge
                count={it.count} tone={it.countTone ?? 'accent'}
                // Выбранный режим уже на мягкой фиолетовой подложке — там
                // фиолетовый счётчик плотнее, иначе он сливается с кнопкой.
                style={{ marginBlock: BADGE_PULL, ...(on && mode && it.countTone !== 'danger' ? { background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)' } : {}) }}
              />
            )}
          </button>
        )
        const full = it.title ?? (typeof it.label === 'string' ? it.label : undefined)
        return variant === 'narrow' && full ? <Tooltip key={it.id} label={full}>{btn}</Tooltip> : btn
      })}
    </div>
  )
}
