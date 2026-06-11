import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { setStudentSession } from '../lib/studentSession'

function getToken() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  return params.get('token')
}

type Step = 'loading' | 'form' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1.5px solid #E8E8EA', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', marginTop: 6,
}

const card: React.CSSProperties = {
  background: 'var(--color-bg-input)', borderRadius: 24, padding: 32,
  width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
}

export default function JoinPage() {
  const token = getToken()
  const [step, setStep] = useState<Step>('loading')
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setStep('error'); return }
    supabase
      .from('students')
      .select('id, name, group_id')
      .eq('invite_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStep('error'); return }
        setStudentId(data.id)
        setStudentName(data.name)
        setGroupId(data.group_id)
        setStep('form')
      })
  }, [token])

  async function handleRegister() {
    if (!email.trim() || password.length < 6) return
    setSaving(true)
    setErrorMsg('')

    // Save credentials to students table (plain text so teacher can recover)
    const { error } = await supabase
      .from('students')
      .update({ email: email.trim(), temp_password: password })
      .eq('invite_token', token)

    if (error) {
      setErrorMsg('Ошибка при сохранении. Попробуйте ещё раз.')
      setSaving(false)
      return
    }

    // Create local session and go to dashboard
    setStudentSession({ id: studentId, name: studentName, groupId })
    window.location.hash = '#/'
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
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '24px 0' }}>Загрузка...</div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Ссылка недействительна</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Попросите учителя отправить новую ссылку.</div>
          </div>
        )}

        {step === 'form' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)' }}>Добро пожаловать!</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>
                Придумайте логин и пароль для <strong style={{ color: 'var(--color-text)' }}>{studentName}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3F', display: 'flex', flexDirection: 'column' }}>
                Email (логин)
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alice@example.com"
                  style={inputStyle}
                  autoFocus
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
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                />
              </label>
            </div>

            {errorMsg && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: 'var(--color-red-soft)', borderRadius: 10, padding: '8px 12px' }}>
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
              {saving ? 'Сохранение...' : 'Войти в платформу'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
