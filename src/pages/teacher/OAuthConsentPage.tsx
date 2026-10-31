import { useEffect, useState } from 'react'
import { Check, Lock, Sparkles, X } from '../../components/icons/appIcons'
import IskraMark from '../../components/landing/IskraMark'
import TeacherLoginPage from './TeacherLoginPage'
import { supabase } from '../../lib/supabase'

type ConsentDetails = {
  authorization_id: string
  client: { id: string; name: string; uri?: string }
  scope: string
}

export default function OAuthConsentPage() {
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id') ?? ''
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [details, setDetails] = useState<ConsentDetails | null>(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!alive) return
      if (!auth.user) { setSignedIn(false); return }
      const { data: staff, error: roleError } = await supabase.rpc('is_staff')
      if (!alive) return
      if (roleError || staff !== true) {
        setSignedIn(true)
        setProblem('Подключить Claude можно только из аккаунта преподавателя Искры.')
        return
      }
      setSignedIn(true)
      if (!authorizationId) {
        setProblem('В ссылке подключения нет запроса авторизации. Вернитесь в Claude и начните подключение ещё раз.')
        return
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
      if (!alive) return
      if (error || !data) {
        setProblem('Запрос подключения истёк или уже закрыт. Начните подключение Искры в Claude ещё раз.')
        return
      }
      if ('redirect_url' in data) {
        window.location.assign(data.redirect_url)
        return
      }
      setDetails(data)
    }
    void check()
    return () => { alive = false }
  }, [authorizationId])

  if (signedIn === false) return <TeacherLoginPage onLogin={() => window.location.reload()} />

  async function decide(allow: boolean) {
    if (!authorizationId || busy) return
    setBusy(true)
    setProblem('')
    const result = allow
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
    if (result.error || !result.data?.redirect_url) {
      setProblem('Не удалось завершить подключение. Вернитесь в Claude и попробуйте ещё раз.')
      setBusy(false)
      return
    }
    window.location.assign(result.data.redirect_url)
  }

  const appStyle: React.CSSProperties = {
    minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20,
    background: 'var(--color-bg)', color: 'var(--color-text)',
  }
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 460, boxSizing: 'border-box', padding: 24,
    borderRadius: 24, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
    boxShadow: 'var(--shadow-3)',
  }

  return (
    <main style={appStyle}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <IskraMark size={40} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Искра · подключение приложения</div>
        </div>
        {problem ? (
          <>
            <h1 style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 10px' }}>Не получилось подключить Claude</h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-3)', margin: '0 0 20px' }}>{problem}</p>
            <button type="button" onClick={() => { window.location.href = '/#/teacher' }} style={primaryButton}>Перейти в Искру</button>
          </>
        ) : signedIn === null || !details ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 14 }}>Проверяем подключение…</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'var(--color-purple-soft)', color: 'var(--color-accent)' }}><Sparkles size={22} /></div>
              <div>
                <div style={{ fontWeight: 750, fontSize: 18 }}>{details.client.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-3)' }}>Запрашивает доступ к Искре</div>
              </div>
            </div>
            <h1 style={{ fontSize: 23, lineHeight: 1.22, margin: '0 0 8px' }}>Разрешить Claude работать в вашем кабинете?</h1>
            <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-3)' }}>Доступ получит аккаунт преподавателя, который сейчас вошёл в Искру.</p>
            <div style={{ padding: 16, display: 'grid', gap: 12, borderRadius: 18, background: 'var(--color-bg-3)' }}>
              {[
                'Просматривать курсы, созданные в вашем кабинете',
                'Создавать курсы и уроки как черновики',
                'Добавлять тесты к урокам черновых курсов',
              ].map(item => <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4 }}><Check size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />{item}</div>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '14px 0 18px', padding: 14, borderRadius: 16, background: 'var(--color-purple-soft)', color: 'var(--color-accent)' }}>
              <Lock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>Claude не сможет открыть кабинеты других преподавателей, публиковать курсы или выдавать их ученикам. Доступ можно отозвать в профиле Искры.</span>
            </div>
            <button type="button" disabled={busy} onClick={() => void decide(true)} style={{ ...primaryButton, opacity: busy ? 0.65 : 1 }}>{busy ? 'Подключаем…' : 'Разрешить доступ'}</button>
            <button type="button" disabled={busy} onClick={() => void decide(false)} style={{ width: '100%', marginTop: 10, padding: 10, border: 0, background: 'transparent', color: 'var(--color-text-3)', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}><X size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Не сейчас</button>
          </>
        )}
      </section>
    </main>
  )
}

const primaryButton: React.CSSProperties = {
  width: '100%', minHeight: 48, border: 0, borderRadius: 14,
  background: 'var(--color-accent)', color: '#fff', font: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
