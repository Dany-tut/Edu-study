/**
 * Кастомная радиокнопка — единственная разрешённая в проекте.
 *
 * ПРАВИЛО то же, что у [[Checkbox]]: нативный `<input type="radio">` рисуется
 * движком ОС (системный синий, чужие пропорции, тему не слушает), поэтому здесь
 * он визуально скрыт и оставлен только как механика — фокус, стрелки, группа по
 * `name`, screen reader. Всё видимое рисуем сами на CSS-переменных.
 *
 * Визуально это НЕ круглый чекбокс. Чекбокс — залитый квадрат с галочкой,
 * радио — кольцо с точкой внутри и прозрачной серединой. Форма здесь несёт
 * смысл: «можно несколько» против «только одно», и если оба контрола залить
 * одинаково, разница пропадёт.
 */
export default function Radio({
  checked,
  onChange,
  name,
  children,
  disabled,
  size = 18,
  accent = 'var(--color-control-accent)',
  align = 'center',
  labelStyle,
  title,
}: {
  checked: boolean
  onChange: () => void
  /** Общий для группы — по нему браузер связывает кнопки и водит стрелками. */
  name: string
  /** Подпись справа от кольца. */
  children?: React.ReactNode
  disabled?: boolean
  size?: number
  /** Цвет выбранного состояния (по умолчанию тёмный фиолет продукта). */
  accent?: string
  /** `start` — для многострочных подписей (кольцо по первой строке). */
  align?: 'center' | 'start'
  /** Домешивается в `<label>` — размер шрифта, цвет текста и т.п. */
  labelStyle?: React.CSSProperties
  title?: string
}) {
  return (
    <label
      title={title}
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
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          marginTop: align === 'start' ? 1 : 0,
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: '50%',
          // Кольцо толще, чем рамка чекбокса: у круга периметр «съедает» вес
          // линии, и при 1.5px выбранное кольцо читается как невыбранное.
          border: `${checked ? 2 : 1.5}px solid ${checked ? accent : 'var(--color-border-medium)'}`,
          background: 'var(--color-bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s ease, border-width 0.15s ease',
        }}
      >
        <span
          style={{
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: '50%',
            background: accent,
            // Точка не появляется рывком, а вырастает из центра — на группе из
            // 4–5 вариантов переключение иначе читается как мигание.
            transform: checked ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.15s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </span>
      {children != null && <span>{children}</span>}
    </label>
  )
}
