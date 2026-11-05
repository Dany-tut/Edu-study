import type { CSSProperties } from 'react'

/**
 * СЧЁТЧИК — один на всё приложение (концепт «Вкладыш», 05.11.2026).
 *
 * Мягкая таблетка 18 px: бледная заливка тона и цифра тёмным оттенком того же
 * тона. Без градиента, тени и белого кольца — Дани не нравился тёмно-красный
 * кружок, налезающий на угол фиолетовой вкладки.
 *
 * Во вкладке и в пункте меню счётчик стоит ВНУТРИ кнопки после слова, а
 * правый отступ кнопки равен зазору сверху и снизу от таблетки:
 * `countBadgeInset(высота кнопки)`. На иконке (док, колокольчик, свёрнутая
 * панель) — в углу; там передайте `ring` — цвет поверхности под счётчиком:
 * заливка ложится на него и становится непрозрачной (в тёмной теме мягкие
 * цвета полупрозрачные, иначе сквозь счётчик просвечивает иконка), а кольцо
 * того же цвета отделяет его от иконки.
 *
 * Цифра поднята на 0.06em: цифры SF сидят ниже середины (см. GrowTextarea,
 * TEXT_LIFT) — «число криво оптически, надо повыше».
 *
 * Тон: accent — обычный, danger — требует внимания (проверка, ошибки),
 * inverse — на уже фиолетовом фоне (активная вкладка): полупрозрачный белый.
 */
export const COUNT_BADGE_H = 18

/** Правый отступ кнопки со счётчиком внутри: как зазор сверху и снизу. */
export const countBadgeInset = (buttonHeight: number) => (buttonHeight - COUNT_BADGE_H) / 2

const TONES = {
  accent:  { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple-text)' },
  danger:  { bg: 'var(--color-red-soft)',    fg: 'var(--color-red-text)' },
  inverse: { bg: 'rgba(255,255,255,0.24)',   fg: '#fff' },
} as const

export default function CountBadge({ count, tone = 'accent', ring, style, className }: {
  count: number
  className?: string
  tone?: keyof typeof TONES
  ring?: string
  style?: CSSProperties
}) {
  if (!count || count <= 0) return null
  const { bg, fg } = TONES[tone]
  return (
    <span
      className={className}
      style={{
        minWidth: 20, height: COUNT_BADGE_H, padding: '0 6px', boxSizing: 'border-box', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: ring ? `linear-gradient(${bg}, ${bg}), ${ring}` : bg,
        color: fg, fontSize: 11, fontWeight: 700, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
        ...style,
      }}
    >
      <span style={{ position: 'relative', top: '-0.06em' }}>{count > 99 ? '99+' : count}</span>
    </span>
  )
}
