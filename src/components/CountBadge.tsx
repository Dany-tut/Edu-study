import type { CSSProperties } from 'react'

/**
 * СЧЁТЧИК на иконке и во вкладке — один на всё приложение (круг 2).
 *
 * Было четыре разных: 16/17/18 px, шрифт 9/10/10.5, радиус 9 или 999, свой
 * красный хекс в шапке учителя. Теперь 17 × 17 (шире — капсулой), 10/800,
 * моноширинные цифры.
 *
 * Цифра поднята на 0.06em. Цифры SF сидят в круге ниже середины, как текст в
 * поле (см. GrowTextarea, TEXT_LIFT) — Дани заметил это на макете: «число
 * криво оптически, надо повыше». Подъём меньше, чем у строки текста (0.12em):
 * у цифр нет выносных элементов, их центр — середина заглавной высоты.
 *
 * Тон: accent — обычный (градиент), danger — требует внимания (проверка),
 * inverse — на уже фиолетовом фоне (активный пункт меню): белый кружок.
 * `ring` — цвет поверхности под счётчиком: кольцо отделяет его от иконки.
 */
export default function CountBadge({ count, tone = 'accent', ring, style }: {
  count: number
  tone?: 'accent' | 'danger' | 'inverse'
  ring?: string
  style?: CSSProperties
}) {
  if (!count || count <= 0) return null
  const bg = tone === 'danger' ? 'var(--btn-red-bg)' : tone === 'inverse' ? '#fff' : 'var(--grad-purple)'
  // На белом кружке цифра — литералом: var(--color-purple-text) в тёмной теме
  // светлеет до #DAD3FB и пропадает на белом.
  const color = tone === 'inverse' ? '#4F44B8' : '#fff'
  return (
    <span
      style={{
        minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color, fontSize: 10, fontWeight: 800, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        ...(ring ? { border: `1.5px solid ${ring}` } : {}),
        ...style,
      }}
    >
      <span style={{ position: 'relative', top: '-0.06em' }}>{count > 99 ? '99+' : count}</span>
    </span>
  )
}
