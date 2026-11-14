import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'

/**
 * Вход по ключу доступа (passkey, Supabase Auth). Ключ привязан к домену
 * (Relying Party ID в Supabase → Authentication → Passkeys): WebAuthn-ключ
 * с одного домена НЕ работает на другом — сменится домен, пользователи
 * пересоздадут ключ в «Способах входа».
 *
 * Переезд app на iskra-study.ru (docs/infra/domain-migration.md): кнопку ключа
 * показываем на ОБОИХ доменах из PASSKEY_HOSTS, чтобы при переключении RP ID в
 * Supabase не требовался второй деплой. Реально сработает только тот домен, что
 * сейчас выставлен RP ID в дашборде; на другом — вход по паролю/коду (он всегда
 * основной на переходе). Мост для старых ключей — Related Origin Requests
 * (public/.well-known/webauthn, отдаётся с домена RP ID), но поддержка браузеров
 * неполная, поэтому на него НЕ закладываемся.
 *
 * В браузере системное окно открывает сам supabase-js (navigator.credentials).
 * В приложении iOS страница живёт на capacitor://localhost, где WebAuthn не
 * работает, поэтому окно показывает нативный плагин IskraPasskey
 * (ios/App/App/PasskeyPlugin.swift), а запрос и проверку делает тот же
 * supabase-js двумя шагами — сессия остаётся в общем клиенте.
 */
export const PASSKEY_HOSTS = ['edu-study-app.vercel.app', 'iskra-study.ru'] as const
/** Домен RP ID по умолчанию (совместимость; UI ориентируется на PASSKEY_HOSTS). */
export const PASSKEY_HOST = PASSKEY_HOSTS[0]
function isPasskeyHost(hostname: string): boolean {
  return (PASSKEY_HOSTS as readonly string[]).includes(hostname)
}

type CredentialJSON = Record<string, unknown>
const nativePasskey = registerPlugin<{
  authenticate(options: { options: unknown }): Promise<{ credential: CredentialJSON }>
  register(options: { options: unknown }): Promise<{ credential: CredentialJSON }>
}>('IskraPasskey')

const native = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('IskraPasskey')

let enabledCache: Promise<boolean> | null = null
/** Включены ли ключи в Supabase и умеет ли их это устройство на этом домене. */
export function passkeyAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  // На превью и localhost ключи этого домена не работают — кнопку не показываем.
  if (!native() && (!window.PublicKeyCredential || !isPasskeyHost(window.location.hostname))) return Promise.resolve(false)
  enabledCache ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY! } })
    .then(r => (r.ok ? r.json() : {}))
    .then((d: { passkeys_enabled?: boolean }) => d.passkeys_enabled === true)
    .catch(() => { enabledCache = null; return false })
  return enabledCache
}

/**
 * Синхронная проверка: МОЖЕТ ли это устройство/домен показать ключ доступа —
 * ещё ДО асинхронного подтверждения серверного флага passkeys_enabled. Совпадает
 * с синхронной отсечкой в passkeyAvailable (строка выше). Нужна, чтобы с первого
 * кадра зарезервировать место под кнопку «Войти с ключом доступа» и не прыгать,
 * когда асинхронная проверка завершится (на непригодных доменах — false, слота нет).
 */
export function passkeyMaybeAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return native() || (!!window.PublicKeyCredential && isPasskeyHost(window.location.hostname))
}

export function usePasskeyAvailable(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let alive = true
    void passkeyAvailable().then(v => { if (alive) setOn(v) })
    return () => { alive = false }
  }, [])
  return on
}

/** Человек закрыл системное окно — это не ошибка, молчим. */
export function isPasskeyCancel(error: unknown): boolean {
  const e = error as { name?: string; code?: string; message?: string } | null
  return !!e && (e.name === 'NotAllowedError' || e.name === 'AbortError' || e.code === 'ERROR_CEREMONY_ABORTED'
    || e.code === 'cancelled' || /NotAllowedError|cancel|abort|отмен/i.test(e.message ?? ''))
}

export async function signInWithPasskey() {
  if (!native()) {
    const { error } = await supabase.auth.signInWithPasskey()
    if (error) throw error
    return
  }
  const { data: start, error: startError } = await supabase.auth.passkey.startAuthentication()
  if (startError || !start) throw startError ?? new Error('Не удалось начать вход по ключу.')
  const { credential } = await nativePasskey.authenticate({ options: start.options })
  const { error } = await supabase.auth.passkey.verifyAuthentication({ challengeId: start.challenge_id, credential: credential as never })
  if (error) throw error
}

export async function registerPasskey() {
  if (!native()) {
    const { error } = await supabase.auth.registerPasskey()
    if (error) throw error
    return
  }
  const { data: start, error: startError } = await supabase.auth.passkey.startRegistration()
  if (startError || !start) throw startError ?? new Error('Не удалось начать создание ключа.')
  const { credential } = await nativePasskey.register({ options: start.options })
  const { error } = await supabase.auth.passkey.verifyRegistration({ challengeId: start.challenge_id, credential: credential as never })
  if (error) throw error
}

export type PasskeyItem = { id: string; name: string; createdAt: string }

export async function listPasskeys(): Promise<PasskeyItem[]> {
  const { data, error } = await supabase.auth.passkey.list()
  if (error) throw error
  return (data ?? []).map(p => ({ id: p.id, name: p.friendly_name ?? '', createdAt: p.created_at }))
}

export async function deletePasskey(passkeyId: string) {
  const { error } = await supabase.auth.passkey.delete({ passkeyId })
  if (error) throw error
}

/** Ошибки ключа по-русски. */
export function passkeyErrorRu(error: unknown, fallback: string) {
  const e = error as { code?: string; message?: string } | null
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`
  if (/credential_exists|already|InvalidStateError/i.test(text)) return 'Этот ключ уже добавлен.'
  if (/not.?found|no.?credential|unknown credential/i.test(text)) return 'Ключ не найден. Войдите по почте и создайте ключ в «Способах входа».'
  if (/validating origin|origin.*(?:invalid|not allowed)|webauthn_verification_failed/i.test(text)) {
    return 'Вход по ключу не настроен для iskra-study.ru. Войдите через Google или почту.'
  }
  return fallback
}
