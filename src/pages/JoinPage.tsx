import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
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

  const emailValid = email.includes('@')
  const passwordValid = password.length >= 4
  const emailTouched = email.length > 0
  const passwordTouched = password.length > 0

  async function handleRegister() {
    if (!emailValid || !passwordValid) return
    setSaving(true)
    setErrorMsg('')

    // Create a real Supabase Auth account (email confirmation is disabled, so
    // signUp returns a session immediately). Link it to the students row.
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: 'student', name: studentName } },
    })
    if (authErr || !authData.user) {
      setErrorMsg(authErr?.message || 'Ошибка при регистрации. Попробуйте ещё раз.')
      setSaving(false)
      return
    }

    // Link the auth user to the invited student row (keep temp_password as a
    // teacher-visible fallback / recovery hint).
    const authUserId = authData.user.id
    const { error } = await supabase
      .from('students')
      .update({ email: email.trim(), temp_password: password, auth_user_id: authUserId })
      .eq('invite_token', token)

    if (error) {
      setErrorMsg('Ошибка при сохранении. Попробуйте ещё раз.')
      setSaving(false)
      return
    }

    // Seed progress for the invited card and go to dashboard.
    await supabase.rpc('seed_student_progress', {
      p_student_id: studentId,
      p_group_id: groupId,
    })

    // A 1:1 student can have several subject cards — each is a separate individual
    // group + student row for the same person (grouped by name within one teacher).
    // Link EVERY such card to this same account so one login reaches all subjects.
    // Best-effort: a failure here must never block the student from getting in.
    try {
      const { data: g } = await supabase.from('groups').select('created_by').eq('id', groupId).single()
      const ownerId = (g as { created_by?: string } | null)?.created_by
      if (ownerId) {
        const { data: sibGroups } = await supabase
          .from('groups')
          .select('id, students(id)')
          .eq('is_individual', true)
          .eq('created_by', ownerId)
          .eq('name', studentName)
        for (const sg of (sibGroups ?? []) as { id: string; students: { id: string }[] }[]) {
          for (const s of sg.students ?? []) {
            if (s.id === studentId) continue
            await supabase
              .from('students')
              .update({ email: email.trim(), temp_password: password, auth_user_id: authUserId })
              .eq('id', s.id)
            await supabase.rpc('seed_student_progress', { p_student_id: s.id, p_group_id: sg.id })
          }
        }
      }
    } catch { /* linking extra cards is best-effort — never block sign-in */ }
    setStudentSession({ id: studentId, name: studentName, groupId })
    // Full reload (not a bare hash change): App's data-load effect runs once on
    // mount and only when a student_session already exists. Navigating by hash
    // alone would render the dashboard without ever calling load() — stranding a
    // freshly-registered student on an infinite "Загрузка…". Reload re-mounts App
    // with the session in place so load() fires. (StudentLoginPage does the same.)
    window.location.hash = '#/'
    window.location.reload()
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-bg)',
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email (логин)"
                  style={{ ...inputStyle, marginTop: 0, borderColor: emailTouched && !emailValid ? '#F48B91' : 'var(--color-border)' }}
                  autoFocus
                />
                {emailTouched && !emailValid && (
                  <span style={{ fontSize: 12, color: '#A8282D', marginTop: 5 }}>Укажите почту со знаком @</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Пароль"
                    style={{ ...inputStyle, marginTop: 0, paddingRight: 44, borderColor: passwordTouched && !passwordValid ? '#F48B91' : 'var(--color-border)' }}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && !passwordValid && (
                  <span style={{ fontSize: 12, color: '#A8282D', marginTop: 5 }}>Пароль должен быть не менее 4 символов</span>
                )}
              </div>
            </div>

            {errorMsg && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: 'var(--color-red-soft)', borderRadius: 10, padding: '8px 12px' }}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={!emailValid || !passwordValid || saving}
              style={{
                marginTop: 22, width: '100%', padding: '13px 0',
                background: emailValid && passwordValid ? 'var(--color-purple)' : 'rgba(155,109,255,0.35)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14,
                cursor: emailValid && passwordValid ? 'pointer' : 'not-allowed',
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
