import { useEffect, useRef, useState } from 'react'
import { startSocialLogin, cancelSocialLogin, startPasskeyLogin, type LoginRole } from '../lib/socialAuth'
import { usePasskeyAvailable } from '../lib/passkey'
import { KeyRound } from './icons/appIcons'
import { useT } from '../lib/i18n'
import { authFailureFeedback, useAuthFeedback } from './AuthFeedback'
import { TermsLink, PrivacyLink } from './LegalLinks'

const providers = [
  { id: 'apple' as const, label: 'Apple' },
  { id: 'google' as const, label: 'Google' },
]

/** joinToken — вход со страницы приглашения: аккаунт Google/Apple привяжется к карточке ученика. */
export default function SocialLoginButtons({ role, joinToken }: { role: LoginRole; joinToken?: string }) {
  const t = useT()
  const sequence = useRef(0)
  const [busy, setBusy] = useState<string | null>(null)
  const feedback = useAuthFeedback('social')
  const started = useRef(false)
  const pending = useRef(false)
  // ключ доступа — вход в уже готовый аккаунт; на странице приглашения его нет
  const passkeyOn = usePasskeyAvailable() && !joinToken

  useEffect(() => {
    const onError = (event: Event) => {
      if (started.current && !pending.current) return
      started.current = true; pending.current = false
      const detail = (event as CustomEvent<string>).detail
      sequence.current++
      feedback.report(authFailureFeedback(detail || 'Не удалось завершить вход. Попробуйте ещё раз.'))
      setBusy(null)
    }
    const cancelled = () => { sequence.current++; pending.current = false; setBusy(null); feedback.report({ tone: 'info', title: 'Вход отменён', text: 'Можно выбрать другой способ входа.' }) }
    window.addEventListener('iskra:auth-cancelled', cancelled)
    window.addEventListener('iskra:auth-error', onError)
    return () => { sequence.current++; window.removeEventListener('iskra:auth-error', onError); window.removeEventListener('iskra:auth-cancelled', cancelled) }
  }, [feedback.report])

  async function begin(provider: 'apple' | 'google') {
    const id = ++sequence.current
    setBusy(provider)
    started.current = true; pending.current = true
    feedback.begin({ tone: 'info', title: provider === 'apple' ? 'Открываем Apple…' : 'Открываем Google…', busy: true, onCancel: cancelSocialLogin })
    try {
      await startSocialLogin(provider, role, joinToken)
    } catch (err) {
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      feedback.report(authFailureFeedback(err))
    }
  }

  async function withPasskey() {
    const id = ++sequence.current
    setBusy('passkey')
    started.current = true; pending.current = true
    feedback.begin({ tone: 'info', title: 'Проверяем ключ доступа…', busy: true })
    try {
      const signedIn = await startPasskeyLogin(role)
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      // закрыли системное окно — просто возвращаем экран как был
      if (!signedIn) feedback.reset()
    } catch (err) {
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      // наши сообщения уже по-русски — показываем как есть, остальное переводит authErrorRu
      feedback.report(authFailureFeedback(err instanceof Error && /[а-яё]/i.test(err.message) ? err.message : err))
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-muted)', fontSize: 12 }}>
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
        {t('или продолжить с')}
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
      {providers.map(({ id, label }) => (
        <button data-hover="layer"
          key={id}
          data-auth-provider={id}
          type="button"
          onClick={() => void begin(id)}
          disabled={busy !== null || feedback.busy}
          aria-label={busy === id ? `${t('Открываем…')} ${label}` : `${t('Продолжить с')} ${id === 'apple' ? 'Apple' : label}`}
          aria-busy={busy === id}
          style={{
            minHeight: 48, minWidth: 0, borderRadius: 14, padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 650,
            opacity: busy && busy !== id ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0, transform: id === 'apple' ? 'translateY(-0.5px)' : undefined }}>
            {id === 'apple' ? <AppleMark size={18} /> : <GoogleMark size={20} />}
          </span>
          <span style={{ display: 'block', lineHeight: '20px' }}>{label}</span>
        </button>
      ))}
      {passkeyOn && <button
          data-auth-provider="passkey"
          type="button"
          onClick={() => void withPasskey()}
          disabled={busy !== null || feedback.busy}
          aria-busy={busy === 'passkey'}
          style={{
            gridColumn: '1 / -1', minHeight: 48, minWidth: 0, borderRadius: 14, padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 650,
            opacity: busy && busy !== 'passkey' ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}><KeyRound size={19} /></span>
          <span style={{ display: 'block', lineHeight: '20px' }}>{t('Войти с ключом доступа')}</span>
        </button>}
      </div>
    </div>
  )
}

/** Согласие одной фразой под формой: нажатие «Войти»/«Зарегистрироваться» =
 *  принятие условий и обработки данных, включая техническую аналитику. */
export function AuthLegalLinks({ action = 'login' }: { action?: 'login' | 'register' }) {
  const t = useT()
  return <p className="auth-legal">
    {action === 'register' ? t('Регистрируясь, вы принимаете') : t('Входя, вы принимаете')}{' '}
    <TermsLink>{t('Условия использования')}</TermsLink>{' '}
    {t('и соглашаетесь на обработку данных, включая техническую аналитику: действия в интерфейсе, запросы и ошибки. Подробнее — в')}{' '}
    <PrivacyLink>{t('Политике конфиденциальности')}</PrivacyLink>.
  </p>
}

export function AppleMark({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.05-2.04.03-3.91 1.18-4.96 3.01-2.12 3.67-.54 9.09 1.52 12.07 1.01 1.45 2.21 3.08 3.8 3.02 1.52-.06 2.1-.98 3.95-.98 1.83 0 2.36.98 3.95.95 1.64-.03 2.68-1.49 3.68-2.95 1.16-1.69 1.64-3.33 1.67-3.41-.04-.01-3.19-1.23-3.23-4.87-.03-3.05 2.49-4.51 2.6-4.57-1.42-2.08-3.63-2.31-4.4-2.36-2-.16-3.68 1.13-4.62 1.13Zm3.3-3.92c.83-1 1.39-2.38 1.23-3.76-1.34-.07-2.96.89-3.92 2.04-.85 1.01-1.6 2.41-1.4 3.76 1.49.11 3.02-.76 4.09-2.04Z" transform="translate(-.4 1.2) scale(.96)" />
    </svg>
  )
}

export function GoogleMark({ size = 19 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1v5.1h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4a20 20 0 0 0-18.2 11l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  )
}
