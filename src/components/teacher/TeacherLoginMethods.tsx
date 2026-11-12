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
import MfaLoginRow from '../mfa/MfaLoginRow'
import PasskeyLoginRow from '../mfa/PasskeyLoginRow'
import AppLockRow from '../mfa/AppLockRow'

/** Способы входа в аккаунт: почта, Google, Apple. У ученика — в настройках профиля. */
export default function TeacherLoginMethods({ student = false, sheet = false }: { student?: boolean; sheet?: boolean } = {}) {
  const t = useT()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(() => sessionStorage.getItem('iskra:link-error') || '')
  const errorRef = useRef(error)
  const errorProviderRef = useRef(sessionStorage.getItem('iskra:link-error-provider') || '')
  const [notice, setNotice] = useState('')
  // длинная почта упирается в «Подключено» — тогда вместо таблетки квадрат с галочкой
  const [cramped, setCramped] = useState<Record<string, boolean>>({})
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
    <section aria-label={t('Способы входа')} style={{ padding: sheet ? 0 : 20, borderRadius: sheet ? 0 : 24, background: sheet ? 'transparent' : 'var(--color-surface)', border: sheet ? 0 : '1px solid var(--color-border-soft)', display: 'grid', gap: 14 }}>
      <div>
        {!sheet && <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text)' }}>{t('Способы входа')}</h2>}
        <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--color-muted)' }}>{t(student ? 'Подключи Google или Apple, чтобы входить в этот же аккаунт. Прогресс, задания и друзья сохранятся.' : 'Подключите Google или Apple, чтобы входить в этот же аккаунт. Ученики, курсы и расписание сохранятся.')}</p>
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-2)', overflowWrap: 'anywhere' }}>
        {t('Почта')} · {ready ? user?.email || t('Войдите в аккаунт') : t('Загрузка...')}
        {user?.email && <div style={{ marginTop: 4, color: 'var(--color-muted)', fontSize: 12 }}>{t('Вход по почте доступен на экране входа.')}</div>}
      </div>
      <div>
      {(['google', 'apple'] as const).map(provider => {
        const identity = user?.identities?.find(identity => identity.provider === provider)
        const label = provider === 'google' ? 'Google' : 'Apple'
        return <div key={provider} style={{ display: 'grid', gridTemplateColumns: `28px minmax(0, 1fr) ${identity && cramped[provider] ? 44 : 124}px`, alignItems: 'center', gap: 10, minHeight: 76, padding: '12px 0', borderTop: '1px solid var(--color-border-soft)' }}>
          <span style={{ display: 'grid', placeItems: 'center' }}>{provider === 'google' ? <GoogleMark /> : <AppleMark />}</span>
          <div style={{ minWidth: 0, color: 'var(--color-text)', fontSize: 14, lineHeight: 1.25 }}>
            <strong>{label}</strong>
            {identity && <LinkedEmail email={identity.identity_data?.email || t('Подключено')} onCramped={cramped => setCramped(c => ({ ...c, [provider]: cramped }))} />}
          </div>
          {identity ? <span aria-label={t('Подключено')} title={t('Подключено')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, width: cramped[provider] ? 44 : '100%', justifySelf: 'end', boxSizing: 'border-box', borderRadius: 14, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}><Check size={cramped[provider] ? 18 : 14} strokeWidth={2.2} />{!cramped[provider] && t('Подключено')}</span>
            : <button data-hover="layer" type="button" onClick={() => void connect(provider)} disabled={!ready || !user || busy !== null || !available?.[provider]}
              aria-label={`${t('Подключить')} ${label}`}
              style={{ minHeight: 44, width: '100%', boxSizing: 'border-box', padding: '0 10px', borderRadius: 14, border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', opacity: !ready || !user || busy !== null || !available?.[provider] ? .55 : 1, cursor: 'pointer' }}>
              {!available ? t('Загрузка...') : !available[provider] ? t('Пока недоступно') : busy === provider ? t('Открываем…') : t('Подключить')}
            </button>}
        </div>
      })}
      <PasskeyLoginRow />
      <MfaLoginRow />
      <AppLockRow />
      </div>
      {error && <Alert tone="danger" text={t(error)} />}
      {notice && <Alert tone="info" text={t(notice)} />}
      <a data-hover="link" href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-muted)', fontSize: 12 }}>Политика конфиденциальности</a>
    </section>
  )
}

/** Почта подключённого способа входа. Сообщает, не помещается ли она рядом с полной таблеткой «Подключено». */
function LinkedEmail({ email, onCramped }: { email: string; onCramped: (cramped: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const report = useRef(onCramped)
  report.current = onCramped
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // меряем по ширине, которую почта получила бы рядом с полной таблеткой (124 px):
    // иначе после сжатия таблетки почта влезет и таблетка снова станет полной
    const check = () => {
      const row = el.parentElement?.parentElement
      if (!row) return
      const room = row.clientWidth - 28 - 124 - 20
      report.current(el.scrollWidth > room)
    }
    check()
    const observer = new ResizeObserver(check)
    if (el.parentElement?.parentElement) observer.observe(el.parentElement.parentElement)
    return () => observer.disconnect()
  }, [email])
  return <div ref={ref} title={email} style={{ marginTop: 2, color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.3, overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap' }}>{email}</div>
}
