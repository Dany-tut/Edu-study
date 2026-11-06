import type { CSSProperties } from 'react'

// Вторичные кнопки окон оплат (ученик и учитель). Главная — TeacherSaveButton.
// Высота 44 — минимум для пальца (MOBILE-01).
export const PAY_BUTTON: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 44, padding: '0 16px', borderRadius: 12,
  border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)',
  color: 'var(--color-text)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  cursor: 'pointer', flexShrink: 0,
}

export const PAY_BUTTON_DANGER: CSSProperties = { ...PAY_BUTTON, color: 'var(--color-red-text)' }

/** Главная кнопка окна — та же высота 44. */
export const PAY_PRIMARY: CSSProperties = { height: 44 }

/** Подвал окна: каркас Modal кладёт его блоком, раскладка — у окна. */
export const PAY_FOOTER: CSSProperties = { display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }
