import { LoopActionLabel } from '../components/icons/LoopIcon'
import { ArrowLeft as LoopBackArrow } from '../components/icons/appIcons'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff } from '../components/icons/appIcons'
import { supabase } from '../lib/supabase'
import { clearStudentSession, setStudentSession } from '../lib/studentSession'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'
import { authErrorRu } from '../lib/authErrors'
import { Alert } from '../components/Alert'
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

export default function StudentLoginPage({ recovery = false, linkExpired = false, onRecoveryComplete }: { recovery?: boolean; linkExpired?: boolean; onRecoveryComplete?: () => void }) {
  const t = useT()
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState<'login' | 'reset' | 'sent' | 'newpassword'>(recovery ? 'newpassword' : linkExpired ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const action = useAsyncTask()
  const loading = action.busy
  const [error, setError] = useState(linkExpired ? t('Ссылка устарела или уже использована. Запросите новую.') : '')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (mode !== 'newpassword') return
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email) })
  }, [mode])

  // Recovery returns through the root route. Carry the confirmation across
  // the resulting remount and consume it once on the student login screen.
  useEffect(() => {
    if (recovery || !sessionStorage.getItem('iskra:student-password-updated')) return
    sessionStorage.removeItem('iskra:student-password-updated')
    setNotice(t('Пароль обновлён. Теперь войдите с новым паролем.'))
  }, [recovery, t])

  function switchMode(next: 'login' | 'reset') {
    action.cancel(); setMode(next); setError(''); setNotice('')
  }
  function failed(err: unknown) {
    setError(t(err instanceof DOMException && err.name === 'TimeoutError'
      ? 'Сервер не ответил вовремя. Попробуйте ещё раз.'
      : authErrorRu(err && typeof err === 'object' ? err : { message: String(err) })))
  }
  function handleSubmit() {
    setError(''); setNotice('')
    if (mode === 'login') {
      if (!email.trim() || !password) return
      // Normalize email only; whitespace can be part of the password.
      void action.run(signal => studentPasswordSignIn(email.trim().toLowerCase(), password, signal), srow => {
        if (srow) {
          setStudentSession({ id: srow.id, name: srow.name, groupId: srow.group_id ?? '' })
          void trackNow('login', { role: 'student', method: 'auth' })
          const next = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('next')
          window.location.hash = next && /^#\/(homework|lesson)\//.test(next) ? next : '#/'
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
      if (!email.trim()) return
      void action.run(async signal => {
        signal.throwIfAborted()
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
        if (error) throw error
      }, () => {
        localStorage.setItem('iskra:password-recovery-role', 'student')
        setMode('sent')
      }, failed)
      return
    }
    if (mode === 'newpassword') {
      if (password.length < 6) { setError(t('Пароль должен быть не менее 6 символов')); return }
      void action.run(async signal => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        signal.throwIfAborted()
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
        if (signOutError) throw signOutError
      }, () => {
        localStorage.removeItem('iskra:password-recovery-role')
        clearStudentSession()
        setPassword(''); setNotice(t('Пароль обновлён. Теперь войдите с новым паролем.')); setMode('login')
        if (onRecoveryComplete) {
          sessionStorage.setItem('iskra:student-password-updated', '1')
          onRecoveryComplete()
        }
      }, failed)
    }
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
        {mode !== 'newpassword' && <AuthRoleHeader onLeave={() => action.cancel()} />}
        <AuthHero
          object={mode === 'sent' ? 'feed' : mode === 'reset' || mode === 'newpassword' ? 'focus' : 'practice'}
          title={mode === 'sent' ? t('Проверьте почту') : mode === 'reset' ? t('Восстановить пароль') : mode === 'newpassword' ? t('Новый пароль') : t('Вход для ученика')}
          subtitle={mode === 'login' ? t('Введите email и пароль') : mode === 'reset' ? t('Отправим ссылку для смены пароля') : mode === 'sent' ? t('Мы отправили ссылку для смены пароля.') : t('Придумайте пароль не короче 6 символов')}
        />

        {mode === 'sent' ? <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => switchMode('login')} style={{ height: 48, width: '100%', border: 0, borderRadius: 14, background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('Вернуться ко входу')}</button>
          <p style={{ margin: '16px 0 0', color: 'var(--color-muted)', fontSize: 12 }}>{t('Если письма нет, проверьте папку «Спам».')}</p>
        </div> : <form
          onSubmit={e => { e.preventDefault(); void handleSubmit() }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <AuthFadeInput className="auth-input"
            type="email"
            name="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            readOnly={mode === 'newpassword'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            style={inputStyle}
            autoFocus
          />
          {mode !== 'reset' && <div style={{ position: 'relative' }}>
            <AuthFadeInput className="auth-input"
              // Keep a real password input so Safari Password AutoFill can fill
              // the saved credential into this form.
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete={mode === 'newpassword' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'newpassword' ? t('Новый пароль') : t('Пароль')}
              aria-label={t('Пароль')}
              style={{ ...inputStyle, paddingRight: 52 }}
            />
            <button
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
          {mode === 'login' && <button type="button" onClick={() => switchMode('reset')} style={{ alignSelf: 'flex-end', minHeight: 44, padding: '0 8px', border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13, fontWeight: 650 }}>{t('Забыли пароль?')}</button>}
          <button
            type="submit"
            disabled={loading || (mode !== 'newpassword' && !email.trim()) || (mode === 'login' && !password) || (mode === 'newpassword' && !password)}
            style={{ height: 48,
              marginTop: 0, width: '100%', padding: '0 22px',
              background: 'var(--grad-purple)', opacity: loading ? 0.55 : 1,
              color: '#fff', fontWeight: 700, fontSize: 15,
              border: 'none', borderRadius: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('Загрузка...') : mode === 'reset' ? t('Отправить письмо') : mode === 'newpassword' ? t('Сохранить пароль') : t('Войти')}
          </button>
          {loading && <button type="button" onClick={() => { action.cancel(); setError('') }} style={{ minHeight: 44, border: 0, background: 'none', color: 'var(--color-text)' }}>{t('Отмена')}</button>}
          {mode === 'reset' && <button type="button" onClick={() => switchMode('login')} style={{ minHeight: 44, border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13 }}><LoopActionLabel icon={LoopBackArrow} position="start" label={t('← Назад ко входу')} /></button>}
        </form>}

        {mode === 'login' && <SocialLoginButtons role="student" />}

        {notice && <Alert tone="info" text={notice} style={{ marginTop: 12 }} />}

        {error && (
          <Alert tone="danger" text={error} style={{ marginTop: 12 }} />
        )}

        {mode === 'login' && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>{t('Если забыли пароль — обратитесь к учителю')}</div>}
      </motion.div>
      {mode === 'login' && <AuthLegalLinks />}
    </div>
    </div>
    </ScrollFade>
  )
}
