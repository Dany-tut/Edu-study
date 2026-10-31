import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabase'
import { connectLoginProvider } from '../../lib/socialAuth'
import { authErrorRu } from '../../lib/authErrors'
import { useT } from '../../lib/i18n'
import { Alert } from '../Alert'
import { AppleMark, GoogleMark } from '../SocialLoginButtons'

export default function TeacherLoginMethods() {
  const t = useT()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(() => sessionStorage.getItem('iskra:link-error') || '')
  const [notice, setNotice] = useState('')
  const [available, setAvailable] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    sessionStorage.removeItem('iskra:link-error')
    let active = true
    const controller = new AbortController()
    void fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY! }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('settings'); return response.json() })
      .then(settings => { if (active) setAvailable(settings.external || {}) })
      .catch(() => { if (active) setAvailable({}) })
    const refresh = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!active) return
      setUser(data.user)
      setReady(true)
      setBusy(null)
      if (error) setError(t(authErrorRu(error instanceof Error ? error : { message: String(error) })))
    }
    const linked = () => { setNotice(t('Способ входа подключён к вашему аккаунту.')); void refresh() }
    const failed = (event: Event) => { setError((event as CustomEvent<string>).detail); setBusy(null) }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('iskra:identity-linked', linked)
    window.addEventListener('iskra:auth-error', failed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (active) void refresh() }, 0)
    })
    const listeners = Capacitor.isNativePlatform() ? [
      App.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh() }),
      Browser.addListener('browserFinished', () => { void refresh() }),
    ] : []
    return () => {
      active = false
      controller.abort()
      subscription.unsubscribe()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('iskra:identity-linked', linked)
      window.removeEventListener('iskra:auth-error', failed)
      listeners.forEach(listener => { void listener.then(handle => handle.remove()) })
    }
  }, [t])

  async function connect(provider: 'google' | 'apple') {
    setBusy(provider)
    setError('')
    setNotice('')
    try { await connectLoginProvider(provider) }
    catch (error) {
      const code = (error as { code?: string }).code
      setError(t(code === 'manual_linking_disabled'
        ? 'Подключение способов входа пока недоступно. Обратитесь в поддержку.'
        : authErrorRu(error instanceof Error ? error : { message: String(error) }, 'Не удалось подключить способ входа. Попробуйте ещё раз.')))
      setBusy(null)
    }
  }

  return (
    <section aria-label={t('Способы входа')} style={{ padding: 20, borderRadius: 24, background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)', display: 'grid', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text)' }}>{t('Способы входа')}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--color-muted)' }}>{t('Подключите Google или Apple, чтобы входить в этот же аккаунт. Ученики, курсы и расписание сохранятся.')}</p>
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-2)', overflowWrap: 'anywhere' }}>
        {t('Почта')} · {ready ? user?.email || t('Войдите в аккаунт') : t('Загрузка...')}
        {user?.email && <div style={{ marginTop: 4, color: 'var(--color-muted)', fontSize: 12 }}>{t('Вход по почте доступен на экране входа.')}</div>}
      </div>
      {(['google', 'apple'] as const).map(provider => {
        const identity = user?.identities?.find(identity => identity.provider === provider)
        const label = provider === 'google' ? 'Google' : 'Apple'
        return <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
          {provider === 'google' ? <GoogleMark /> : <AppleMark />}
          <div style={{ flex: 1, minWidth: 0, color: 'var(--color-text)', fontSize: 14 }}>
            <strong>{label}</strong>
            {identity && <div style={{ color: 'var(--color-muted)', fontSize: 12, overflowWrap: 'anywhere' }}>{identity.identity_data?.email || t('Подключено')}</div>}
          </div>
          {identity ? <span style={{ fontSize: 12, color: 'var(--color-green-text)' }}>{t('Подключено')}</span>
            : <button type="button" onClick={() => void connect(provider)} disabled={!ready || !user || busy !== null || !available?.[provider]}
              aria-label={`${t('Подключить')} ${label}`}
              style={{ minHeight: 44, padding: '0 14px', borderRadius: 16, border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 650, opacity: !ready || !user || busy !== null || !available?.[provider] ? .55 : 1, cursor: 'pointer' }}>
              {!available ? t('Загрузка...') : !available[provider] ? t('Пока недоступно') : busy === provider ? t('Открываем…') : t('Подключить')}
            </button>}
        </div>
      })}
      {error && <Alert tone="danger" text={error} />}
      {notice && <Alert tone="info" text={notice} />}
    </section>
  )
}
