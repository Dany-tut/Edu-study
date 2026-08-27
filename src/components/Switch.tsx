/**
 * Кастомный переключатель — «включено/выключено» одним касанием.
 *
 * ПРАВИЛО ПРОЕКТА: нативные `<input type="checkbox">` в интерфейсе не
 * показываются никогда (движок ОС рисует их сам — системный синий, чужие
 * пропорции, тему не слушает). Здесь нативный input визуально скрыт и оставлен
 * только как механика: фокус, клавиатура, screen reader.
 *
 * Чем отличается от Checkbox.tsx: галочка отвечает на вопрос «что выбрано из
 * списка», переключатель — «работает или нет». Разная форма ровно за этим:
 * по ней видно, что нажатие меняет поведение, а не отмечает пункт.
 */
export default function Switch({ checked, onChange, disabled, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  /** Подпись для screen reader — сам ряд рисует её сам. */
  label?: string
}) {
  const W = 46, H = 28, PAD = 3
  const knob = H - PAD * 2
  return (
    <label
      style={{
        position: 'relative', flexShrink: 0, width: W, height: H,
        display: 'inline-flex', alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
        style={{
          position: 'absolute', width: 1, height: 1, opacity: 0,
          margin: 0, padding: 0, pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          width: W, height: H, borderRadius: 999,
          // Включённое — заливка кнопочным градиентом (канон сплошных
          // заливок), выключенное — нейтральная подложка с обводкой.
          background: checked ? 'var(--grad-purple)' : 'var(--color-bg-5)',
          border: `1px solid ${checked ? 'transparent' : 'var(--color-border-medium)'}`,
          transition: 'background .18s ease, border-color .18s ease',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute', top: PAD, left: PAD,
          width: knob, height: knob, borderRadius: 999, background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
          transform: `translateX(${checked ? W - knob - PAD * 2 : 0}px)`,
          transition: 'transform .2s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      />
    </label>
  )
}
