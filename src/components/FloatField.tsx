import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import GrowTextarea from './GrowTextarea'
import './floatField.css'

// ─────────────────────────────────────────────────────────────────────────────
// ПОЛЕ С ПЛАВАЮЩЕЙ ПОДПИСЬЮ (FIELD-01, решение Дани 09.11.2026).
//
// Подпись живёт ВНУТРИ поля, а не строкой над ним: в покое — на месте текста,
// при фокусе или когда есть значение — уезжает в верх поля и остаётся видна
// (не исчезает, как плейсхолдер: человек всегда видит, что за поле он
// заполняет, экранный диктор читает <label>, связанный с полем).
//
// Стиль по версии (lib/platform.ts → <html data-platform>), в floatField.css:
//   iPhone/iPad — заливка поля как у системных полей iOS, мягкая рамка;
//   Android     — Material «filled»: заливка, линия снизу, при фокусе — акцент;
//   ПК          — рамка FIELD, наведение подсвечивает рамку.
// Текст 16 px на телефоне (иначе iOS приближает страницу при фокусе), 14 на ПК.
//
// Пропсы:
//   label        подпись (обязательна — это и есть доступное имя поля)
//   value, onChange(v)  управляемое значение
//   multiline    textarea, растущая по тексту (GrowTextarea)
//   rows         стартовая высота многострочного поля в строках (по умолчанию 3)
//   error        текст ошибки: красная рамка, aria-invalid, текст под полем
//   hint         подсказка под полем (если нет ошибки)
//   placeholder  пример значения — виден только когда подпись уже наверху
//   …и обычные атрибуты <input>/<textarea> (type, inputMode, autoComplete,
//   required, disabled, maxLength, onBlur, onKeyDown …)
// ─────────────────────────────────────────────────────────────────────────────

type Common = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  id?: string
  className?: string
}

type InputProps = Common & { multiline?: false } &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id' | 'className'>
type AreaProps = Common & { multiline: true; rows?: number } &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'id' | 'className' | 'rows'>

export default function FloatField(props: InputProps | AreaProps) {
  const { label, value, onChange, error, hint, id, className, ...rest } = props
  const autoId = useId()
  const fieldId = id ?? `ff-${autoId}`
  const noteId = `${fieldId}-note`
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  const note = error || hint

  const shared = {
    id: fieldId,
    className: 'ff-control',
    // Прозрачный фон инлайном: общий контур фокуса (index.css, «Активное поле»)
    // такие поля пропускает — фокус здесь рисует рамка коробки .ff-box.
    style: { background: 'transparent' },
    'aria-invalid': error ? true : undefined,
    'aria-describedby': note ? noteId : undefined,
  }

  let control
  if (props.multiline) {
    const { multiline: _m, rows = 3, onFocus, onBlur, ...areaRest } = rest as Omit<AreaProps, keyof Common>
    control = (
      <GrowTextarea
        {...areaRest}
        {...shared}
        value={value}
        onChange={onChange}
        minHeight={rows * 24 + 30}
        onFocus={e => { setFocused(true); onFocus?.(e) }}
        onBlur={e => { setFocused(false); onBlur?.(e) }}
      />
    )
  } else {
    const { multiline: _m, onFocus, onBlur, ...inputRest } = rest as Omit<InputProps, keyof Common>
    control = (
      <input
        {...inputRest}
        {...shared}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setFocused(true); onFocus?.(e) }}
        onBlur={e => { setFocused(false); onBlur?.(e) }}
      />
    )
  }

  return (
    <div
      className={['ff', className].filter(Boolean).join(' ')}
      data-floated={floated ? '' : undefined}
      data-focused={focused ? '' : undefined}
      data-error={error ? '' : undefined}
      data-multiline={props.multiline ? '' : undefined}
      data-disabled={rest.disabled ? '' : undefined}
    >
      <div className="ff-box">
        <label className="ff-label" htmlFor={fieldId}>
          {label}{rest.required ? <span aria-hidden className="ff-req"> *</span> : null}
        </label>
        {control}
      </div>
      {note && <div id={noteId} className="ff-note" role={error ? 'alert' : undefined}>{note}</div>}
    </div>
  )
}
