import { LoopActionLabel } from '../../components/icons/LoopIcon'
import { ArrowLeft as LoopBackArrow } from '../../components/icons/appIcons'
import { clearStudentSession } from '../../lib/studentSession'
import { useEffect, useState } from 'react'
import { Eye, EyeOff } from '../../components/icons/appIcons'
import { supabase } from '../../lib/supabase'
import { trackNow } from '../../lib/analytics'
import { useT } from '../../lib/i18n'
import { authErrorRu } from '../../lib/authErrors'
import { AlertStack } from '../../components/Alert'
import IskraMark from '../../components/landing/IskraMark'
import SocialLoginButtons from '../../components/SocialLoginButtons'
import TeacherEmailCodeLogin from '../../components/teacher/TeacherEmailCodeLogin'
import ScrollFade from '../../components/ScrollFade'
import { Capacitor } from '@capacitor/core'

export default function TeacherLoginPage({ onLogin, recovery = false, linkExpired = false }: { onLogin: () => void; recovery?: boolean; linkExpired?: boolean }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(linkExpired ? t('Ссылка из письма устарела или уже использована. Отправьте письмо ещё раз и откройте самое новое.') : '')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  // Свободной регистрации нет: аккаунт учителя создаётся только по ссылке-приглашению (#/join-teacher)
  const [mode, setMode] = useState<'login' | 'reset' | 'newpassword' | 'sent'>(
    recovery ? 'newpassword' : linkExpired ? 'reset' : 'login',
  )
  const [showPassword, setShowPassword] = useState(false)

  // По ссылке из письма вход уже выполнен — подставляем почту аккаунта.
  // Поле с логином рядом с new-password нужно менеджерам паролей: без него
  // браузер не предлагает надёжный пароль и не знает, к какому входу его сохранить.
  useEffect(() => {
    if (mode !== 'newpassword') return
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email) })
  }, [mode])

  function switchMode(next: 'login' | 'reset') {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    // iOS Keychain/autofill and pasted addresses can include capitalization or
    // surrounding whitespace. Normalize email exactly as on student sign-in;
    // passwords stay byte-for-byte as entered.
    const normalizedEmail = email.trim().toLowerCase()
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (error) throw error
        void trackNow('login', { role: 'teacher', method: 'auth' })
        clearStudentSession()
        onLogin()
      } else if (mode === 'reset') {
        // Без #/teacher: Supabase дописывает токен решёткой, и второй «#» в
        // адресе ломал разбор. Форму нового пароля App показывает сам.
        // Адрес должен быть в Auth → URL Configuration → Redirect URLs.
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
        if (error) throw error
        localStorage.setItem('iskra:password-recovery-role', 'teacher')
        setMode('sent')
      } else if (mode === 'newpassword') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setNotice(t('Пароль обновлён. Входим…'))
        clearStudentSession()
        onLogin()
      }
    } catch (err: any) {
      setError(t(authErrorRu(err)))
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<typeof mode, string> = {
    login: t('Войдите в аккаунт'),
    reset: t('Сброс пароля'),
    newpassword: t('Новый пароль'),
    sent: t('Мы отправили ссылку для сброса пароля на вашу почту.'),
  }
  const buttonLabels: Record<typeof mode, string> = {
    login: t('Войти'),
    reset: t('Отправить письмо'),
    newpassword: t('Сохранить пароль'),
    sent: t('Вернуться ко входу'),
  }

  const formHeight = 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
  return (
    <ScrollFade maxHeight={formHeight} fadeHeight={24} style={{
      position: 'fixed',
      inset: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
      background: 'var(--color-bg)',
    }}>
    <div style={{
      minHeight: formHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 28,
        padding: '28px clamp(22px, 6vw, 32px)',
        width: '100%',
        maxWidth: 402,
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--color-border-glass)',
        boxSizing: 'border-box',
      }}>
        {/* Знак Искры вместо эмодзи 👩‍🏫: вход учителя — такой же экран бренда,
            как лендинг, а эмодзи-«учительница» говорит за всех, кто входит. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <IskraMark size={36} />
          <span style={{ fontSize: 18, fontWeight: 750, color: 'var(--color-text)' }}>{t('Искра')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 16px' }}>
          <img src={`/widget-objects-v2-shadows/ui/${mode === 'sent' ? 'feed' : mode === 'reset' || mode === 'newpassword' ? 'focus' : 'trainer'}.png`} alt="" aria-hidden="true" width={104} height={104} draggable={false} style={{ width: 104, height: 104, objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: '-.03em', fontWeight: 740, color: 'var(--color-text)', margin: '0 0 6px' }}>
          {mode === 'sent' ? t('Проверьте почту') : mode === 'newpassword' ? t('Придумайте новый пароль') : t('Вход для преподавателя')}
        </h1>
        {mode !== 'sent' && <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: '0 0 22px' }}>
          {titles[mode]}
        </p>}

        {mode === 'sent' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>{titles.sent}</p>
            <button type="button" onClick={() => switchMode('login')} style={{ width: '100%', minHeight: 50, border: 0, borderRadius: 16, background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('Вернуться ко входу')}</button>
            <p style={{ color: 'var(--color-muted)', fontSize: 13, lineHeight: 1.45, margin: '18px 0 0' }}>{t('Если письма нет, проверьте папку «Спам».')}</p>
          </div>
        ) : <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(mode !== 'newpassword' || email) && (
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              readOnly={mode === 'newpassword'}
              required
              style={{
                minHeight: 54,
                lineHeight: '22px',
                padding: '12px 16px',
                borderRadius: 16,
                border: '1.5px solid var(--color-border-medium)',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
                color: 'var(--color-text)',
                WebkitTextFillColor: 'var(--color-text)',
                background: 'var(--color-bg-input)',
                opacity: mode === 'newpassword' ? 0.7 : 1,
              }}
            />
          )}
          {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input
              className="auth-input"
              // type=text + маскировка через -webkit-text-security (data-mask):
              // у настоящего type=password iOS WKWebView не рисует плейсхолдер.
              type="text"
              data-mask={!showPassword}
              placeholder={mode === 'newpassword' ? t('Новый пароль') : t('Пароль')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 54,
                lineHeight: '22px',
                padding: '12px 44px 12px 16px',
                borderRadius: 16,
                border: '1.5px solid var(--color-border-medium)',
                fontSize: 16,
                outline: 'none',
                color: 'var(--color-text)',
                WebkitTextFillColor: 'var(--color-text)',
                background: 'var(--color-bg-input)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--color-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>
          )}

          {mode === 'login' && (
            <span
              onClick={() => switchMode('reset')}
              style={{ alignSelf: 'flex-end', color: 'var(--color-purple)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: -4 }}
            >
              {t('Забыли пароль?')}
            </span>
          )}

          <AlertStack items={[
            error && { id: 'error', tone: 'danger', text: error },
            notice && { id: 'notice', tone: 'info', text: notice },
          ]} />

          <button
            type="submit"
            disabled={loading}
            style={{ height: 48,
              padding: '0 16px',
              borderRadius: 16,
              background: 'var(--grad-purple)', opacity: loading ? 0.6 : 1,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? t('Загрузка...') : buttonLabels[mode]}
          </button>
        </form>}

        {mode === 'login' && <SocialLoginButtons role="teacher" />}
        {mode === 'login' && <TeacherEmailCodeLogin onLogin={() => { clearStudentSession(); onLogin() }} />}

        {mode !== 'newpassword' && mode !== 'sent' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-muted)' }}>
            {mode === 'reset' ? (
              <span onClick={() => switchMode('login')} style={{ color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 600 }}>
                <LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Назад ко входу')} />
              </span>
            ) : (
              t('Аккаунт создаётся по ссылке-приглашению от\u00a0администратора.')
            )}
          </p>
        )}
        {Capacitor.isNativePlatform() && mode === 'login' && (
          <button type="button" onClick={() => { window.location.hash = '#/entry' }} style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--color-muted)', fontSize: 13, marginTop: 10 }}>
            <LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Выбрать роль')} />
          </button>
        )}
      </div>
    </div>
    </ScrollFade>
  )
}

