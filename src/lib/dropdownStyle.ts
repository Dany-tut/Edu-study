import type { CSSProperties, MouseEvent } from 'react'

// Общий скин выпадающих списков кабинета. Дропдаунов три вида — одиночный
// (TeacherSelect), мультивыбор (MultiSelectField) и предметный (SubjectPicker);
// стоят они бок о бок в одной колонке фильтров, поэтому коробка, строка и
// поведение поля на открытии должны совпадать до пикселя.

/** Заливка стекла — её же надо передавать в ScrollFade, иначе градиент чужой. */
export const DROPDOWN_GLASS = 'rgba(var(--glass-rgb), 0.96)'

/** Коробка списка (позиционирование — на стороне вызывающего). */
export const dropdownSurface: CSSProperties = {
  background: DROPDOWN_GLASS,
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  borderRadius: 14,
  boxShadow: 'var(--shadow-dropdown)',
  padding: 6,
  overflow: 'hidden',
}

/**
 * Рамка поля-триггера: прозрачная в покое, акцентная на открытии. Именно
 * рамка, а не её отсутствие — иначе коробка прыгает на 2px при открытии.
 * Поле должно быть box-sizing: border-box.
 */
export const dropdownRing = (open: boolean, accent: string): CSSProperties => ({
  border: `1px solid ${open ? accent : 'transparent'}`,
  transition: 'border-color 0.15s',
})

/** Строка списка (без hover — он вешается обработчиками, см. dropdownRowHover). */
export const dropdownRow = (
  selected: boolean,
  { small = false, accent, accentBg }: { small?: boolean; accent: string; accentBg: string },
): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: small ? '6px 9px' : '8px 11px', borderRadius: 9,
  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
  fontSize: small ? 11 : 13, fontWeight: selected ? 650 : 500, fontFamily: 'inherit',
  background: selected ? accentBg : 'transparent',
  color: selected ? accent : 'var(--color-text)',
  transition: 'background 0.12s',
})

/** Подсветка строки под курсором — выбранную не трогаем, у неё своя заливка. */
export const dropdownRowHover = (selected: boolean) => ({
  onMouseEnter: (e: MouseEvent<HTMLElement>) => {
    if (!selected) e.currentTarget.style.background = 'var(--color-bg-5)'
  },
  onMouseLeave: (e: MouseEvent<HTMLElement>) => {
    if (!selected) e.currentTarget.style.background = 'transparent'
  },
})
