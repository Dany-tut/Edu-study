import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../../lib/i18n'
import { Alert } from '../Alert'
import { Check, ClipboardPaste, Copy, Download } from '../icons/appIcons'

/** Чтение буфера обмена есть не везде (старые WebView, http без TLS). */
const canReadClipboard = () => typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'

/** Шесть клеток кода. Под ними одно настоящее поле: вставка, автозаполнение кода и нампад работают как обычно. */
export function CodeCells({ value, onChange, onComplete, disabled, invalid, autoFocus = true, label }: {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    // И после неверного кода: поле снова доступно — курсор сразу в нём.
    if (!autoFocus || disabled) return
    ref.current?.focus({ preventScroll: true })
    setFocused(document.activeElement === ref.current)
  }, [autoFocus, disabled])
  const active = Math.min(value.length, 5)
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 48px))', justifyContent: 'center', gap: 8 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const current = focused && !disabled && i === active
        return <div key={i} aria-hidden style={{
          height: 56, borderRadius: 14, display: 'grid', placeItems: 'center',
          background: 'var(--color-bg-input)',
          border: `1.5px solid ${invalid ? 'var(--color-red)' : current ? 'var(--color-purple)' : 'var(--color-border)'}`,
          boxShadow: current ? '0 0 0 3px var(--color-purple-soft)' : 'none',
          color: 'var(--color-text)', fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          transition: 'border-color .15s, box-shadow .15s',
        }}>{value[i] ?? ''}</div>
      })}
      <input ref={ref} aria-label={label} value={value} disabled={disabled}
        inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={event => {
          const next = event.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(next)
          if (next.length === 6) onComplete?.(next)
        }}
        aria-invalid={invalid}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, fontSize: 16, caretColor: 'transparent', cursor: 'text' }} />
    </div>
  )
}

/**
 * Главная кнопка под клетками — одна на двоих. Пока клетки пусты, это «Вставить код»:
 * скопировал код в аутентификаторе, вернулся, нажал — и он сразу уходит на проверку
 * (шесть цифр отправляются сами). С первой набранной цифры кнопка становится «Подтвердить».
 * Буфер читается только по нажатию (iOS сам спрашивает разрешение); из текста берутся
 * шесть цифр подряд — «123 456», «123-456», код посреди строки.
 * Где буфер не читается (старые WebView, http), кнопка сразу «Подтвердить».
 */
export function CodeSubmitButton({ code, busy, ready = true, onPaste }: {
  code: string
  busy: boolean
  /** Остальное готово к проверке (например, фактор уже загружен). */
  ready?: boolean
  onPaste: (code: string) => void
}) {
  const t = useT()
  const [note, setNote] = useState('')
  useEffect(() => { if (code) setNote('') }, [code])
  const pasteMode = !busy && code.length === 0 && canReadClipboard()
  const paste = async () => {
    setNote('')
    let text = ''
    try { text = await navigator.clipboard.readText() } catch {
      setNote('Не получилось прочитать буфер обмена.\nЗажмите поле с клетками и выберите «Вставить».')
      return
    }
    const digits = text.match(/\d(?:[\s-]?\d){5}/)?.[0].replace(/\D/g, '')
    if (!digits) { setNote('В буфере обмена нет кода из 6 цифр.\nСкопируйте код в приложении-аутентификаторе.'); return }
    onPaste(digits)
  }
  const canSubmit = !busy && ready && code.length === 6
  return <>
    {note && <Alert tone="warning" text={t(note)} />}
    {pasteMode
      ? <button data-hover="layer" type="button" onClick={() => void paste()}
        style={{ ...primaryButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <ClipboardPaste size={18} />{t('Вставить код')}
      </button>
      : <button data-hover="layer" type="submit" disabled={!canSubmit}
        style={{ ...primaryButton, opacity: canSubmit ? 1 : 0.6 }}>{t(busy ? 'Проверяем…' : 'Подтвердить')}</button>}
  </>
}

export const primaryButton: CSSProperties = {
  width: '100%', minHeight: 48, padding: '0 16px', border: 0, borderRadius: 14,
  background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
}

export const softButton: CSSProperties = {
  minHeight: 44, padding: '0 14px', border: 0, borderRadius: 14,
  background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)',
  fontSize: 13, fontWeight: 650, cursor: 'pointer', whiteSpace: 'nowrap',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

export const linkButton: CSSProperties = {
  minHeight: 44, padding: '0 8px', border: 0, background: 'transparent',
  color: 'var(--color-purple-text)', fontSize: 14, fontWeight: 650, cursor: 'pointer',
}

/** Кнопка «значок + подпись» в одну линию. */
export function IconButton({ icon, children, onClick, style, disabled }: { icon: ReactNode; children: ReactNode; onClick: () => void; style?: CSSProperties; disabled?: boolean }) {
  return <button data-hover="layer" type="button" onClick={onClick} disabled={disabled} style={{ ...softButton, ...style, opacity: disabled ? 0.55 : 1 }}>
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
    <span>{children}</span>
  </button>
}

/** 8 запасных кодов в две колонки и кнопки «Скопировать» / «Скачать». */
export function BackupCodesList({ codes }: { codes: string[] }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const text = codes.join('\n')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { /* без доступа к буферу — коды видны на экране */ }
  }
  const download = () => {
    const blob = new Blob([`${t('Запасные коды Искры')}\n${t('Каждый код срабатывает один раз.')}\n\n${text}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'iskra-backup-codes.txt'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div style={{ display: 'grid', gap: 10 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 16px', padding: '14px 16px', borderRadius: 16, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)' }}>
      {codes.map(code => <code key={code} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, letterSpacing: '.04em', color: 'var(--color-text)', textAlign: 'center' }}>{code}</code>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      <IconButton icon={copied ? <Check size={16} strokeWidth={2.2} /> : <Copy size={16} />} onClick={() => void copy()}>{t(copied ? 'Скопировано' : 'Скопировать')}</IconButton>
      <IconButton icon={<Download size={16} />} onClick={download}>{t('Скачать')}</IconButton>
    </div>
  </div>
}
