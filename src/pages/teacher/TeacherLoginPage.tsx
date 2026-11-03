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
import AuthRoleHeader from '../../components/AuthRoleHeader'
import SocialLoginButtons, { AuthLegalLinks } from '../../components/SocialLoginButtons'
import AuthHero from '../../components/AuthHero'
import TeacherEmailCodeLogin from '../../components/teacher/TeacherEmailCodeLogin'
import ScrollFade from '../../components/ScrollFade'
import { useKeyboardState } from '../../lib/useKeyboardInset'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { passwordSignIn } from '../../lib/authActions'

export default function TeacherLoginPage({ onLogin, recovery = false, linkExpired = false }: { onLogin: () => void; recovery?: boolean; linkExpired?: boolean }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(linkExpired ? t('Ссылка из письма устарела или уже использована. Отправьте письмо ещё раз и откройте самое новое.') : '')
  const [notice, setNotice] = useState('')
  const action = useAsyncTask()
  const loading = action.busy
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
    action.cancel()
    setMode(next)
    setError('')
    setNotice('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setNotice('')
    const normalizedEmail = email.trim().toLowerCase()
    void action.run(async signal => {
      signal.throwIfAborted()
      if (mode === 'login') {
        await passwordSignIn(normalizedEmail, password, signal)
      } else if (mode === 'reset') {
        // Без #/teacher: Supabase дописывает токен решёткой, и второй «#» в
        // адресе ломал разбор. Форму нового пароля App показывает сам.
        // Адрес должен быть в Auth → URL Configuration → Redirect URLs.
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
        if (error) throw error
      } else if (mode === 'newpassword') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      }
    }, () => {
      if (mode === 'reset') {
        localStorage.setItem('iskra:password-recovery-role', 'teacher')
        setMode('sent')
      }
      else {
        if (mode === 'newpassword') setNotice(t('Пароль обновлён. Входим…'))
        if (mode === 'login') void trackNow('login', { role: 'teacher', method: 'auth' })
        clearStudentSession(); onLogin()
      }
    }, err => setError(err instanceof DOMException && err.name === 'TimeoutError'
      ? t('Сервер не ответил вовремя. Попробуйте ещё раз.')
      : t(authErrorRu(err instanceof Error ? err : { message: String(err) }))))
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

  const keyboard = useKeyboardState()
  const bottomInset = `max(env(safe-area-inset-bottom, 0px), ${keyboard.inset}px)`
  const formHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - ${bottomInset})`
  return (
    <ScrollFade maxHeight={formHeight} fadeHeight={24} style={{
      position: 'fixed',
      inset: `env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) ${bottomInset} env(safe-area-inset-left, 0px)`,
      background: 'var(--color-bg)',
    }}>
    <div className="auth-page-layout teacher-login-layout" style={{ minHeight: formHeight, background: 'var(--color-bg)', paddingTop: 16, paddingBottom: 16 }}>
    <div className="auth-page-content">
      <div className="auth-page-card">
        {mode !== 'newpassword' && <AuthRoleHeader logoTone="deep" onLeave={() => action.cancel()} />}
        <AuthHero
          compactTitle={mode === 'login'}
          hideArt={keyboard.open}
          object={mode === 'sent' ? 'feed' : mode === 'reset' || mode === 'newpassword' ? 'focus' : 'reminders'}
          title={mode === 'sent' ? t('Проверьте почту') : mode === 'newpassword' ? t('Придумайте новый пароль') : mode === 'reset' ? t('Восстановить пароль') : t('Вход для препода')}
          subtitle={mode === 'sent' ? undefined : titles[mode]}
        />

        {mode === 'sent' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>{titles.sent}</p>
            <button type="button" onClick={() => switchMode('login')} style={{ width: '100%', minHeight: 50, border: 0, borderRadius: 16, background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('Вернуться ко входу')}</button>
            <p style={{ color: 'var(--color-muted)', fontSize: 13, lineHeight: 1.45, margin: '18px 0 0' }}>{t('Если письма нет, проверьте папку «Спам».')}</p>
          </div>
        ) : <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                minHeight: 48,
                lineHeight: '22px',
                padding: '11px 14px',
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
                minHeight: 48,
                lineHeight: '22px',
                padding: '11px 52px 11px 14px',
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
              onMouseDown={event => event.preventDefault()}
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
              aria-pressed={showPassword}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
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
            <button type="button"
              onClick={() => switchMode('reset')}
              style={{ alignSelf: 'flex-end', minHeight: 44, padding: '0 8px', border: 0, background: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: -4 }}
            >
              {t('Забыли пароль?')}
            </button>
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
              marginTop: 0,
            }}
          >
            {loading ? t('Загрузка...') : buttonLabels[mode]}
          </button>
          {loading && <button type="button" onClick={() => { action.cancel(); setError('') }} style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>{t('Отмена')}</button>}
        </form>}

        {mode === 'login' && <SocialLoginButtons role="teacher" />}
        {mode === 'login' && <TeacherEmailCodeLogin onLogin={() => { clearStudentSession(); onLogin() }} />}

        {mode !== 'newpassword' && mode !== 'sent' && (
          <p style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
            {mode === 'reset' ? (
              <button type="button" onClick={() => switchMode('login')} style={{ minHeight: 44, border: 0, padding: 0, background: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 600 }}>
                <LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Назад ко входу')} />
              </button>
            ) : (
              t('Аккаунт — по приглашению администратора')
            )}
          </p>
        )}
      </div>
      {mode === 'login' && <AuthLegalLinks />}
    </div>
    </div>
    </ScrollFade>
  )
}

