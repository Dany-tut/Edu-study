import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'

/**
 * Вход по ключу доступа (passkey, Supabase Auth). Ключ навсегда привязан к
 * домену PASSKEY_HOST (Relying Party ID в Supabase → Authentication → Passkeys):
 * сменится домен — пользователи пересоздадут ключ в «Способах входа».
 *
 * В браузере системное окно открывает сам supabase-js (navigator.credentials).
 * В приложении iOS страница живёт на capacitor://localhost, где WebAuthn не
 * работает, поэтому окно показывает нативный плагин IskraPasskey
 * (ios/App/App/PasskeyPlugin.swift), а запрос и проверку делает тот же
 * supabase-js двумя шагами — сессия остаётся в общем клиенте.
 */
export const PASSKEY_HOST = 'edu-study-app.vercel.app'

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
  if (!native() && (!window.PublicKeyCredential || window.location.hostname !== PASSKEY_HOST)) return Promise.resolve(false)
  enabledCache ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY! } })
    .then(r => (r.ok ? r.json() : {}))
    .then((d: { passkeys_enabled?: boolean }) => d.passkeys_enabled === true)
    .catch(() => { enabledCache = null; return false })
  return enabledCache
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
  return fallback
}
