import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearStudentSession, setStudentSession } from './studentSession'
import { trackNow } from './analytics'

export type LoginRole = 'teacher' | 'student'

const OAUTH_ROLE_KEY = 'iskra:oauth-role'
const IOS_OAUTH_REDIRECT = 'iskra://auth/callback'
const LINK_KEY = 'iskra:oauth-link'

export async function connectLoginProvider(provider: 'google' | 'apple') {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Войдите в аккаунт ещё раз перед подключением.')
  localStorage.removeItem(OAUTH_ROLE_KEY)
  localStorage.setItem(LINK_KEY, JSON.stringify({ userId: user.id, provider, time: Date.now() }))
  try {
    const native = Capacitor.isNativePlatform()
    const { data, error } = await supabase.auth.linkIdentity({ provider, options: {
      redirectTo: native ? IOS_OAUTH_REDIRECT : `${window.location.origin}${window.location.pathname}#/teacher/profile`,
      skipBrowserRedirect: true,
    } })
    if (error) throw error
    if (!data.url) throw new Error('Не удалось открыть страницу подключения')
    if (native) await Browser.open({ url: data.url })
    else window.location.assign(data.url)
  } catch (error) {
    localStorage.removeItem(LINK_KEY)
    throw error
  }
}

export function hasPendingSocialAuth() {
  return !!(localStorage.getItem(OAUTH_ROLE_KEY) || localStorage.getItem(LINK_KEY))
}

async function finishIdentityLink() {
  const raw = localStorage.getItem(LINK_KEY)
  if (!raw) return false
  let pending: { userId: string; provider: string; time: number }
  try { pending = JSON.parse(raw) } catch { localStorage.removeItem(LINK_KEY); return false }
  const callbackError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
  if (callbackError) {
    localStorage.removeItem(LINK_KEY)
    sessionStorage.setItem('iskra:link-error', callbackError)
    window.location.hash = '#/teacher/profile'
    throw new Error(callbackError)
  }
  if (!pending.userId || !['google', 'apple'].includes(pending.provider) || !Number.isFinite(pending.time) || Date.now() - pending.time > 15 * 60 * 1000) {
    localStorage.removeItem(LINK_KEY)
    throw new Error('Время подключения истекло. Попробуйте ещё раз из профиля.')
  }
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) return false
  if (user.id !== pending.userId) {
    localStorage.removeItem(LINK_KEY)
    await supabase.auth.signOut()
    throw new Error('Подключение вернуло другой аккаунт. Войдите по почте в исходный профиль.')
  }
  if (!user.identities?.some(identity => identity.provider === pending.provider)) return false
  localStorage.removeItem(LINK_KEY)
  window.dispatchEvent(new Event('iskra:identity-linked'))
  return true
}

export async function startSocialLogin(provider: Provider, role: LoginRole) {
  localStorage.removeItem(LINK_KEY)
  localStorage.setItem(OAUTH_ROLE_KEY, role)
  const native = Capacitor.isNativePlatform()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: native ? IOS_OAUTH_REDIRECT : `${window.location.origin}${window.location.pathname}${window.location.hash}`,
      skipBrowserRedirect: native,
    },
  })
  if (error) throw error
  if (native) {
    if (!data.url) throw new Error('Не удалось открыть страницу входа')
    await Browser.open({ url: data.url })
    return
  }
  if (!data.url) throw new Error('Не удалось открыть страницу входа')
  window.location.assign(data.url)
}

/** Exchanges the PKCE callback delivered by the native app URL scheme. */
export async function completeNativeSocialLogin(url: string) {
  const callback = new URL(url)
  if (callback.protocol !== 'iskra:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return false
  const oauthError = callback.searchParams.get('error_description') || callback.searchParams.get('error')
  if (oauthError) throw new Error(oauthError)
  const code = callback.searchParams.get('code')
  const fragment = new URLSearchParams(callback.hash.slice(1))
  const fragmentError = fragment.get('error_description') || fragment.get('error')
  if (fragmentError) throw new Error(fragmentError)
  const access_token = fragment.get('access_token')
  const refresh_token = fragment.get('refresh_token')
  if (!code && !(access_token && refresh_token)) throw new Error('Apple или Google не вернули данные входа')
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! })
  if (error) throw error
  await Browser.close().catch(() => undefined)
  return true
}

/** Resolve the selected role to an existing Искра account after OAuth. */
export async function finishSocialLogin() {
  if (localStorage.getItem(LINK_KEY)) return finishIdentityLink()
  const selectedRole = localStorage.getItem(OAUTH_ROLE_KEY) as LoginRole | null
  if (!selectedRole) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, name, group_id, created_at')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: true })
  if (studentError) throw studentError
  const student = students?.[0]
  if (student) {
    setStudentSession({ id: student.id, name: student.name, groupId: student.group_id ?? '' })
    localStorage.removeItem(OAUTH_ROLE_KEY)
    void trackNow('login', { role: 'student', method: 'oauth' })
    window.location.hash = '#/'
    window.location.reload()
    return true
  }

  // Teacher accounts are provisioned by invitation and carry a role claim.
  // Social OAuth must not turn an arbitrary identity into an Искра teacher.
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError) throw profileError
  const accountRole = user.app_metadata?.role || profile?.role
  if (accountRole === 'teacher' || accountRole === 'admin') {
    localStorage.removeItem(OAUTH_ROLE_KEY)
    clearStudentSession()
    void trackNow('login', { role: 'teacher', method: 'oauth' })
    window.location.hash = '#/teacher'
    window.location.reload()
    return true
  }

  await supabase.auth.signOut()
  localStorage.removeItem(OAUTH_ROLE_KEY)
  throw new Error(selectedRole === 'student'
    ? 'Эта учётная запись ещё не подключена к профилю ученика. Попросите учителя связать аккаунт.'
    : 'Аккаунт преподавателя создаётся по приглашению. Войдите адресом из приглашения или попросите администратора связать Google/Apple ID.')
}

/** Handles OAuth deep links on warm and cold native launches. */
export async function initializeNativeOAuth(onError: (message: string) => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined
  const handleUrl = async (url?: string) => {
    if (!url) return
    try {
      const handled = await completeNativeSocialLogin(url)
      if (handled) await finishSocialLogin()
    } catch (error) {
      localStorage.removeItem(LINK_KEY)
      await Browser.close().catch(() => undefined)
      onError(error instanceof Error ? error.message : 'Не удалось завершить вход')
    }
  }
  const listener = await App.addListener('appUrlOpen', ({ url }) => { void handleUrl(url) })
  const launch = await App.getLaunchUrl()
  if (launch?.url) await handleUrl(launch.url)
  return () => { void listener.remove() }
}
