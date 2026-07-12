import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { trackNow } from '../../lib/analytics'
import { useT } from '../../lib/i18n'

export default function TeacherLoginPage({ onLogin, recovery = false }: { onLogin: () => void; recovery?: boolean }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  // Свободной регистрации нет: аккаунт учителя создаётся только по ссылке-приглашению (#/join-teacher)
  const [mode, setMode] = useState<'login' | 'reset' | 'newpassword'>(
    recovery ? 'newpassword' : 'login',
  )
  const [showPassword, setShowPassword] = useState(false)

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
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        void trackNow('login', { role: 'teacher', method: 'auth' })
        onLogin()
      } else if (mode === 'reset') {
        const redirectTo = `${window.location.origin}${window.location.pathname}#/teacher`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
        setNotice(t('Письмо для сброса пароля отправлено. Проверьте почту.'))
      } else if (mode === 'newpassword') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setNotice(t('Пароль обновлён. Входим…'))
        onLogin()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<typeof mode, string> = {
    login: t('Войдите в аккаунт'),
    reset: t('Сброс пароля'),
    newpassword: t('Новый пароль'),
  }
  const buttonLabels: Record<typeof mode, string> = {
    login: t('Войти'),
    reset: t('Отправить письмо'),
    newpassword: t('Сохранить пароль'),
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(var(--glass-rgb), 0.92)',
        backdropFilter: 'blur(20px)',
        borderRadius: 28,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        border: '1px solid var(--color-border-glass)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>👩‍🏫</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
          {t('Платформа учителя')}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: '0 0 28px' }}>
          {titles[mode]}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode !== 'newpassword' && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{
                minHeight: 50,
                lineHeight: '22px',
                padding: '13px 16px',
                borderRadius: 14,
                border: '1.5px solid var(--color-border-medium)',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
                color: 'var(--color-text)',
                WebkitTextFillColor: 'var(--color-text)',
                background: 'var(--color-bg-input)',
              }}
            />
          )}
          {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'newpassword' ? t('Новый пароль') : t('Пароль')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 50,
                lineHeight: '22px',
                padding: '13px 44px 13px 16px',
                borderRadius: 14,
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
              {showPassword ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
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

          {error && (
            <div style={{ color: 'var(--color-red-text)', fontSize: 13, padding: '8px 12px', background: 'var(--color-red-soft)', borderRadius: 10 }}>
              {error}
            </div>
          )}
          {notice && (
            <div style={{ color: 'var(--color-purple)', fontSize: 13, padding: '8px 12px', background: 'rgba(155,109,255,0.12)', borderRadius: 10 }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px 24px',
              borderRadius: 14,
              background: loading ? 'rgba(155,109,255,0.6)' : 'var(--color-purple)',
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
        </form>

        {mode !== 'newpassword' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-muted)' }}>
            {mode === 'reset' ? (
              <span onClick={() => switchMode('login')} style={{ color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 600 }}>
                {t('← Назад ко входу')}
              </span>
            ) : (
              t('Аккаунт создаётся по ссылке-приглашению от администратора.')
            )}
          </p>
        )}
      </div>
    </div>
  )
}

