import { useEffect, useState } from 'react'
import { startSocialLogin, type LoginRole } from '../lib/socialAuth'
import { useT } from '../lib/i18n'
import { Alert } from './Alert'

const providers = [
  { id: 'apple' as const, label: 'Apple ID' },
  { id: 'google' as const, label: 'Google' },
]

export default function SocialLoginButtons({ role }: { role: LoginRole }) {
  const t = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setError(detail || t('Не удалось завершить вход. Попробуйте ещё раз.'))
      setBusy(null)
    }
    const cancelled = () => { setBusy(null); setError('') }
    window.addEventListener('iskra:auth-cancelled', cancelled)
    window.addEventListener('iskra:auth-error', onError)
    return () => { window.removeEventListener('iskra:auth-error', onError); window.removeEventListener('iskra:auth-cancelled', cancelled) }
  }, [t])

  async function begin(provider: 'apple' | 'google') {
    setBusy(provider)
    setError('')
    try {
      await startSocialLogin(provider, role)
    } catch (err) {
      setBusy(null)
      setError(err instanceof Error ? t(err.message) : t('Не удалось начать вход. Проверьте интернет и попробуйте ещё раз.'))
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-muted)', fontSize: 12 }}>
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
        {t('или продолжить с')}
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
      </div>
      {providers.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => void begin(id)}
          disabled={busy !== null}
          style={{
            minHeight: 48, borderRadius: 14, padding: '0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 650,
            opacity: busy && busy !== id ? 0.55 : 1,
          }}
        >
          {id === 'apple' ? <AppleMark /> : <GoogleMark />}
          {busy === id ? t('Открываем…') : `${t('Продолжить с')} ${label}`}
        </button>
      ))}
      {error && <Alert tone="danger" text={error} style={{ marginTop: 2 }} />}
      <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: 'var(--color-muted)' }}>
        <a href="https://edu-study-app.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Политика конфиденциальности</a>
        {' · '}
        <a href="https://edu-study-app.vercel.app/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Условия использования</a>
      </p>
    </div>
  )
}

export function AppleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.05-2.04.03-3.91 1.18-4.96 3.01-2.12 3.67-.54 9.09 1.52 12.07 1.01 1.45 2.21 3.08 3.8 3.02 1.52-.06 2.1-.98 3.95-.98 1.83 0 2.36.98 3.95.95 1.64-.03 2.68-1.49 3.68-2.95 1.16-1.69 1.64-3.33 1.67-3.41-.04-.01-3.19-1.23-3.23-4.87-.03-3.05 2.49-4.51 2.6-4.57-1.42-2.08-3.63-2.31-4.4-2.36-2-.16-3.68 1.13-4.62 1.13Zm3.3-3.92c.83-1 1.39-2.38 1.23-3.76-1.34-.07-2.96.89-3.92 2.04-.85 1.01-1.6 2.41-1.4 3.76 1.49.11 3.02-.76 4.09-2.04Z" transform="translate(-.4 1.2) scale(.96)" />
    </svg>
  )
}

export function GoogleMark() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1v5.1h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4a20 20 0 0 0-18.2 11l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  )
}
