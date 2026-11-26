import { Star } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import './pinStar.css'

/**
 * Звезда «в избранное» на углу аватара ученика (Figma «Искра», стр. 25).
 * Закреплённому — всегда залитая. Незакреплённому: на ПК с мышью появляется
 * при наведении на аватар, на касании (iPad, телефоны) видна контуром всегда —
 * правило в pinStar.css по (hover: hover), не по ширине.
 *
 * `inButton` — рисовать как span role=button: строка-кнопка не может
 * содержать вложенный <button>.
 */
export default function PinStar({ pinned, onToggle, size = 18, inButton = false, name }: {
  pinned: boolean
  onToggle: () => void
  size?: number
  inButton?: boolean
  name: string
}) {
  const t = useT()
  const label = `${pinned ? t('Убрать из избранного') : t('В избранное')}: ${name}`
  const props = {
    className: 'pin-star',
    'data-pinned': pinned || undefined,
    'aria-label': label,
    'aria-pressed': pinned,
    title: pinned ? t('Убрать из избранного') : t('В избранное'),
    style: { width: size, height: size },
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); onToggle() },
  }
  const icon = <Star size={size - 6} strokeWidth={2.2} fill={pinned ? 'var(--color-amber)' : undefined} aria-hidden />
  return inButton
    ? <span role="button" tabIndex={0} {...props}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle() } }}>{icon}</span>
    : <button type="button" {...props}>{icon}</button>
}
