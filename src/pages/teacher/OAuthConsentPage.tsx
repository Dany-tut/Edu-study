import { useEffect, useRef, useState } from 'react'
import { Check, Lock, Sparkles, X } from '../../components/icons/appIcons'
import IskraMark from '../../components/landing/IskraMark'
import TeacherLoginPage from './TeacherLoginPage'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { decideOAuthConsent } from '../../lib/oauthConsent'
import ScrollFade from '../../components/ScrollFade'

type ConsentDetails = {
  authorization_id: string
  client: { id: string; name: string; uri?: string }
  scope: string
}

export default function OAuthConsentPage() {
  const t = useT()
  const action = useAsyncTask()
  const busy = action.busy
  const owner = useRef<string | null>(null)
  const [account, setAccount] = useState('')
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id') ?? ''
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [details, setDetails] = useState<ConsentDetails | null>(null)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!alive) return
      if (!auth.user) { setSignedIn(false); return }
      owner.current = auth.user.id
      const { data: staff, error: roleError } = await supabase.rpc('is_staff')
      if (!alive) return
      if (roleError || staff !== true) {
        setSignedIn(true)
        setProblem(t('Подключение доступно только преподавателям Искры.'))
        return
      }
      setSignedIn(true)
      setAccount(auth.user.email ?? t('Текущий преподаватель'))
      if (!authorizationId) {
        setProblem(t('В ссылке подключения нет запроса авторизации. Вернитесь в приложение и начните подключение ещё раз.'))
        return
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
      if (!alive) return
      const current = await supabase.auth.getUser()
      if (!alive) return
      if (current.data.user?.id !== auth.user.id) { setProblem(t('Аккаунт изменился. Обновите страницу подключения.')); return }
      if (error || !data) {
        setProblem(t('Запрос подключения истёк или уже закрыт. Начните подключение Искры в приложении ещё раз.'))
        return
      }
      if ('redirect_url' in data) {
        window.location.assign(data.redirect_url)
        return
      }
      setDetails(data)
    }
    void check().catch(() => { if (alive) { setSignedIn(true); setProblem(t('Не удалось проверить подключение. Обновите страницу и попробуйте ещё раз.')) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (owner.current && session?.user.id !== owner.current) {
        action.cancel(); setDetails(null); setProblem(t('Аккаунт изменился. Обновите страницу подключения.'))
      }
    })
    return () => { alive = false; owner.current = null; listener.subscription.unsubscribe() }
  }, [authorizationId])

  if (signedIn === false) return <TeacherLoginPage onLogin={() => window.location.reload()} />

  function decide(allow: boolean) {
    if (!authorizationId || busy) return
    setProblem('')
    void action.run(signal => decideOAuthConsent(authorizationId, allow, owner.current ?? '', signal),
      redirectUrl => window.location.assign(redirectUrl), error => {
        setProblem(t(error instanceof Error && error.message === 'account_changed'
          ? 'Аккаунт изменился. Обновите страницу подключения.'
          : 'Не удалось завершить подключение. Вернитесь в приложение и попробуйте ещё раз.'))
      })
  }

  const appStyle: React.CSSProperties = {
    height: '100dvh', display: 'grid', placeItems: 'center', padding: 16, overflow: 'hidden',
    background: 'var(--color-bg)', color: 'var(--color-text)',
  }
  const cardStyle: React.CSSProperties = {
    height: details && !problem ? 'min(780px, calc(100dvh - 32px))' : undefined, width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 32px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    borderRadius: 24, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
    boxShadow: 'var(--shadow-3)',
  }

  return (
    <main style={appStyle}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 24px', flexShrink: 0 }}>
          <IskraMark size={40} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t("Искра · подключение приложения")}</div>
        </div>
        <ScrollFade maxHeight="100%" style={{ minHeight: 0, flex: 1 }} scrollClassName="oauth-consent-scroll" scrollStyle={{ padding: '0 24px 16px' }}>
        {problem ? (
          <>
            <h1 style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 10px' }}>{t("Не получилось подключить приложение")}</h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-3)', margin: '0 0 20px' }}>{problem}</p>
          </>
        ) : signedIn === null || !details ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 14 }}>{t("Проверяем подключение…")}</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }}><Sparkles size={22} /></div>
              <div>
                <div style={{ fontWeight: 750, fontSize: 18, overflowWrap: 'anywhere' }}>{details.client.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-3)' }}>{t("Запрашивает доступ к Искре")}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{t('Вы вошли как')}: <strong>{account}</strong></p>
            <h1 style={{ fontSize: 23, lineHeight: 1.22, margin: '0 0 8px' }}>{t("Разрешить приложению работать в вашем кабинете?")}</h1>
            <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-3)' }}>{t("Приложение получит доступ от вашего имени.")}</p>
            <div style={{ padding: 16, display: 'grid', gap: 12, borderRadius: 18, background: 'var(--color-bg-3)' }}>
              {[
                'Просматривать курсы, созданные в вашем кабинете',
                'Создавать курсы и уроки как черновики',
                'Добавлять тесты к урокам черновых курсов',
              ].map(item => <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4 }}><Check size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />{t(item)}</div>)}
            </div>
            <div className="oauth-consent-note" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '14px 0 18px', padding: 14, borderRadius: 16, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }}>
              <Lock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>{t("Инструменты MCP работают с вашими курсами и создают материалы как черновики. Проверьте их в Искре перед публикацией. Выданный приложению доступ можно отозвать в разделе «Интеграции».")}</span>
            </div>

          </>
        )}
        </ScrollFade>
        {(problem || (signedIn && details)) && <footer style={{ padding: '14px 24px 20px', flexShrink: 0, borderTop: '1px solid var(--color-border-medium)' }}>
          {problem ? <>
            <button type="button" onClick={() => window.location.reload()} style={primaryButton}>{t('Попробовать ещё раз')}</button>
            <button type="button" onClick={() => { window.location.href = '/#/teacher' }} style={{ ...primaryButton, marginTop: 6, background: 'var(--color-bg-3)', color: 'var(--color-text)' }}>{t('Перейти в Искру')}</button>
          </> : <>
            <button type="button" disabled={busy} onClick={() => decide(true)} style={{ ...primaryButton, opacity: busy ? 0.65 : 1 }}>{busy ? t('Подключаем…') : t('Разрешить доступ')}</button>
            <button type="button" disabled={busy} onClick={() => decide(false)} style={{ width: '100%', minHeight: 44, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 0, background: 'transparent', color: 'var(--color-text-3)', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}><X size={14} />{t('Не сейчас')}</button>
          </>}
        </footer>}
      </section>
    </main>
  )
}

const primaryButton: React.CSSProperties = {
  width: '100%', minHeight: 48, border: 0, borderRadius: 14,
  background: 'var(--color-purple-text)', color: 'var(--color-bg)', font: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
