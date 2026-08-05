/**
 * Кастомный чекбокс — единственный разрешённый в проекте.
 *
 * ПРАВИЛО: нативные `<input type="checkbox">` и `<input type="radio">` в UI не
 * используются никогда. Движок ОС рисует их сам — системный синий, чужие
 * пропорции, тему не слушает, — поэтому здесь нативный input визуально скрыт и
 * оставлен только как механика: фокус, клавиатура, screen reader. Всё, что
 * видит пользователь, рисуем сами на CSS-переменных. Радио — в `Radio.tsx`.
 *
 * Чекбокс и радио должны читаться как РАЗНЫЕ контролы, а не как одна фигура в
 * двух скруглениях: квадрат с галочкой против кольца с точкой. Форма — то
 * единственное, по чему видно «можно выбрать несколько» против «только одно».
 */
export default function Checkbox({
  checked,
  onChange,
  children,
  disabled,
  size = 18,
  accent = 'var(--color-control-accent)',
  align = 'center',
  labelStyle,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  /** Подпись справа от квадрата. */
  children?: React.ReactNode
  disabled?: boolean
  size?: number
  /** Цвет залитого состояния (по умолчанию тёмный фиолет под белую галочку). */
  accent?: string
  /** `start` — для многострочных подписей (галочка выравнивается по первой строке). */
  align?: 'center' | 'start'
  /** Домешивается в `<label>` — размер шрифта, цвет текста и т.п. */
  labelStyle?: React.CSSProperties
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: align === 'start' ? 'flex-start' : 'center',
        gap: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...labelStyle,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          marginTop: align === 'start' ? 1 : 0,
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: Math.round(size / 3),
          border: `1.5px solid ${checked ? accent : 'var(--color-border-medium)'}`,
          background: checked ? accent : 'var(--color-bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
      >
        {checked && (
          <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children != null && <span>{children}</span>}
    </label>
  )
}
