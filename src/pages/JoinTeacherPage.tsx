import { useEffect, useState } from 'react'
import Skeleton from '../components/Skeleton'
import Checkbox from '../components/Checkbox'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'

// Teacher self-registration from an admin invite link (#/join-teacher?token=…).
// Mirrors JoinPage: create an auth account (role: teacher), then apply the baked
// invite config (access deny-lists + course/group provisioning) via RPC, then
// full-reload into the teacher cabinet.

function getToken() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  return params.get('token')
}

type Step = 'loading' | 'form' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1.5px solid var(--color-border)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', marginTop: 0,
}

const card: React.CSSProperties = {
  background: 'var(--color-bg-input)', borderRadius: 24, padding: 32,
  width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
}

export default function JoinTeacherPage() {
  const t = useT()
  const token = getToken()
  const [step, setStep] = useState<Step>('loading')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [subject, setSubject] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [consent, setConsent] = useState(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true)

  useEffect(() => {
    if (!token) { setStep('error'); return }
    supabase.rpc('get_teacher_invite', { p_token: token }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : null
      if (error || !row || row.consumed) { setStep('error'); return }
      if (row.email) setEmail(row.email)
      setStep('form')
    })
  }, [token])

  const emailValid = email.includes('@')
  const passwordValid = password.length >= 6
  const emailTouched = email.length > 0
  const passwordTouched = password.length > 0

  async function handleRegister() {
    if (!emailValid || !passwordValid) return
    setSaving(true)
    setErrorMsg('')

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
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
    if (authErr || !authData.user) {
      setErrorMsg(authErr?.message || t('Ошибка при регистрации. Попробуйте ещё раз.'))
      setSaving(false)
      return
    }

    // Provision the baked-in access + content. Must succeed so the teacher lands
    // with the intended restrictions; surface a failure rather than silently
    // dropping them.
    const { error: applyErr } = await supabase.rpc('apply_teacher_invite', { p_token: token })
    if (applyErr) {
      setErrorMsg(t('Аккаунт создан, но не удалось применить настройки доступа: ') + applyErr.message)
      setSaving(false)
      return
    }

    void trackNow('register', { role: 'teacher' })
    // Full reload so App re-mounts with the session in place and the access store
    // reads the freshly-applied profile config.
    window.location.hash = '#/teacher'
    window.location.reload()
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={card}>
        {step === 'loading' && (
          <div style={{ padding: '24px 0' }}><Skeleton.Text lines={3} /></div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{t('Ссылка недействительна')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Возможно, приглашение уже использовано или его срок истёк. Попросите администратора отправить новое.')}</div>
          </div>
        )}

        {step === 'form' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)' }}>{t('Добро пожаловать в «Искру»!')}</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>{t('Создайте аккаунт преподавателя')}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('Имя')} style={inputStyle} autoFocus />
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('Фамилия')} style={inputStyle} />
              </div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('Предмет (напр. Химия)')} style={inputStyle} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('Email (логин)')}
                  style={{ ...inputStyle, borderColor: emailTouched && !emailValid ? '#F48B91' : 'var(--color-border)' }}
                />
                {emailTouched && !emailValid && <span style={{ fontSize: 12, color: '#A8282D', marginTop: 5 }}>{t('Укажите почту со знаком @')}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('Пароль')}
                    style={{ ...inputStyle, paddingRight: 44, borderColor: passwordTouched && !passwordValid ? '#F48B91' : 'var(--color-border)' }}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-muted)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && !passwordValid && <span style={{ fontSize: 12, color: '#A8282D', marginTop: 5 }}>{t('Пароль должен быть не менее 6 символов')}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              <ConsentRow checked={consent} onChange={setConsent}>
                {t('Я соглашаюсь на обработку персональных данных платформы «Искра».')}
              </ConsentRow>
              <ConsentRow checked={analyticsOptIn} onChange={setAnalyticsOptIn}>
                {t('Разрешаю анонимный сбор аналитики использования, чтобы платформа становилась лучше.')}
              </ConsentRow>
            </div>

            {errorMsg && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: 'var(--color-red-soft)', borderRadius: 10, padding: '8px 12px' }}>{errorMsg}</div>
            )}

            <button
              onClick={handleRegister}
              disabled={!emailValid || !passwordValid || !consent || saving}
              style={{
                marginTop: 22, width: '100%', padding: '13px 0',
                background: emailValid && passwordValid && consent ? 'var(--color-purple)' : 'rgba(155,109,255,0.35)',
                color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 14,
                cursor: emailValid && passwordValid && consent ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? t('Создаём аккаунт...') : t('Войти в платформу')}
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}

function ConsentRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      align="start"
      labelStyle={{ display: 'flex', fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.45 }}
    >
      {children}
    </Checkbox>
  )
}
