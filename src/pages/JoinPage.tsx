import { textFadeLines } from '../lib/textFades'
import OpticalText from '../components/OpticalText'
import { useEffect, useState } from 'react'
import ScrollFade from '../components/ScrollFade'
import Skeleton from '../components/Skeleton'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from '../components/icons/appIcons'
import { supabase } from '../lib/supabase'
import { setStudentSession, clearStudentSession } from '../lib/studentSession'
import { studentPasswordSignIn } from '../lib/authActions'
import { rememberCabinet } from '../lib/cabinetChoice'
import { isInAppBrowser } from '../lib/pwaInstall'
import { trackNow } from '../lib/analytics'
import { useT } from '../lib/i18n'
import { authErrorRu } from '../lib/authErrors'
import { Alert } from '../components/Alert'
import { btn } from '../lib/pillStyles'
import SocialLoginButtons from '../components/SocialLoginButtons'
import { AuthFeedbackProvider, AuthFeedbackSlot } from '../components/AuthFeedback'

function getToken() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  return params.get('token')
}

// signed — приглашение уже привязано к аккаунту, который сейчас вошёл: сразу в кабинет.
// login  — привязано к другому (или никто не вошёл): вход, а не повторная регистрация.
type Step = 'loading' | 'form' | 'error' | 'signed' | 'login'

/** Ответ Supabase «такая почта уже есть» (422 user_already_exists). */
function isAlreadyRegistered(err: { code?: string; message?: string } | null): boolean {
  return !!err && (err.code === 'user_already_exists' || /already registered|already exists/i.test(err.message ?? ''))
}

/** Встроенный браузер Telegram/VK: соц-вход и сохранение сессии там ненадёжны. */
function inAppName(): string | null {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  if ('TelegramWebviewProxy' in window || /Telegram/i.test(ua)) return 'Telegram'
  if (/VKClient|VKAndroidApp|com\.vk\./i.test(ua)) return 'VK'
  return isInAppBrowser() ? '' : null
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid var(--color-border)', fontSize: 16, minHeight: 50, lineHeight: '22px', outline: 'none',
  boxSizing: 'border-box', marginTop: 6,
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
  width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-5)',
}

export default function JoinPage() {
  const t = useT()
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
  const [emailMasked, setEmailMasked] = useState('')
  const [takenEmail, setTakenEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [copied, setCopied] = useState(false)
  const inApp = inAppName()

  useEffect(() => {
    if (!token) { setStep('error'); return }
    // Resolve via a by-token RPC (security definer) instead of a direct table
    // read — anon can no longer enumerate all invited students, only resolve a
    // token they already hold.
    let alive = true
    const apply = (row: { id?: string; name?: string; group_id?: string | null; claimed?: boolean; mine?: boolean; email_masked?: string | null } | undefined) => {
      if (!alive) return
      if (!row) { setStep('error'); return }
      // ?? '' — если RPC вернул строку без какого-то поля, в сессию не должен
      // утечь undefined (он потом даёт 400 invalid uuid в запросах кабинета).
      setStudentId(row.id ?? '')
      setStudentName(row.name ?? '')
      setGroupId(row.group_id ?? '')
      setEmailMasked(row.email_masked ?? '')
      setStep(row.claimed ? (row.mine ? 'signed' : 'login') : 'form')
    }
    // get_invite_state знает, что аккаунт уже создан. Пока миграция не
    // применена — старый get_invited_student (форма регистрации, как раньше).
    void supabase.rpc('get_invite_state', { p_token: token }).then(async ({ data, error }) => {
      if (!error) { apply((Array.isArray(data) ? data[0] : data) ?? undefined); return }
      const old = await supabase.rpc('get_invited_student', { p_token: token })
      apply(old.error ? undefined : (Array.isArray(old.data) ? old.data[0] : old.data) ?? undefined)
    })
    return () => { alive = false }
  }, [token])

  const emailValid = email.includes('@')
  const passwordValid = password.length >= 6
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
    if (isAlreadyRegistered(authErr)) {
      setTakenEmail(email.trim())
      setSaving(false)
      return
    }
    if (authErr || !authData.user) {
      setErrorMsg(t(authErrorRu(authErr, 'Ошибка при регистрации. Попробуйте ещё раз.')))
      setSaving(false)
      return
    }

    // Claim the invited card + link every sibling person_id card + seed progress,
    // all server-side via a SECURITY DEFINER RPC (migration 0038). A direct
    // students UPDATE no longer works: the anon claim policy was a security hole
    // (let anyone hijack all pending invites) and was removed, and an RLS UPDATE
    // policy can't safely bind the claim to the caller's token. The RPC binds
    // auth_user_id to auth.uid() of the just-created session, so it's both the
    // only working path and the secure one.
    const { error } = await supabase.rpc('claim_student_account', {
      p_token: token,
      p_email: email.trim(),
    })
    if (error) {
      setErrorMsg(t(authErrorRu(error, 'Ошибка при сохранении. Попробуйте ещё раз.')))
      setSaving(false)
      return
    }

    void trackNow('register', { role: 'student' })
    setStudentSession({ id: studentId, name: studentName, groupId })
    // Full reload (not a bare hash change): App's data-load effect runs once on
    // mount and only when a student_session already exists. Navigating by hash
    // alone would render the dashboard without ever calling load() — stranding a
    // freshly-registered student on an infinite "Загрузка…". Reload re-mounts App
    // with the session in place so load() fires. (StudentLoginPage does the same.)
    window.location.hash = '#/'
    window.location.reload()
  }

  function openCabinet() {
    setStudentSession({ id: studentId, name: studentName, groupId })
    rememberCabinet('student')
    window.location.hash = '#/'
    window.location.reload()
  }
  // Уже вошли этим аккаунтом — две секунды на «это я», потом кабинет сам.
  useEffect(() => {
    if (step !== 'signed') return
    const id = window.setTimeout(openCabinet, 2000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  async function otherAccount() {
    clearStudentSession()
    await supabase.auth.signOut({ scope: 'local' })
    setStep('login')
  }
  function goLogin(prefill = '') {
    setLoginEmail(prefill); setLoginPassword(''); setLoginErr(''); setTakenEmail(''); setStep('login')
  }
  async function handleLogin() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim()) || !loginPassword) { setLoginErr(t('Введите почту и пароль.')); return }
    setLoginBusy(true); setLoginErr('')
    try {
      const srow = await studentPasswordSignIn(loginEmail.trim().toLowerCase(), loginPassword, new AbortController().signal)
      if (!srow) { setLoginErr(t('Эта почта не связана с профилем ученика. Попросите учителя новую ссылку.')); setLoginBusy(false); return }
      setStudentSession({ id: srow.id, name: srow.name, groupId: srow.group_id ?? '' })
      rememberCabinet('student')
      void trackNow('login', { role: 'student', method: 'auth', via: 'invite' })
      window.location.hash = '#/'
      window.location.reload()
    } catch (e) {
      setLoginErr(t(authErrorRu(e as { code?: string; message?: string }, 'Не удалось войти. Проверьте почту и пароль.')))
      setLoginBusy(false)
    }
  }
  function forgotPassword() { window.location.hash = '#/login'; window.location.reload() }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch { setCopied(false) }
  }
  const chip = (sub: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 10px 10px', borderRadius: 16, background: 'var(--color-purple-soft)', margin: '16px 0' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--grad-purple)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>
        {studentName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{studentName}</span>
        {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-2)', ...textFadeLines(1) }}>{sub}</span>}
      </span>
    </div>
  )
  const primaryBtn = (label: string, onClick: () => void, disabled = false): React.ReactElement => (
    <button data-hover="layer" type="button" onClick={onClick} disabled={disabled}
      style={{ height: 48, width: '100%', padding: '0 22px', background: 'var(--grad-purple)', opacity: disabled ? 0.45 : 1, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <OpticalText as="iskra-button-label">{label}</OpticalText>
    </button>
  )
  const linkBtn = (label: string, onClick: () => void) => (
    <button data-hover="link" type="button" onClick={onClick} style={{ minHeight: 44, padding: '0 4px', border: 0, background: 'none', color: 'var(--color-purple)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      <OpticalText as="iskra-button-label">{label}</OpticalText>
    </button>
  )

  return (
    <ScrollFade maxHeight="100dvh" fadeHeight={24} style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)' }}>
    <div style={{
      minHeight: '100dvh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: `calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 16px)`, boxSizing: 'border-box',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        style={card}
      >
        {step === 'loading' && (
          <div style={{ padding: '24px 0' }}><Skeleton.Text lines={3} /></div>
        )}

        {inApp !== null && (step === 'form' || step === 'login') && (
          <div role="note" style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 16, background: 'var(--color-amber-soft)' }}>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-amber-text)' }}>
              {inApp ? `${t('Ссылка открыта внутри')} ${inApp}` : t('Ссылка открыта во встроенном браузере')}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-2)', marginTop: 4 }}>
              {t('Здесь не всегда работает вход через Google, Apple и VK, а вход может не сохраниться. Надёжнее — открыть ссылку в браузере: ⋯ → «Открыть в браузере».')}
            </div>
            <button data-hover="layer" type="button" onClick={copyLink} style={{ ...btn('S', 'secondary'), marginTop: 10, width: '100%' }}>
              <OpticalText as="iskra-button-label">{copied ? t('Ссылка скопирована') : t('Скопировать ссылку')}</OpticalText>
            </button>
          </div>
        )}

        {step === 'signed' && (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{t('Вы уже вошли')}</div>
            <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>{t('Это приглашение уже ваше. Открываем кабинет…')}</div>
            {chip('')}
            {primaryBtn(t('Открыть кабинет'), openCabinet)}
            <div style={{ marginTop: 6 }}>{linkBtn(t('Войти другим аккаунтом'), () => void otherAccount())}</div>
          </>
        )}

        {step === 'login' && (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{t('С возвращением!')}</div>
            <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.4 }}>
              {t('Аккаунт по этому приглашению уже создан. Войдите — регистрироваться заново не нужно.')}
            </div>
            {chip(emailMasked)}
            <form noValidate onSubmit={e => { e.preventDefault(); void handleLogin() }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="auth-input" type="email" name="username" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
                value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginErr('') }}
                placeholder={emailMasked ? `${t('Почта')}: ${emailMasked}` : t('Почта')} aria-label={t('Почта')}
                style={{ ...inputStyle, marginTop: 0 }} autoFocus={!loginEmail} />
              <div style={{ position: 'relative' }}>
                <input className="auth-input" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password"
                  value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setLoginErr('') }}
                  placeholder={t('Пароль')} aria-label={t('Пароль')} style={{ ...inputStyle, marginTop: 0, paddingRight: 52 }} autoFocus={!!loginEmail} />
                <button data-hover="layer" type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')} aria-pressed={showPassword}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-muted)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {loginErr && <Alert tone="danger" text={loginErr} />}
              <button data-hover="layer" type="submit" disabled={loginBusy}
                style={{ height: 48, width: '100%', marginTop: 4, background: 'var(--grad-purple)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 14, cursor: 'pointer', opacity: loginBusy ? 0.6 : 1 }}>
                <OpticalText as="iskra-button-label">{loginBusy ? t('Входим…') : t('Войти')}</OpticalText>
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>{linkBtn(t('Забыли пароль?'), forgotPassword)}</div>
            <AuthFeedbackProvider>
              <SocialLoginButtons role="student" />
              <div style={{ marginTop: 10 }}><AuthFeedbackSlot idleText={t('Google, Apple, Яндекс и VK сработают, если вы привязали их в профиле.')} /></div>
            </AuthFeedbackProvider>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 14 }}>{t('Это не вы? Попросите учителя новую ссылку.')}</div>
          </>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{t('Ссылка недействительна')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Попросите учителя отправить новую ссылку.')}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button data-hover="layer"
                onClick={() => { window.location.hash = '#/'; window.location.reload() }}
                style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <OpticalText as="iskra-button-label">{t('На главную')}</OpticalText>
              </button>
              <button data-hover="layer"
                onClick={() => { window.location.hash = '#/login'; window.location.reload() }}
                style={btn('M', 'secondary')}
              >
                <OpticalText as="iskra-button-label">{t('Войти')}</OpticalText>
              </button>
            </div>

          </div>
        )}

        {step === 'form' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{t('Добро пожаловать!')}</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>
                {t('Придумайте логин и пароль для')}
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>{studentName}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setTakenEmail('') }}
                  placeholder={t('Email (логин)')}
                  style={{ ...inputStyle, marginTop: 0, borderColor: emailTouched && !emailValid ? '#F48B91' : 'var(--color-border)' }}
                  autoFocus
                />
                {emailTouched && !emailValid && (
                  <span style={{ fontSize: 12, color: 'var(--color-red-text)', marginTop: 6 }}>{t('Укажите почту со знаком @')}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <input className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('Пароль')}
                    style={{ ...inputStyle, marginTop: 0, paddingRight: 52, borderColor: passwordTouched && !passwordValid ? '#F48B91' : 'var(--color-border)' }}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  />
                  <button data-hover="layer"
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')}
              aria-pressed={showPassword}
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: 44, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && !passwordValid && (
                  <span style={{ fontSize: 12, color: 'var(--color-red-text)', marginTop: 6 }}>{t('Пароль должен быть не менее 6 символов')}</span>
                )}
              </div>
            </div>

            {errorMsg && (
              <Alert tone="danger" text={errorMsg} style={{ marginTop: 12 }} />
            )}
            {takenEmail && (
              <div role="alert" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--color-red-soft, rgba(244,139,145,0.16))' }}>
                <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-red-text)' }}>{t('Эта почта уже зарегистрирована — у вас есть аккаунт.')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {primaryBtn(t('Войти с этой почтой'), () => goLogin(takenEmail))}
                  <button data-hover="layer" type="button" onClick={forgotPassword} style={{ ...btn('M', 'secondary'), width: '100%' }}>
                    <OpticalText as="iskra-button-label">{t('Забыли пароль?')}</OpticalText>
                  </button>
                </div>
              </div>
            )}

            <button data-hover="layer"
              onClick={handleRegister}
              disabled={!emailValid || !passwordValid || saving}
              style={{ height: 48,
                marginTop: 22, width: '100%', padding: '0 22px',
                background: 'var(--grad-purple)', opacity: emailValid && passwordValid ? 1 : 0.45,
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14,
                cursor: emailValid && passwordValid ? 'pointer' : 'not-allowed',
              }}
            >
              <OpticalText as="iskra-button-label">{saving ? t('Сохранение...') : t('Войти в платформу')}</OpticalText>
            </button>
            {token && <AuthFeedbackProvider>
              <SocialLoginButtons role="student" joinToken={token} />
              <div style={{ marginTop: 10 }}><AuthFeedbackSlot idleText={t('Google или Apple сразу привяжутся к твоему профилю.')} /></div>
            </AuthFeedbackProvider>}
          </>
        )}
      </motion.div>
    </div>
    </ScrollFade>
  )
}
