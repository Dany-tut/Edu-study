import { LoopActionLabel } from '../../components/icons/LoopIcon'
import { ArrowLeft as LoopBackArrow } from '../../components/icons/appIcons'
import { clearStudentSession } from '../../lib/studentSession'
import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from '../../components/icons/appIcons'
import { supabase } from '../../lib/supabase'
import { trackNow } from '../../lib/analytics'
import { useT } from '../../lib/i18n'
import { AuthFeedbackProvider, AuthFeedbackSlot, authFailureFeedback, useAuthFeedback } from '../../components/AuthFeedback'
import AuthRoleHeader from '../../components/AuthRoleHeader'
import SocialLoginButtons, { AuthLegalLinks } from '../../components/SocialLoginButtons'
import AuthHero from '../../components/AuthHero'
import TeacherEmailCodeLogin from '../../components/teacher/TeacherEmailCodeLogin'
import ScrollFade from '../../components/ScrollFade'
import { useKeyboardState } from '../../lib/useKeyboardInset'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { teacherPasswordSignIn } from '../../lib/authActions'

type TeacherLoginProps = { onLogin: () => void; recovery?: boolean; linkExpired?: boolean; accessNotice?: 'denied' | 'error'; onRetryAccess?: () => void }
export default function TeacherLoginPage(props: TeacherLoginProps) {
  return <AuthFeedbackProvider><TeacherLoginForm {...props} /></AuthFeedbackProvider>
}

function TeacherLoginForm({ onLogin, recovery = false, linkExpired = false, accessNotice, onRetryAccess }: TeacherLoginProps) {
  const t = useT()
  const feedback = useAuthFeedback('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mailSent, setMailSent] = useState(false)
  const action = useAsyncTask()
  const loading = action.busy
  const [mode, setMode] = useState<'login' | 'reset' | 'newpassword' | 'code'>(recovery ? 'newpassword' : linkExpired ? 'reset' : 'login')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (mode !== 'newpassword') return
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email) })
  }, [mode])
  useEffect(() => {
    if (linkExpired) feedback.begin({ tone: 'danger', title: 'Ссылка устарела', text: 'Запросите новую ссылку.' })
  }, [linkExpired, feedback.begin])
  // Отказ/сбой проверки доступа показываем в том же слоте под полями (не над
  // полями — иначе карточка прыгает) и прячем сам через ~5 с. Для сбоя проверки
  // даём действие «Ещё раз». retryRef — чтобы новая ссылка onRetryAccess на каждый
  // рендер не перезапускала эффект и не сбрасывала таймер.
  const retryRef = useRef(onRetryAccess)
  retryRef.current = onRetryAccess
  useEffect(() => {
    if (!accessNotice) return
    feedback.begin(accessNotice === 'denied'
      ? { tone: 'danger', title: 'Нет доступа к кабинету преподавателя', text: 'Войдите под другой учётной записью преподавателя. Для ученического аккаунта выберите роль ученика.' }
      : { tone: 'danger', title: 'Не удалось проверить доступ', text: 'Проверьте подключение и попробуйте ещё раз или войдите под другой учётной записью.', action: { label: 'Ещё раз', onClick: () => retryRef.current?.() } })
    const timer = window.setTimeout(() => feedback.clear(), 5000)
    return () => window.clearTimeout(timer)
  }, [accessNotice, feedback.begin, feedback.clear])

  function switchMode(next: 'login' | 'reset' | 'code') {
    action.cancel(); feedback.reset(); setMode(next); setMailSent(false)
  }
  function editEmail(value: string) { setEmail(value); setMailSent(false); feedback.clear() }
  function editPassword(value: string) { setPassword(value); feedback.clear() }
  function cancel() {
    action.cancel()
    feedback.report({ tone: 'info', title: 'Действие отменено', text: 'Можно повторить попытку.' })
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'reset' && mailSent) { switchMode('login'); return }
    const normalizedEmail = email.trim().toLowerCase()
    if (mode !== 'newpassword' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      feedback.begin({ tone: 'danger', title: 'Проверьте email', text: 'Например, name@example.com.', invalid: 'email' }); return
    }
    if (mode === 'login' && !password) {
      feedback.begin({ tone: 'danger', title: 'Введите пароль', invalid: 'password' }); return
    }
    if (mode === 'newpassword' && password.length < 6) {
      feedback.begin({ tone: 'danger', title: 'Слишком короткий пароль', text: 'Нужно не меньше 6 символов.', invalid: 'password' }); return
    }
    feedback.begin({ tone: 'info', title: mode === 'reset' ? 'Отправляем письмо…' : mode === 'newpassword' ? 'Сохраняем пароль…' : 'Проверяем данные…', busy: true, onCancel: cancel })
    void action.run(async signal => {
      signal.throwIfAborted()
      if (mode === 'login') await teacherPasswordSignIn(normalizedEmail, password, signal)
      else if (mode === 'reset') {
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
        setMailSent(true)
        feedback.report({ tone: 'success', title: 'Письмо отправлено', text: 'Проверьте почту и папку «Спам».' })
      } else {
        feedback.report({ tone: 'success', title: mode === 'newpassword' ? 'Пароль обновлён' : 'Вход подтверждён', text: 'Открываем ваш кабинет.' })
        if (mode === 'login') void trackNow('login', { role: 'teacher', method: 'auth' })
        clearStudentSession(); onLogin()
      }
    }, error => feedback.report(authFailureFeedback(error)))
  }
  const titles: Record<typeof mode, string> = {
    login: t('Войдите в аккаунт'), reset: t('Сброс пароля'), newpassword: t('Новый пароль'), code: t('Введите код из письма'),
  }
  const buttonLabels: Record<typeof mode, string> = {
    login: t('Войти'), reset: mailSent ? t('Вернуться ко входу') : t('Отправить письмо'), newpassword: t('Сохранить пароль'), code: t('Подтвердить'),
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
        {mode !== 'newpassword' && <AuthRoleHeader logoTone="deep" onLeave={() => { action.cancel(); feedback.reset() }} />}
        <AuthHero
          compactTitle={mode === 'login'}
          hideArt={keyboard.open}
          object={mode === 'code' ? 'feed' : mode === 'reset' || mode === 'newpassword' ? 'focus' : 'reminders'}
          title={mode === 'code' ? t('Вход по коду') : mode === 'newpassword' ? t('Придумайте новый пароль') : mode === 'reset' ? t('Восстановить пароль') : t('Вход для препода')}
          subtitle={titles[mode]}
        />
        {mode === 'code' ? <TeacherEmailCodeLogin onLogin={() => { clearStudentSession(); onLogin() }} onBack={() => switchMode('login')} /> : <form noValidate aria-busy={feedback.busy} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="auth-input" aria-describedby={feedback.descriptionId}
              type="email"
              placeholder="Email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={e => editEmail(e.target.value)}
              aria-label="Email"
              aria-invalid={feedback.message?.invalid === 'email' || feedback.message?.invalid === 'credentials'}
              autoComplete="username"
              readOnly={mode === 'newpassword' || feedback.busy}
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
          {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input
              className="auth-input" aria-describedby={feedback.descriptionId}
              // type=text + маскировка через -webkit-text-security (data-mask):
              // у настоящего type=password iOS WKWebView не рисует плейсхолдер.
              type="text"
              data-mask={!showPassword}
              placeholder={mode === 'newpassword' ? t('Новый пароль') : t('Пароль')}
              value={password}
              onChange={e => editPassword(e.target.value)}
              readOnly={feedback.busy}
              aria-invalid={feedback.message?.invalid === 'password' || feedback.message?.invalid === 'credentials'}
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
            <button data-hover="layer"
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

          <AuthFeedbackSlot reserve
            idleText={mode === 'reset' ? 'Проверьте адрес почты перед отправкой.' : mode === 'newpassword' ? 'Не меньше 6 символов.' : 'Новый преподаватель? Войдите через Яндекс или VK — кабинет создастся сам'}
            idleSecondary={mode === 'login' ? 'По приглашению администратора — вход почтой и паролем' : undefined} />
          {mode === 'login' && (
            <button data-hover="layer" disabled={feedback.busy} type="button"
              onClick={() => switchMode('reset')}
              style={{ alignSelf: 'flex-end', minHeight: 44, padding: '0 8px', border: 0, background: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: -4 }}
            >
              {t('Забыли пароль?')}
            </button>
          )}

          <button data-hover="layer"
            type="submit"
            disabled={loading || feedback.busy}
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
        </form>}

        {mode === 'login' && <SocialLoginButtons role="teacher" />}
        {mode === 'login' && <button data-hover="layer" type="button" disabled={feedback.busy} onClick={() => switchMode('code')} style={{ minHeight: 44, width: '100%', marginTop: 4, padding: 0, border: 0, background: 'transparent', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 650 }}>{t('Войти по коду из письма')}</button>}

        {mode === 'reset' && <button data-hover="layer" type="button" onClick={() => switchMode('login')} style={{ minHeight: 44, width: '100%', border: 0, background: 'none', color: 'var(--color-purple)', fontWeight: 600 }}>
          <LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Назад ко входу')} />
        </button>}
      </div>
      {mode === 'login' && <AuthLegalLinks />}
    </div>
    </div>
    </ScrollFade>
  )
}

