import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

function getToken() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  return params.get('token')
}

type Step = 'loading' | 'form' | 'done' | 'error'

export default function JoinPage() {
  const token = getToken()
  const [step, setStep] = useState<Step>('loading')
  const [studentName, setStudentName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setStep('error'); return }
    supabase.from('students').select('name').eq('invite_token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setStep('error'); return }
        setStudentName(data.name)
        setStep('form')
      })
  }, [token])

  async function handleRegister() {
    if (!email.trim() || password.length < 6) return
    setSaving(true)
    setErrorMsg('')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setErrorMsg(authError.message); setSaving(false); return }
    if (authData.user) {
      await supabase.from('students').update({ auth_user_id: authData.user.id }).eq('invite_token', token)
    }
    setSaving(false)
    setStep('done')
  }

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 24,
    padding: 32,
    width: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '1.5px solid #E8E8EA', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginTop: 6,
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F4F4F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={card}
      >
        {step === 'loading' && (
          <div style={{ textAlign: 'center', color: '#6F6F76', padding: '24px 0' }}>Загрузка...</div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0B0B0D', marginBottom: 8 }}>Ссылка недействительна</div>
            <div style={{ fontSize: 13, color: '#6F6F76' }}>Попросите учителя отправить новую ссылку для регистрации.</div>
          </div>
        )}

        {step === 'form' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 750, color: '#0B0B0D' }}>Добро пожаловать!</div>
              <div style={{ fontSize: 14, color: '#6F6F76', marginTop: 4 }}>
                Создайте аккаунт для <strong style={{ color: '#0B0B0D' }}>{studentName}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3F', display: 'flex', flexDirection: 'column' }}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alice@example.com"
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3F', display: 'flex', flexDirection: 'column' }}>
                Пароль
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="минимум 6 символов"
                  style={inputStyle}
                />
              </label>
            </div>

            {errorMsg && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: '#FFE1E4', borderRadius: 10, padding: '8px 12px' }}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={!email.trim() || password.length < 6 || saving}
              style={{
                marginTop: 22, width: '100%', padding: '13px 0',
                background: email.trim() && password.length >= 6 ? '#9B6DFF' : '#e0d4ff',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14,
                cursor: email.trim() && password.length >= 6 ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 750, color: '#0B0B0D', marginBottom: 8 }}>Аккаунт создан!</div>
            <div style={{ fontSize: 13, color: '#6F6F76', marginBottom: 24 }}>
              Проверьте почту — туда пришло письмо для подтверждения.
            </div>
            <button
              onClick={() => { window.location.hash = '#/' }}
              style={{
                width: '100%', padding: '12px 0',
                background: '#9B6DFF', color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14, cursor: 'pointer',
              }}
            >
              Перейти в кабинет
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
