import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from '../components/icons/appIcons'
import { supabase } from '../lib/supabase'
import { clearStudentSession, setStudentSession } from '../lib/studentSession'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'
import { authErrorRu } from '../lib/authErrors'
import { Alert } from '../components/Alert'
import SocialLoginButtons from '../components/SocialLoginButtons'
import { Capacitor } from '@capacitor/core'

const inputStyle: React.CSSProperties = {
  // Explicit minHeight + lineHeight so an empty password field can't render
  // shorter than the email field — iOS Safari computes a smaller intrinsic
  // height for the password-dot glyphs, which otherwise squishes the box.
  width: '100%', padding: '12px 14px', minHeight: 50, borderRadius: 12,
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
  const [mode, setMode] = useState<'login' | 'reset' | 'sent' | 'newpassword'>(recovery ? 'newpassword' : linkExpired ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(linkExpired ? t('Ссылка устарела или уже использована. Запросите новую.') : '')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (mode !== 'newpassword') return
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email) })
  }, [mode])

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    // Normalize input the same way the browser's autofill would deliver it:
    // iOS keyboards on a home-screen PWA can auto-capitalize the email and
    // leave stray spaces around a hand-typed password, which then mismatch
    // credentials that log in fine from the browser (where Keychain autofills).
    const emailNorm = email.trim().toLowerCase()
    // Passwords are opaque credentials: unlike email, whitespace can be part
    // of a password and must be sent exactly as entered/autofilled.
    const passwordNorm = password

    // 1) Preferred path — Supabase Auth (students carry auth_user_id).
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password: passwordNorm,
    })
    if (authData?.user) {
      // A 1:1 student can own several subject cards (rows) sharing one auth_user_id,
      // so fetch all and open the earliest (primary) one. maybeSingle() would throw
      // on multiple rows — hence the ordered list + first.
      const { data: srows } = await supabase
        .from('students')
        .select('id, name, group_id, created_at')
        .eq('auth_user_id', authData.user.id)
        .order('created_at', { ascending: true })
      const srow = srows?.[0]
      if (srow) {
        setLoading(false)
        setStudentSession({ id: srow.id, name: srow.name, groupId: srow.group_id ?? '' })
        void trackNow('login', { role: 'student', method: 'auth' })
        const next = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('next')
        window.location.hash = next && /^#\/(homework|lesson)\//.test(next) ? next : '#/'
        window.location.reload()
        return
      }
      // Authed but not a student → it's a teacher/admin account. Keep the session
      // and route to the teacher cabinet instead of rejecting the login. This makes
      // one login screen work for everyone: the app opens at the student form (the
      // root URL, e.g. inside the installed PWA), and a teacher who signs in here
      // lands in their cabinet rather than seeing a false "wrong password".
      setLoading(false)
      clearStudentSession()
      void trackNow('login', { role: 'teacher', method: 'auth' })
      window.location.hash = '#/teacher'
      window.location.reload()
      return
    }

    // Раньше здесь стоял запасной путь — RPC student_login со сравнением
    // temp_password прямым равенством, для учеников без аккаунта. Таких больше
    // нет (03.09.2026), и сама функция удалена вместе с legacy-политиками:
    // перебор пароля через неё не стоил ничего, ни хеша, ни лимита попыток.
    //
    // «Неверный пароль» на любую беду — враньё: чаще всего это пропавшая сеть
    // или упёршийся лимит попыток, и человек чинит не то. Причину знает
    // authErrorRu; когда она и правда в паре логин/пароль — текст тот же.
    setLoading(false)
    setError(t(authErrorRu(authErr, 'Неверный email или пароль')))
  }

  async function handleSubmit() {
    if (mode === 'login') return handleLogin()
    if (mode === 'reset') {
      if (!email.trim()) return
      setLoading(true); setError(''); setNotice('')
      try {
        localStorage.setItem('iskra:password-recovery-role', 'student')
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
        if (resetError) throw resetError
        setMode('sent')
      } catch (err: any) { setError(t(authErrorRu(err))) }
      finally { setLoading(false) }
      return
    }
    if (mode === 'newpassword') {
      if (password.length < 6) { setError(t('Пароль должен быть не менее 6 символов')); return }
      setLoading(true); setError(''); setNotice('')
      try {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        await supabase.auth.signOut()
        localStorage.removeItem('iskra:password-recovery-role')
        clearStudentSession()
        setPassword(''); setNotice(t('Пароль обновлён. Теперь войдите с новым паролем.')); setMode('login')
        onRecoveryComplete?.()
      } catch (err: any) { setError(t(authErrorRu(err))) }
      finally { setLoading(false) }
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: `calc(env(safe-area-inset-top, 0px) + 20px) 20px calc(env(safe-area-inset-bottom, 0px) + 20px)`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24, padding: 28,
          width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-5)',
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}><img src={`/widget-objects-v1/ui/${mode === 'sent' ? 'feed' : mode === 'reset' || mode === 'newpassword' ? 'focus' : 'quiz'}.png`} alt="" aria-hidden="true" width={96} height={96} draggable={false} style={{ width: 96, height: 96, objectFit: 'contain' }} /></div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{mode === 'sent' ? t('Проверьте почту') : mode === 'reset' ? t('Восстановить пароль') : mode === 'newpassword' ? t('Новый пароль') : t('Вход в кабинет')}</div>
          <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--color-muted)', marginTop: 4 }}>{mode === 'login' ? t('Введите email и пароль') : mode === 'reset' ? t('Отправим ссылку для смены пароля') : mode === 'sent' ? t('Мы отправили ссылку для смены пароля.') : t('Придумайте пароль не короче 6 символов')}</div>
        </div>

        {mode === 'sent' ? <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => setMode('login')} style={{ height: 48, width: '100%', border: 0, borderRadius: 14, background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('Вернуться ко входу')}</button>
          <p style={{ margin: '16px 0 0', color: 'var(--color-muted)', fontSize: 12 }}>{t('Если письма нет, проверьте папку «Спам».')}</p>
        </div> : <form
          onSubmit={e => { e.preventDefault(); void handleSubmit() }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <input className="auth-input"
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
            <input className="auth-input"
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
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, color: 'var(--color-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>}
          {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setError(''); setNotice('') }} style={{ alignSelf: 'flex-end', padding: 0, border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13, fontWeight: 650 }}>{t('Забыли пароль?')}</button>}
          <button
            type="submit"
            disabled={loading || (mode !== 'newpassword' && !email.trim()) || (mode === 'login' && !password) || (mode === 'newpassword' && !password)}
            style={{ height: 48,
              marginTop: 8, width: '100%', padding: '0 22px',
              background: 'var(--grad-purple)', opacity: loading ? 0.55 : 1,
              color: '#fff', fontWeight: 700, fontSize: 15,
              border: 'none', borderRadius: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('Загрузка...') : mode === 'reset' ? t('Отправить письмо') : mode === 'newpassword' ? t('Сохранить пароль') : t('Войти')}
          </button>
          {mode === 'reset' && <button type="button" onClick={() => { setMode('login'); setError('') }} style={{ border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 13 }}>{t('← Назад ко входу')}</button>}
        </form>}

        {mode === 'login' && <SocialLoginButtons role="student" />}

        {notice && <Alert tone="info" text={notice} style={{ marginTop: 12 }} />}

        {error && (
          <Alert tone="danger" text={error} style={{ marginTop: 12 }} />
        )}

        {mode === 'login' && <div style={{ marginTop: 16, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>{t('Если забыли пароль — обратитесь к учителю')}</div>}
        {Capacitor.isNativePlatform() && (
          <button type="button" onClick={() => { window.location.hash = '#/entry' }} style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--color-muted)', fontSize: 13, marginTop: 10 }}>
            {t('← Выбрать роль')}
          </button>
        )}
      </motion.div>
    </div>
  )
}
