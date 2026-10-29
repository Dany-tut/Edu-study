import type { CSSProperties } from 'react'

/**
 * ПОЛЕ ВВОДА — один вид на всё приложение (дизайн-система, круг 2).
 *
 * Было пять фонов (bg-input, bg-3, bg-2, bg, bg-4), радиусы 8–16, рамка то
 * есть, то нет. Теперь: фон --color-bg-input, радиус 12, рамка 1.5 px
 * --color-border-medium, текст 13. Подпись над полем отступает на 13 px —
 * туда, где начинается текст (12 + рамка).
 *
 * Активное поле — фиолетовая рамка без кольца вокруг; правило в index.css
 * («Активное поле»), а не здесь: инлайн-стиль не умеет :focus.
 */
export const FIELD: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 12,
  border: '1.5px solid var(--color-border-medium)',
  background: 'var(--color-bg-input)', color: 'var(--color-text)',
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
}

/** Отступ подписи над полем: начало текста в FIELD (12 + рамка 1.5). */
export const FIELD_LABEL_INSET = 13
