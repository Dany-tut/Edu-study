import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from './icons/appIcons'

/**
 * ПУСТОЙ ЭКРАН — один на всё приложение (дизайн-система, круг 2).
 *
 * Было три вида: пунктирная карточка (тренажёр, колода), серая плашка с иконкой
 * («Курсы», расписание) и голый бледный текст в десятке мест. Теперь: плитка
 * тона 44 с иконкой, заголовок 15/700, подпись 12 и, если есть, одно действие.
 *
 * `compact` — без плитки и рамки, для пустого списка внутри уже существующей
 * карточки или выпадающего меню («Ничего не найдено»).
 */
export default function EmptyState({ icon: Icon, title, text, action, compact, style }: {
  icon?: LucideIcon
  title: ReactNode
  text?: ReactNode
  /** Одно действие — кнопка размера S. */
  action?: { label: string; onClick: () => void }
  compact?: boolean
  style?: CSSProperties
}) {
  if (compact) {
    return (
      <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-3)', ...style }}>
        {title}
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '24px 18px', textAlign: 'center',
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', borderRadius: 18,
        ...style,
      }}
    >
      {Icon && (
        <span
          aria-hidden
          style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', marginBottom: 2 }}
        >
          <Icon size={20} />
        </span>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)' }}>{title}</div>
      {text && <div style={{ fontSize: 12, lineHeight: 1.3, color: 'var(--color-text-3)', maxWidth: 300 }}>{text}</div>}
      {action && (
        <button
          type="button" onClick={action.onClick}
          style={{ marginTop: 4, height: 32, padding: '0 12px', borderRadius: 10, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
