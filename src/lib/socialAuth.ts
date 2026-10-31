import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { OAuthProvider } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { setStudentSession } from './studentSession'
import { trackNow } from './analytics'

export type LoginRole = 'teacher' | 'student'

const OAUTH_ROLE_KEY = 'iskra:oauth-role'
const IOS_OAUTH_REDIRECT = 'iskra://auth/callback'

export async function startSocialLogin(provider: OAuthProvider, role: LoginRole) {
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
  if (!url.startsWith(IOS_OAUTH_REDIRECT)) return false
  const callback = new URL(url)
  const oauthError = callback.searchParams.get('error_description') || callback.searchParams.get('error')
  if (oauthError) throw new Error(oauthError)
  const code = callback.searchParams.get('code')
  if (!code) throw new Error('Apple или Google не вернули код входа')
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
  await Browser.close().catch(() => undefined)
  return true
}

/** Resolve the selected role to an existing Искра account after OAuth. */
export async function finishSocialLogin() {
  const selectedRole = localStorage.getItem(OAUTH_ROLE_KEY) as LoginRole | null
  if (!selectedRole) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: students } = await supabase
    .from('students')
    .select('id, name, group_id, created_at')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: true })
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
  const accountRole = user.user_metadata?.role
  if (accountRole === 'teacher' || accountRole === 'admin') {
    localStorage.removeItem(OAUTH_ROLE_KEY)
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
      await Browser.close().catch(() => undefined)
      onError(error instanceof Error ? error.message : 'Не удалось завершить вход')
    }
  }
  const listener = await App.addListener('appUrlOpen', ({ url }) => { void handleUrl(url) })
  const launch = await App.getLaunchUrl()
  if (launch?.url) await handleUrl(launch.url)
  return () => { void listener.remove() }
}
