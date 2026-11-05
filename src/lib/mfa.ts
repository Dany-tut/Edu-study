import type { Factor, Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { beginUserWait } from './userWait'

/**
 * Двухфакторная защита: код из приложения-аутентификатора (Supabase MFA TOTP)
 * и свои запасные коды (Edge Function mfa-backup, в базе — только хэши).
 */

export type MfaState = {
  /** Подтверждённый TOTP-фактор аккаунта, если защита включена. */
  factor: Factor | null
  /** Вход уже подтверждён кодом (aal2). */
  verified: boolean
  /** Вход по паролю/Google/Apple есть, а код ещё не введён. */
  needsCode: boolean
}

export async function readMfa(): Promise<MfaState> {
  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])
  const factor = factors?.totp?.find(f => f.status === 'verified') ?? null
  return {
    factor,
    verified: aal?.currentLevel === 'aal2',
    needsCode: aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2',
  }
}

export type MfaEnrollment = { factorId: string; qr: string; secret: string }

/** Новый фактор. Брошенные неподтверждённые попытки снимаем: Supabase не даёт два одноимённых. */
export async function startEnrollment(): Promise<MfaEnrollment> {
  const { data: list } = await supabase.auth.mfa.listFactors()
  for (const stale of list?.all ?? []) {
    if (stale.factor_type === 'totp' && stale.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: stale.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Искра ${new Date().toISOString().slice(0, 10)}`, issuer: 'Искра' })
  if (error) throw error
  return { factorId: data.id, qr: svgDataUrl(data.totp.qr_code), secret: data.totp.secret }
}

// supabase-js отдаёт `data:image/svg+xml;utf-8,<svg…>` с сырой разметкой: «#» и
// пробелы в ней ломают картинку в части браузеров. Кодируем разметку целиком.
function svgDataUrl(qr: string) {
  const raw = qr.replace(/^data:image\/svg\+xml;[^,]*,/, '')
  const svg = raw.trimStart().startsWith('<') ? raw : decodeURIComponent(raw)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Код из приложения: подтверждает новый фактор или вход (сессия станет aal2). */
export async function verifyCode(factorId: string, code: string, client: SupabaseClient = supabase) {
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
}

export async function cancelEnrollment(factorId: string) {
  await supabase.auth.mfa.unenroll({ factorId })
}

async function backup<T>(body: Record<string, unknown>, client: SupabaseClient = supabase): Promise<T> {
  const { data, error } = await client.functions.invoke('mfa-backup', { body })
  if (error) {
    let message = 'Не удалось выполнить запрос. Попробуйте ещё раз.'
    try { message = (await (error as { context?: Response }).context?.json())?.error || message } catch { /* оставляем общее */ }
    throw new Error(message)
  }
  return data as T
}

/** 8 новых запасных кодов. Старые гаснут. Требует подтверждённого входа (aal2). */
export const generateBackupCodes = () => backup<{ codes: string[] }>({ action: 'generate' }).then(r => r.codes)

/** Запасной код снимает защиту с аккаунта; после этого сессия обновляется. */
export async function recoverWithBackupCode(code: string, client: SupabaseClient = supabase) {
  await backup({ action: 'recover', code }, client)
  const { error } = await client.auth.refreshSession()
  if (error) throw error
}

/* ── Код до входа ──────────────────────────────────────────────────────────
 *
 * База отказывает сессии, которая у аккаунта с защитой ещё не подтверждена
 * кодом (миграция mfa_enforce). Поэтому всё, что вход читает из базы —
 * профиль ученика, роль учителя, — идёт ПОСЛЕ кода. */

function sessionAal(session: Session) {
  try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal as string | undefined }
  catch { return undefined }
}

/** У аккаунта есть подтверждённый фактор, а сессия ещё без кода. */
export const sessionNeedsCode = (session: Session | null | undefined) =>
  !!session && !!session.user.factors?.some(f => f.status === 'verified') && sessionAal(session) !== 'aal2'

export type LoginCodeRequest = { client: SupabaseClient; resolve: () => void; reject: (error: unknown) => void }
let loginRequest: LoginCodeRequest | null = null
const loginListeners = new Set<() => void>()
export const currentLoginCodeRequest = () => loginRequest
export function subscribeLoginCodeRequest(listener: () => void) {
  loginListeners.add(listener)
  return () => { loginListeners.delete(listener) }
}
function setLoginRequest(next: LoginCodeRequest | null) {
  loginRequest = next
  loginListeners.forEach(listener => listener())
}

/**
 * Вход ещё во временном клиенте (authActions): показать экран кода поверх
 * формы входа и дождаться подтверждения. После него сессия клиента — aal2.
 */
export function requestLoginCode(client: SupabaseClient, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const endWait = beginUserWait()
    const abort = () => { finish(); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')) }
    const finish = () => { endWait(); signal.removeEventListener('abort', abort); if (loginRequest?.client === client) setLoginRequest(null) }
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    setLoginRequest({
      client,
      resolve: () => { finish(); resolve() },
      reject: error => { finish(); reject(error) },
    })
  })
}

/**
 * Вход уже в общем клиенте (Google/Apple): ждать, пока человек введёт код на
 * экране MfaGate. Выход отменяет ожидание.
 */
export async function waitForLoginCode() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!sessionNeedsCode(session)) return
  await new Promise<void>((resolve, reject) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT' || !next) { subscription.unsubscribe(); reject(new Error('Вход отменён. Можно попробовать ещё раз.')); return }
      if (!sessionNeedsCode(next)) { subscription.unsubscribe(); resolve() }
    })
  })
}

export async function disableMfa(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
  await backup({ action: 'clear' }).catch(() => { /* коды без фактора ничего не открывают */ })
  await supabase.auth.refreshSession()
}

/** Сколько запасных кодов ещё не использовано. */
export async function readBackupCodesLeft(): Promise<number> {
  const { data, error } = await supabase.rpc('my_mfa_backup_codes_left')
  return error || typeof data !== 'number' ? 0 : data
}

/** Ошибки MFA по-русски. */
export function mfaErrorRu(error: unknown) {
  const e = error as { code?: string; message?: string }
  if (e?.code === 'mfa_verification_failed' || /invalid totp|verification failed/i.test(e?.message ?? '')) return 'Код не подошёл. Проверьте время на телефоне и введите новый код.'
  if (e?.code === 'mfa_challenge_expired') return 'Код устарел — введите новый из приложения.'
  if (e?.code === 'over_request_rate_limit') return 'Слишком много попыток. Подождите минуту.'
  if (e?.code === 'mfa_totp_enroll_not_enabled' || e?.code === 'mfa_totp_verify_not_enabled') return 'Двухфакторная защита пока недоступна. Обратитесь в поддержку.'
  return e?.message && /[А-Яа-я]/.test(e.message) ? e.message : 'Не получилось. Попробуйте ещё раз.'
}
