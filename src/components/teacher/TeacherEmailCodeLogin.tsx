import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { verifyEmailCode } from '../../lib/authActions'
import { AuthFeedbackSlot, authFailureFeedback, useAuthFeedback } from '../AuthFeedback'

export default function TeacherEmailCodeLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const t = useT()
  const feedback = useAuthFeedback('email-code')
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const action = useAsyncTask()
  const busy = action.busy || feedback.busy
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  function failure(error: unknown) { feedback.report(authFailureFeedback(error)) }
  function cancel() {
    action.cancel()
    feedback.report({ tone: 'info', title: 'Действие отменено', text: 'Можно повторить попытку.' })
  }
  function send() {
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      feedback.begin({ tone: 'danger', title: 'Проверьте email', text: 'Например, name@example.com.', invalid: 'email' }); return
    }
    feedback.begin({ tone: 'info', title: 'Отправляем код…', busy: true, onCancel: cancel })
    void action.run(async signal => {
      signal.throwIfAborted()
      const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } })
      if (error) throw error
    }, () => {
      setSentTo(address); setCooldown(60)
      feedback.report({ tone: 'success', title: 'Код отправлен', text: 'Используйте код из последнего письма.' })
    }, failure)
  }
  function verify() {
    if (!/^[0-9]{6,10}$/.test(code.trim())) {
      feedback.begin({ tone: 'danger', title: 'Проверьте код', text: 'Введите от 6 до 10 цифр из письма.', invalid: 'code' }); return
    }
    feedback.begin({ tone: 'info', title: 'Проверяем код…', busy: true, onCancel: cancel })
    void action.run(signal => verifyEmailCode(sentTo, code.trim(), signal), () => {
      feedback.report({ tone: 'success', title: 'Код принят', text: 'Открываем ваш кабинет.' }); onLogin()
    }, failure)
  }
  function changeEmail() { action.cancel(); feedback.clear(); setSentTo(''); setCode(''); setCooldown(0) }
  const field: React.CSSProperties = { width: '100%', minHeight: 48, padding: '11px 14px', boxSizing: 'border-box', borderRadius: 14, border: '1.5px solid var(--color-border-medium)', color: 'var(--color-text)', background: 'var(--color-bg-input)', fontSize: 16, lineHeight: '22px' }
  const link: React.CSSProperties = { minHeight: 44, border: 0, background: 'transparent', color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 650, cursor: 'pointer' }
  return <form noValidate aria-busy={busy} onSubmit={event => { event.preventDefault(); void (sentTo ? verify() : send()) }} style={{ display: 'grid', gap: 8 }}>
    <input className="auth-input" aria-describedby={feedback.descriptionId} type="email" aria-label="Email" placeholder="Email" value={email} onChange={event => { setEmail(event.target.value); feedback.clear() }} readOnly={!!sentTo || busy} autoComplete="username" autoCapitalize="none" aria-invalid={feedback.message?.invalid === 'email'} style={field} />
    <input className="auth-input" aria-describedby={feedback.descriptionId} aria-label={t('Код из письма')} placeholder={t('Код из письма')} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, '')); feedback.clear() }} disabled={!sentTo} readOnly={busy} inputMode="numeric" autoComplete="one-time-code" maxLength={10} aria-invalid={feedback.message?.invalid === 'code'} style={field} />
    <AuthFeedbackSlot idleText="Код указан в последнем письме." />
    <button type="button" disabled={!sentTo || busy} onClick={changeEmail} style={{ ...link, justifySelf: 'end', padding: '0 8px' }}>{t('Изменить почту')}</button>
    <button type="submit" disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 14, background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700, opacity: busy ? 0.65 : 1 }}>{sentTo ? t('Подтвердить') : t('Отправить код')}</button>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
      <button type="button" disabled={!sentTo || busy || cooldown > 0} onClick={send} style={link}>{cooldown ? `${t('Отправить повторно через')} ${cooldown}` : t('Отправить код ещё раз')}</button>
      <button type="button" onClick={onBack} style={link}>{t('Назад ко входу')}</button>
    </div>
  </form>
}
