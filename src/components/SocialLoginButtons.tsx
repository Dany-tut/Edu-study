import { useEffect, useState } from 'react'
import { Apple } from 'lucide-react'
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
    window.addEventListener('iskra:auth-error', onError)
    return () => window.removeEventListener('iskra:auth-error', onError)
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
          {id === 'apple' ? <Apple size={19} fill="currentColor" /> : <GoogleMark />}
          {busy === id ? t('Открываем…') : `${t('Продолжить с')} ${label}`}
        </button>
      ))}
      {error && <Alert tone="danger" text={error} style={{ marginTop: 2 }} />}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1v5.1h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4a20 20 0 0 0-18.2 11l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  )
}
