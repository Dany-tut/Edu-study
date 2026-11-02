import { textFadeStyle } from '../../lib/textFades'
import { useEffect, useRef, useState } from 'react'
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
import { Check } from '../icons/appIcons'

export default function TeacherLoginMethods() {
  const t = useT()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(() => sessionStorage.getItem('iskra:link-error') || '')
  const errorRef = useRef(error)
  const errorProviderRef = useRef(sessionStorage.getItem('iskra:link-error-provider') || '')
  const [notice, setNotice] = useState('')
  const [available, setAvailable] = useState<Record<string, boolean> | null>(null)
  const updateError = (message: string, provider?: string) => {
    errorRef.current = message
    if (provider !== undefined) errorProviderRef.current = provider
    setError(message)
  }

  useEffect(() => {
    sessionStorage.removeItem('iskra:link-error')
    sessionStorage.removeItem('iskra:link-error-provider')
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
      const displayedError = errorRef.current
      const linkedProviders = data.user?.identities?.filter(identity => identity.provider === 'google' || identity.provider === 'apple') ?? []
      const namedProvider = /Google-аккаунт|Google account/i.test(displayedError) ? 'google'
        : /Apple ID/i.test(displayedError) && !/Google-аккаунт|Google account/i.test(displayedError) ? 'apple' : ''
      const provider = errorProviderRef.current || namedProvider || (linkedProviders.length === 1 ? linkedProviders[0].provider : '')
      const isDuplicateIdentityError = /identity_already_exists|привязан к другой учётной записи Искры|привязан к другому аккаунту|already linked to another/i.test(displayedError)
      if (isDuplicateIdentityError && provider && linkedProviders.some(identity => identity.provider === provider)) {
        updateError('', '')
        sessionStorage.removeItem('iskra:link-error')
        sessionStorage.removeItem('iskra:link-error-provider')
      }
      if (error) updateError(authErrorRu(error instanceof Error ? error : { message: String(error) }))
    }
    const linked = () => {
      updateError('', '')
      sessionStorage.removeItem('iskra:link-error')
      sessionStorage.removeItem('iskra:link-error-provider')
      setNotice('Способ входа подключён к вашему аккаунту.')
      void refresh()
    }
    const failed = (event: Event) => {
      updateError((event as CustomEvent<string>).detail, sessionStorage.getItem('iskra:link-error-provider') || errorProviderRef.current)
      setBusy(null)
    }
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
  // useT returns a new function on every render. Depending on it restarts the
  // requests whenever provider settings arrive, cancelling the user response.
  }, [])

  async function connect(provider: 'google' | 'apple') {
    setBusy(provider)
    updateError('', '')
    setNotice('')
    try { await connectLoginProvider(provider) }
    catch (error) {
      const code = (error as { code?: string }).code
      updateError(t(code === 'manual_linking_disabled'
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
      <div>
      {(['google', 'apple'] as const).map(provider => {
        const identity = user?.identities?.find(identity => identity.provider === provider)
        const label = provider === 'google' ? 'Google' : 'Apple'
        return <div key={provider} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 124px', alignItems: 'center', gap: 10, minHeight: 76, padding: '12px 0', borderTop: '1px solid var(--color-border-soft)' }}>
          <span style={{ display: 'grid', placeItems: 'center' }}>{provider === 'google' ? <GoogleMark /> : <AppleMark />}</span>
          <div style={{ minWidth: 0, color: 'var(--color-text)', fontSize: 14 }}>
            <strong>{label}</strong>
            {identity && <div title={identity.identity_data?.email} style={{ marginTop: 3, color: 'var(--color-muted)', fontSize: 12, overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap' }}>{identity.identity_data?.email || t('Подключено')}</div>}
          </div>
          {identity ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, width: '100%', boxSizing: 'border-box', borderRadius: 14, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}><Check size={14} strokeWidth={2.2} />{t('Подключено')}</span>
            : <button type="button" onClick={() => void connect(provider)} disabled={!ready || !user || busy !== null || !available?.[provider]}
              aria-label={`${t('Подключить')} ${label}`}
              style={{ minHeight: 44, width: '100%', boxSizing: 'border-box', padding: '0 10px', borderRadius: 14, border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', opacity: !ready || !user || busy !== null || !available?.[provider] ? .55 : 1, cursor: 'pointer' }}>
              {!available ? t('Загрузка...') : !available[provider] ? t('Пока недоступно') : busy === provider ? t('Открываем…') : t('Подключить')}
            </button>}
        </div>
      })}
      </div>
      {error && <Alert tone="danger" text={t(error)} />}
      {notice && <Alert tone="info" text={t(notice)} />}
      <a href="https://edu-study-app.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-muted)', fontSize: 12 }}>Политика конфиденциальности</a>
    </section>
  )
}
