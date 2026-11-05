import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { clearStudentSession } from '../../lib/studentSession'
import { useT } from '../../lib/i18n'
import { currentLoginCodeRequest, mfaErrorRu, recoverWithBackupCode, subscribeLoginCodeRequest, verifyCode } from '../../lib/mfa'
import { Alert } from '../Alert'
import AuthHero from '../AuthHero'
import ScrollFade from '../ScrollFade'
import { CodeCells, linkButton, primaryButton } from './MfaParts'

type GateState = 'checking' | 'open' | 'code'

/**
 * Сторож двухфакторной защиты — над всем приложением.
 * После любого входа (почта, Google, Apple), если у аккаунта есть фактор, а вход
 * ещё на уровне aal1, вместо кабинета — экран «Код подтверждения».
 * Включать защиту или нет — решает сам человек в «Способах входа».
 */
export default function MfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking')

  const check = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.is_anonymous) { setState('open'); return }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setState(aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2' ? 'code' : 'open')
  }, [])

  useEffect(() => {
    void check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void check() }, 0)
    })
    const recheck = () => { void check() }
    window.addEventListener('iskra:mfa-changed', recheck)
    return () => { subscription.unsubscribe(); window.removeEventListener('iskra:mfa-changed', recheck) }
  }, [check])

  // Вход по паролю/коду из письма: код спрашиваем поверх формы, пока сессия
  // ещё во временном клиенте и форма ждёт ответа.
  const loginRequest = useSyncExternalStore(subscribeLoginCodeRequest, currentLoginCodeRequest)
  if (loginRequest) return <>{children}<MfaChallengeScreen key="login" client={loginRequest.client} onPassed={loginRequest.resolve}
    onCancel={() => loginRequest.reject(new DOMException('Cancelled', 'AbortError'))} /></>
  if (state === 'checking') return <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }} />
  if (state === 'code') return <MfaChallengeScreen onPassed={() => void check()} />
  return <>{children}</>
}

async function signOut() {
  clearStudentSession()
  await supabase.auth.signOut().catch(() => {})
  window.location.hash = '#/'
}

function AuthShell({ children }: { children: ReactNode }) {
  return <ScrollFade maxHeight="100dvh" style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 2000 }}>
    <div className="auth-page-layout" style={{ minHeight: '100dvh' }}>
      <div className="auth-page-content"><div className="auth-page-card">{children}</div></div>
    </div>
  </ScrollFade>
}

/** «Код подтверждения»: 6 цифр из приложения или запасной код. */
export function MfaChallengeScreen({ onPassed, client = supabase, onCancel }: { onPassed: () => void; client?: SupabaseClient; onCancel?: () => void }) {
  const t = useT()
  const [backup, setBackup] = useState(false)
  const [code, setCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)

  useEffect(() => {
    void client.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) setError(mfaErrorRu(error))
      setFactorId(data?.totp?.[0]?.id ?? null)
    })
  }, [client])

  const submit = async (value = code) => {
    if (busy || value.length !== 6 || !factorId) return
    setBusy(true)
    setError('')
    try { await verifyCode(factorId, value, client); onPassed() }
    catch (e) { setError(mfaErrorRu(e)); setCode('') }
    finally { setBusy(false) }
  }
  const submitBackup = async () => {
    if (busy || backupCode.replace(/[^0-9a-z]/gi, '').length !== 10) return
    setBusy(true)
    setError('')
    try {
      await recoverWithBackupCode(backupCode, client)
      window.dispatchEvent(new Event('iskra:mfa-changed'))
      onPassed()
    }
    catch (e) { setError(mfaErrorRu(e)) }
    finally { setBusy(false) }
  }

  return <AuthShell>
    <AuthHero object="focus" title={t('Код подтверждения')}
      subtitle={t(backup ? 'Введите один из запасных кодов. После входа защита отключится — включите её заново в «Способах входа».' : 'Откройте приложение-аутентификатор и введите 6 цифр для «Искры».')} />
    {backup
      ? <form noValidate onSubmit={event => { event.preventDefault(); void submitBackup() }} style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <input className="auth-input" aria-label={t('Запасной код')} placeholder="XXXXX-XXXXX" value={backupCode} autoFocus
          onChange={event => { setBackupCode(event.target.value.toUpperCase().slice(0, 11)); setError('') }}
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" aria-invalid={!!error}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, padding: '0 16px', borderRadius: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 18, letterSpacing: '.08em', textAlign: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
        {error && <Alert tone="danger" text={t(error)} />}
        <button type="submit" disabled={busy} style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }}>{t(busy ? 'Проверяем…' : 'Войти')}</button>
        <button type="button" onClick={() => { setBackup(false); setError('') }} style={linkButton}>{t('Ввести код из приложения')}</button>
      </form>
      : <form noValidate onSubmit={event => { event.preventDefault(); void submit() }} style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <CodeCells value={code} onChange={value => { setCode(value); setError('') }} onComplete={value => void submit(value)} disabled={busy} invalid={!!error} label={t('Код из приложения')} />
        {error && <Alert tone="danger" text={t(error)} />}
        <button type="submit" disabled={busy || code.length !== 6 || !factorId} style={{ ...primaryButton, opacity: busy || code.length !== 6 ? 0.6 : 1 }}>{t(busy ? 'Проверяем…' : 'Подтвердить')}</button>
        <button type="button" onClick={() => { setBackup(true); setError('') }} style={linkButton}>{t('Использовать запасной код')}</button>
      </form>}
    <button type="button" onClick={() => { if (onCancel) onCancel(); else void signOut() }} style={{ ...linkButton, width: '100%', color: 'var(--color-muted)' }}>{t(onCancel ? 'Отмена' : 'Выйти')}</button>
  </AuthShell>
}
