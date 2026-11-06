import { LoopActionLabel } from '../components/icons/LoopIcon'
import { ArrowLeft as LoopBackArrow } from '../components/icons/appIcons'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff } from '../components/icons/appIcons'
import { supabase } from '../lib/supabase'
import { clearStudentSession, setStudentSession } from '../lib/studentSession'
import { rememberCabinet } from '../lib/cabinetChoice'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'
import { AuthFeedbackProvider, AuthFeedbackSlot, authFailureFeedback, useAuthFeedback } from '../components/AuthFeedback'
import { useAsyncTask } from '../lib/useAsyncTask'
import { studentPasswordSignIn } from '../lib/authActions'
import ScrollFade from '../components/ScrollFade'
import SocialLoginButtons, { AuthLegalLinks } from '../components/SocialLoginButtons'
import AuthFadeInput from '../components/AuthFadeInput'
import AuthHero from '../components/AuthHero'
import AuthRoleHeader from '../components/AuthRoleHeader'

const inputStyle: React.CSSProperties = {
  // Explicit minHeight + lineHeight so an empty password field can't render
  // shorter than the email field — iOS Safari computes a smaller intrinsic
  // height for the password-dot glyphs, which otherwise squishes the box.
  width: '100%', padding: '11px 14px', minHeight: 48, borderRadius: 12,
  border: '1.5px solid var(--color-border-medium)', fontSize: 16,
  lineHeight: '22px', outline: 'none', boxSizing: 'border-box',
  // Explicit color + background: iOS WKWebView otherwise inherits a system
  // text color that can render white-on-white (dark system theme / autofill),
  // making typed password text invisible.
  color: 'var(--color-text)', background: 'var(--color-surface)',
  WebkitTextFillColor: 'var(--color-text)',
}

type StudentLoginProps = { recovery?: boolean; linkExpired?: boolean; onRecoveryComplete?: () => void }
export default function StudentLoginPage(props: StudentLoginProps) {
  return <AuthFeedbackProvider><StudentLoginForm {...props} /></AuthFeedbackProvider>
}

function StudentLoginForm({ recovery = false, linkExpired = false, onRecoveryComplete }: StudentLoginProps) {
  const t = useT()
  const reducedMotion = useReducedMotion()
  const feedback = useAuthFeedback('password')
  const [mode, setMode] = useState<'login' | 'reset' | 'newpassword'>(recovery ? 'newpassword' : linkExpired ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mailSent, setMailSent] = useState(false)
  const action = useAsyncTask()
  const loading = action.busy
  const switchingCabinet = new URLSearchParams(window.location.hash.split('?')[1]).get('switch') === 'student'

  useEffect(() => {
    if (mode !== 'newpassword') return
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email) })
  }, [mode])
  useEffect(() => {
    if (linkExpired) feedback.begin({ tone: 'danger', title: 'Ссылка устарела', text: 'Запросите новую ссылку.' })
  }, [linkExpired, feedback.begin])
  // Recovery returns through the root route. Carry the confirmation across
  // the resulting remount and consume it once on the student login screen.
  useEffect(() => {
    if (recovery || !sessionStorage.getItem('iskra:student-password-updated')) return
    sessionStorage.removeItem('iskra:student-password-updated')
    feedback.begin({ tone: 'success', title: 'Пароль обновлён', text: 'Теперь войдите с новым паролем.' })
  }, [recovery, feedback.begin])

  function switchMode(next: 'login' | 'reset') {
    action.cancel(); feedback.reset(); setMode(next); setMailSent(false)
  }
  function editEmail(value: string) { setEmail(value); setMailSent(false); feedback.clear() }
  function editPassword(value: string) { setPassword(value); feedback.clear() }
  function failed(error: unknown) { feedback.report(authFailureFeedback(error)) }
  function cancel() {
    action.cancel()
    feedback.report({ tone: 'info', title: 'Действие отменено', text: 'Можно повторить попытку.' })
  }
  function handleSubmit() {
    if (mode === 'reset' && mailSent) { switchMode('login'); return }
    if (mode !== 'newpassword' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      feedback.begin({ tone: 'danger', title: 'Проверьте email', text: 'Например, name@example.com.', invalid: 'email' }); return
    }
    if (mode === 'login' && !password) {
      feedback.begin({ tone: 'danger', title: 'Введите пароль', invalid: 'password' }); return
    }
    if (mode === 'newpassword' && password.length < 6) {
      feedback.begin({ tone: 'danger', title: 'Слишком короткий пароль', text: 'Нужно не меньше 6 символов.', invalid: 'password' }); return
    }
    feedback.begin({ tone: 'info', title: mode === 'reset' ? 'Отправляем письмо…' : mode === 'newpassword' ? 'Сохраняем пароль…' : 'Проверяем данные…', busy: true, onCancel: cancel })
    if (mode === 'login') {
      // Normalize email only; whitespace can be part of the password.
      void action.run(signal => studentPasswordSignIn(email.trim().toLowerCase(), password, signal), srow => {
        if (srow || !switchingCabinet) feedback.report({ tone: 'success', title: 'Вход подтверждён', text: 'Открываем ваш кабинет.' })
        if (srow) {
          setStudentSession({ id: srow.id, name: srow.name, groupId: srow.group_id ?? '' })
          rememberCabinet('student')
          void trackNow('login', { role: 'student', method: 'auth' })
          const next = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('next')
          window.location.hash = next && /^#\/(homework|lesson)\//.test(next) ? next : '#/'
        } else if (switchingCabinet) {
          clearStudentSession()
          feedback.report({ tone: 'danger', title: 'Эта учётная запись ещё не подключена к профилю ученика. Попросите учителя связать аккаунт.' })
        } else {
          // A successful empty profile read can belong to a teacher/admin.
          clearStudentSession()
          void trackNow('login', { role: 'teacher', method: 'auth' })
          window.location.hash = '#/teacher'
        }
        window.location.reload()
      }, failed)
      return
    }
    if (mode === 'reset') {
      void action.run(async signal => {
        signal.throwIfAborted()
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
        if (error) throw error
      }, () => {
        localStorage.setItem('iskra:password-recovery-role', 'student')
        setMailSent(true)
        feedback.report({ tone: 'success', title: 'Письмо отправлено', text: 'Проверьте почту и папку «Спам».' })
      }, failed)
      return
    }
    void action.run(async signal => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      signal.throwIfAborted()
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
    }, () => {
      localStorage.removeItem('iskra:password-recovery-role')
      clearStudentSession()
      setPassword(''); setMode('login')
      feedback.report({ tone: 'success', title: 'Пароль обновлён', text: 'Теперь войдите с новым паролем.' })
      if (onRecoveryComplete) {
        sessionStorage.setItem('iskra:student-password-updated', '1')
        onRecoveryComplete()
      }
    }, failed)
  }

  return (
    <ScrollFade maxHeight="100dvh" fadeHeight={24} style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)' }}>
    <div className="auth-page-layout" style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
    <div className="auth-page-content">
      <motion.div className="auth-page-card"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {mode !== 'newpassword' && <AuthRoleHeader onLeave={() => { action.cancel(); feedback.reset() }} />}
        <AuthHero
          object={mode === 'reset' || mode === 'newpassword' ? 'focus' : 'practice'}
          title={mode === 'reset' ? t('Восстановить пароль') : mode === 'newpassword' ? t('Новый пароль') : t('Вход для ученика')}
          subtitle={mode === 'login' ? t('Введите email и пароль') : mode === 'reset' ? t('Отправим ссылку для смены пароля') : t('Придумайте пароль не короче 6 символов')}
        />

        <form noValidate aria-busy={feedback.busy}
          onSubmit={e => { e.preventDefault(); void handleSubmit() }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <AuthFadeInput className="auth-input" aria-describedby={feedback.descriptionId}
            type="email"
            name="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            readOnly={mode === 'newpassword' || feedback.busy}
            value={email}
            onChange={e => editEmail(e.target.value)}
            aria-invalid={feedback.message?.invalid === 'email' || feedback.message?.invalid === 'credentials'}
            placeholder="Email"
            aria-label="Email"
            style={inputStyle}
            autoFocus
          />
          {mode !== 'reset' && <div style={{ position: 'relative' }}>
            <AuthFadeInput className="auth-input" aria-describedby={feedback.descriptionId}
              // Keep a real password input so Safari Password AutoFill can fill
              // the saved credential into this form.
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete={mode === 'newpassword' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => editPassword(e.target.value)}
              readOnly={feedback.busy}
              aria-invalid={feedback.message?.invalid === 'password' || feedback.message?.invalid === 'credentials'}
              placeholder={mode === 'newpassword' ? t('Новый пароль') : t('Пароль')}
              aria-label={t('Пароль')}
              style={{ ...inputStyle, paddingRight: 52 }}
            />
            <button data-hover="layer"
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
              aria-pressed={showPassword}
              style={{
                position: 'absolute', right: 4, top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, color: 'var(--color-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>}
          <AuthFeedbackSlot idleText={mode === 'reset' ? 'Проверьте адрес почты перед отправкой.' : mode === 'newpassword' ? 'Не меньше 6 символов.' : switchingCabinet ? 'Войдите аккаунтом, к которому привязан профиль ученика.' : 'Данные для входа выдаёт учитель.'} />
          {mode === 'login' && <button data-hover="layer" type="button" disabled={feedback.busy} onClick={() => switchMode('reset')} style={{ alignSelf: 'flex-end', minHeight: 44, padding: '0 8px', border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13, fontWeight: 650 }}>{t('Забыли пароль?')}</button>}
          <button data-hover="layer"
            type="submit"
            disabled={feedback.busy || loading || (mode !== 'newpassword' && !email.trim()) || (mode === 'login' && !password) || (mode === 'newpassword' && !password)}
            style={{ height: 48,
              marginTop: 0, width: '100%', padding: '0 22px',
              background: 'var(--grad-purple)', opacity: loading ? 0.55 : 1,
              color: '#fff', fontWeight: 700, fontSize: 15,
              border: 'none', borderRadius: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('Загрузка...') : mode === 'reset' ? (mailSent ? t('Вернуться ко входу') : t('Отправить письмо')) : mode === 'newpassword' ? t('Сохранить пароль') : t('Войти')}
          </button>
          {mode === 'reset' && <button data-hover="layer" type="button" onClick={() => switchMode('login')} style={{ minHeight: 44, border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13 }}><LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Назад ко входу')} /></button>}
        </form>

        {mode === 'login' && !(switchingCabinet && loading) && <SocialLoginButtons role="student" />}

        {mode === 'login' && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>{t('Если забыли пароль — обратитесь к учителю')}</div>}
      </motion.div>
      {mode === 'login' && <AuthLegalLinks />}
    </div>
    </div>
    </ScrollFade>
  )
}
