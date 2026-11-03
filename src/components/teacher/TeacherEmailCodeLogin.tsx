import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { authErrorRu } from '../../lib/authErrors'
import { useT } from '../../lib/i18n'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { verifyEmailCode } from '../../lib/authActions'
import { Alert } from '../Alert'

export default function TeacherEmailCodeLogin({ onLogin }: { onLogin: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const action = useAsyncTask()
  const busy = action.busy
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  function failure(error: unknown) {
    setError(error instanceof DOMException && error.name === 'TimeoutError'
      ? t('Сервер не ответил вовремя. Попробуйте ещё раз.')
      : t(authErrorRu(error instanceof Error ? error : { message: String(error) })))
  }
  function send() {
    const address = email.trim().toLowerCase()
    setError('')
    void action.run(async signal => {
      signal.throwIfAborted()
      const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } })
      if (error) throw error
    }, () => { setSentTo(address); setCooldown(60) }, failure)
  }
  function verify() {
    setError('')
    void action.run(signal => verifyEmailCode(sentTo, code.trim(), signal), onLogin, failure)
  }
  function changeEmail() { action.cancel(); setSentTo(''); setCode(''); setError('') }
  const field: React.CSSProperties = { width: '100%', minHeight: 48, padding: '12px 14px', boxSizing: 'border-box', borderRadius: 14, border: '1px solid var(--color-border-medium)', color: 'var(--color-text)', background: 'var(--color-bg-input)', fontSize: 16 }
  const button: React.CSSProperties = { minHeight: 44, border: 0, borderRadius: 14, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 650, cursor: 'pointer' }
  return <div style={{ marginTop: 14 }}>
    <button type="button" aria-expanded={open} onClick={() => { action.cancel(); setError(''); setOpen(value => !value) }} style={{ ...button, width: '100%' }}>{t('Войти по коду из письма')}</button>
    {open && <form onSubmit={event => { event.preventDefault(); void (sentTo ? verify() : send()) }} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      {sentTo ? <>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, overflowWrap: 'anywhere' }}>{t('Введите код из письма:')} {sentTo}</p>
        <input aria-label={t('Код из письма')} placeholder={t('Код из письма')} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required style={field} />
      </> : <input type="email" aria-label="Email" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" autoCapitalize="none" required style={field} />}
      <button type="submit" disabled={busy} style={button}>{busy ? t('Загрузка...') : sentTo ? t('Войти') : t('Отправить код')}</button>
      {busy && <button type="button" onClick={() => { action.cancel(); setError('') }} style={button}>{t('Отмена')}</button>}
      {sentTo && <>
        <button type="button" disabled={busy || cooldown > 0} onClick={() => void send()} style={button}>{cooldown ? `${t('Отправить повторно через')} ${cooldown}` : t('Отправить код ещё раз')}</button>
        <button type="button" onClick={changeEmail} style={button}>{t('Изменить почту')}</button>
      </>}
      {error && <Alert tone="danger" text={error} />}
    </form>}
  </div>
}
