import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TeacherLoginPage({ onLogin, recovery = false }: { onLogin: () => void; recovery?: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'newpassword'>(
    recovery ? 'newpassword' : 'login',
  )
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true)

  function switchMode(next: 'login' | 'register' | 'reset') {
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
        onLogin()
      } else if (mode === 'register') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'teacher',
              name: fullName || email.split('@')[0],
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              subject: subject.trim(),
              analytics_consent: analyticsOptIn,
              consent_at: new Date().toISOString(),
            },
          },
        })
        if (error) throw error
        onLogin()
      } else if (mode === 'reset') {
        const redirectTo = `${window.location.origin}${window.location.pathname}#/teacher`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
        setNotice('Письмо для сброса пароля отправлено. Проверьте почту.')
      } else if (mode === 'newpassword') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setNotice('Пароль обновлён. Входим…')
        onLogin()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<typeof mode, string> = {
    login: 'Войдите в аккаунт',
    register: 'Создайте аккаунт',
    reset: 'Сброс пароля',
    newpassword: 'Новый пароль',
  }
  const buttonLabels: Record<typeof mode, string> = {
    login: 'Войти',
    register: 'Зарегистрироваться',
    reset: 'Отправить письмо',
    newpassword: 'Сохранить пароль',
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
          Платформа учителя
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: '0 0 28px' }}>
          {titles[mode]}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Имя"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--color-border-medium)',
                    fontSize: 15,
                    outline: 'none',
                    color: 'var(--color-text)',
                    background: 'var(--color-bg-input)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Фамилия"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--color-border-medium)',
                    fontSize: 15,
                    outline: 'none',
                    color: 'var(--color-text)',
                    background: 'var(--color-bg-input)',
                  }}
                />
              </div>
              <input
                type="text"
                placeholder="Предмет (например, Химия)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  border: '1.5px solid var(--color-border-medium)',
                  fontSize: 15,
                  outline: 'none',
                  color: 'var(--color-text)',
                  background: 'var(--color-bg-input)',
                }}
              />
            </>
          )}
          {mode !== 'newpassword' && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1.5px solid var(--color-border-medium)',
                fontSize: 15,
                outline: 'none',
                color: 'var(--color-text)',
                background: 'var(--color-bg-input)',
              }}
            />
          )}
          {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'newpassword' ? 'Новый пароль' : 'Пароль'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 44px 12px 16px',
                borderRadius: 14,
                border: '1.5px solid var(--color-border-medium)',
                fontSize: 15,
                outline: 'none',
                color: 'var(--color-text)',
                background: 'var(--color-bg-input)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
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
              Забыли пароль?
            </span>
          )}

          {mode === 'register' && (
            <ConsentCheckbox checked={consent} onChange={setConsent}>
              Я соглашаюсь на обработку персональных данных платформы «Искра».
            </ConsentCheckbox>
          )}

          {mode === 'register' && (
            <ConsentCheckbox checked={analyticsOptIn} onChange={setAnalyticsOptIn}>
              Помогите нам стать лучше — разрешаю анонимный сбор аналитики и метрик использования, чтобы мы улучшали платформу.
            </ConsentCheckbox>
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
            disabled={loading || (mode === 'register' && !consent)}
            style={{
              padding: '13px 24px',
              borderRadius: 14,
              background: (loading || (mode === 'register' && !consent)) ? 'rgba(155,109,255,0.6)' : 'var(--color-purple)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: (loading || (mode === 'register' && !consent)) ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Загрузка...' : buttonLabels[mode]}
          </button>
        </form>

        {mode !== 'newpassword' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-muted)' }}>
            {mode === 'reset' ? (
              <span onClick={() => switchMode('login')} style={{ color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 600 }}>
                ← Назад ко входу
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                <span
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  style={{ color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.45, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          marginTop: 1,
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: 6,
          border: `1.5px solid ${checked ? 'var(--color-purple)' : 'var(--color-border-medium)'}`,
          background: checked ? 'var(--color-purple)' : 'var(--color-bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </label>
  )
}
