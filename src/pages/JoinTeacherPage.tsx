import { useEffect, useState } from 'react'
import Skeleton from '../components/Skeleton'
import Checkbox from '../components/Checkbox'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'
import { authErrorRu } from '../lib/authErrors'

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
  // Explicit color + background: без них input берёт tailwind-preflight
  // `color: inherit` (светлый текст тёмной темы) на дефолтном белом фоне —
  // набранный текст становится невидимым. Как в StudentLoginPage.
  color: 'var(--color-text)', background: 'var(--color-surface)',
  WebkitTextFillColor: 'var(--color-text)',
}

const card: React.CSSProperties = {
  background: 'var(--color-bg-input)', borderRadius: 24, padding: 32,
  // maxWidth, а не width: ссылку-приглашение открывают с телефона, и жёсткие
  // 400px прижимали карточку вплотную к краям экрана, срезая её углы.
  width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
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
      setErrorMsg(t(authErrorRu(authErr, 'Ошибка при регистрации. Попробуйте ещё раз.')))
      setSaving(false)
      return
    }

    // Provision the baked-in access + content. Must succeed so the teacher lands
    // with the intended restrictions; surface a failure rather than silently
    // dropping them.
    const { error: applyErr } = await supabase.rpc('apply_teacher_invite', { p_token: token })
    if (applyErr) {
      setErrorMsg(t('Аккаунт создан, но не удалось применить настройки доступа: ') + t(authErrorRu(applyErr)))
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
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 16px)`, boxSizing: 'border-box' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={card}>
        {step === 'loading' && (
          <div style={{ padding: '24px 0' }}><Skeleton.Text lines={3} /></div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{t('Ссылка недействительна')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Возможно, приглашение уже использовано или его срок истёк. Попросите администратора отправить новое.')}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { window.location.hash = '#/'; window.location.reload() }}
                style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('На главную')}
              </button>
              <button
                onClick={() => { window.location.hash = '#/login'; window.location.reload() }}
                style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('Войти')}
              </button>
            </div>

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
                <input className="auth-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('Имя')} style={inputStyle} autoFocus />
                <input className="auth-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('Фамилия')} style={inputStyle} />
              </div>
              <input className="auth-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('Предмет (напр. Химия)')} style={inputStyle} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input className="auth-input"
                  type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('Email (логин)')}
                  style={{ ...inputStyle, borderColor: emailTouched && !emailValid ? '#F48B91' : 'var(--color-border)' }}
                />
                {emailTouched && !emailValid && <span style={{ fontSize: 12, color: 'var(--color-red-text)', marginTop: 5 }}>{t('Укажите почту со знаком @')}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <input className="auth-input"
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('Пароль')}
                    style={{ ...inputStyle, paddingRight: 44, borderColor: passwordTouched && !passwordValid ? '#F48B91' : 'var(--color-border)' }}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-muted)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && !passwordValid && <span style={{ fontSize: 12, color: 'var(--color-red-text)', marginTop: 5 }}>{t('Пароль должен быть не менее 6 символов')}</span>}
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
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-red-text)', background: 'var(--color-red-soft)', borderRadius: 10, padding: '8px 12px' }}>{errorMsg}</div>
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
