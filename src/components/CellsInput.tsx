import { useRef } from 'react'

/**
 * Ответ по КЛЕТКАМ бланка ЕГЭ: ряд одиночных клеток, ученик вписывает ответ по
 * одному знаку слева направо («245»). Используют оба решателя (HomeworkFlow,
 * TestFlow) и предпросмотр редактора — один компонент, чтобы поведение клеток
 * (автопереход фокуса, Backspace, стрелки) жило в одном месте.
 *
 * Ответ — склейка знаков клеток (`value`); гэп в середине схлопывается, что для
 * последовательного бланка нормально. Нампад родной (`inputMode="numeric"`),
 * шрифт крупный — iOS не зумит при фокусе (skill no-jank-screen).
 */
export default function CellsInput({ value, count, onChange, disabled, status = 'none' }: {
  value: string
  /** Сколько клеток показать. */
  count: number
  onChange: (v: string) => void
  disabled?: boolean
  /** Рамка клеток: зелёная при верном, красная при неверном, нейтральная до проверки. */
  status?: 'ok' | 'bad' | 'none'
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const n = Math.max(1, Math.min(12, Math.floor(count) || 1))
  const chars = Array.from({ length: n }, (_, i) => value[i] ?? '')
  const setAt = (i: number, ch: string) => {
    const next = chars.slice()
    next[i] = ch
    onChange(next.join(''))
  }
  const border = status === 'ok' ? 'var(--color-green-border)' : status === 'bad' ? 'var(--color-red-border)' : 'var(--color-border)'
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="group" aria-label="Ответ по клеткам">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={ch}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Клетка ${i + 1} из ${n}`}
          onChange={e => {
            const v = e.target.value.replace(/\s/g, '').slice(-1)
            setAt(i, v)
            if (v && i < n - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !ch && i > 0) {
              e.preventDefault()
              refs.current[i - 1]?.focus()
              setAt(i - 1, '')
            } else if (e.key === 'ArrowLeft' && i > 0) {
              refs.current[i - 1]?.focus()
            } else if (e.key === 'ArrowRight' && i < n - 1) {
              refs.current[i + 1]?.focus()
            }
          }}
          style={{
            width: 40, height: 52, textAlign: 'center',
            fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            borderRadius: 10, border: `1.5px solid ${border}`,
            background: 'var(--color-bg-input)', color: 'var(--color-text)',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            opacity: disabled ? 0.85 : 1,
          }}
        />
      ))}
    </div>
  )
}
