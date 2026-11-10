import { App } from '@capacitor/app'
import { waitForLoginCode } from './mfa'
import { Browser } from '@capacitor/browser'
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearStudentSession, setStudentSession } from './studentSession'
import { rememberCabinet } from './cabinetChoice'
import { trackNow, trackEvent } from './analytics'
import { authErrorRu } from './authErrors'
import { fenceAuthCode, fenceAuthCommit } from './authTransport'
import { isPasskeyCancel, passkeyErrorRu, signInWithPasskey } from './passkey'

export type LoginRole = 'teacher' | 'student'

const OAUTH_ROLE_KEY = 'iskra:oauth-role'
const IOS_OAUTH_REDIRECT = 'iskra://auth/callback'
const LINK_KEY = 'iskra:oauth-link'
// Ученик пришёл по ссылке-приглашению и выбрал Google/Apple: после входа
// привязываем этот аккаунт к карточке из приглашения (claim_student_account).
const JOIN_KEY = 'iskra:oauth-join'
const FRIEND_RETURN_KEY = 'iskra:friend-return'
const friendRoute = /^#\/friend\?token=[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const ATTEMPT_KEY = 'iskra:oauth-attempt'
// Яндекс/VK — не нативные провайдеры Supabase, поэтому свой OAuth через
// edge-функцию `social-oauth`. Здесь храним PKCE-verifier и state между
// редиректом на провайдера и возвратом на /auth/<provider>.
const CUSTOM_KEY = 'iskra:custom-oauth'
export const CUSTOM_PROVIDERS = ['yandex', 'vk'] as const
export type CustomProvider = (typeof CUSTOM_PROVIDERS)[number]
const CUSTOM_LABEL: Record<CustomProvider, string> = { yandex: 'Яндекс', vk: 'ВКонтакте' }
const CUSTOM_CFG: Record<CustomProvider, { authorize: string; scope: string; clientId: () => string }> = {
  // client_id публичен (secret — только в edge env). Если env не задан, вход
  // ещё не настроен — кнопка отдаёт понятную ошибку, а не молча падает.
  yandex: {
    authorize: 'https://oauth.yandex.ru/authorize',
    scope: 'login:email login:info',
    clientId: () => String(import.meta.env.VITE_YANDEX_CLIENT_ID ?? ''),
  },
  vk: {
    authorize: 'https://id.vk.com/authorize',
    scope: 'email',
    clientId: () => String(import.meta.env.VITE_VK_CLIENT_ID ?? ''),
  },
}
export function isCustomProvider(p: string): p is CustomProvider {
  return (CUSTOM_PROVIDERS as readonly string[]).includes(p)
}
/** Настроен ли провайдер (есть публичный client_id в сборке). */
export function customProviderConfigured(provider: CustomProvider): boolean {
  return CUSTOM_CFG[provider].clientId() !== ''
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function randomVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(48)).buffer)
}
async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}
const googleAuth = registerPlugin<{
  open(options: { url: string }): Promise<{ url: string } | { cancelled: true }>
  cancel(): Promise<void>
}>('GoogleAuth')
let generation = 0
let oauthController: AbortController | undefined
let authTimer: ReturnType<typeof setTimeout> | undefined
function beginOAuthAttempt(provider: string, kind: 'login' | 'link') {
  clearTimeout(authTimer)
  oauthController?.abort()
  oauthController = new AbortController()
  const id = ++generation
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ provider, kind, at: Date.now() }))
  trackEvent('auth_started', { provider, kind })
  authTimer = setTimeout(() => {
    if (id !== generation || !hasPendingSocialAuth()) return
    trackEvent('auth_stalled', { provider, kind, duration_ms: 180000 })
    endOAuthAttempt('auth_cancelled')
    void Browser.close().catch(() => undefined)
    window.dispatchEvent(new CustomEvent('iskra:auth-error', { detail: 'Сервер не ответил вовремя. Попробуйте ещё раз.' }))
  }, 180000)
  return id
}
function endOAuthAttempt(event: 'auth_completed' | 'auth_cancelled' | 'auth_failed') {
  clearTimeout(authTimer)
  if (event === 'auth_cancelled') ++generation
  if (event !== 'auth_completed') oauthController?.abort()
  let context: Record<string, unknown> = {}
  try {
    const attempt = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || '{}')
    context = { provider: attempt.provider, kind: attempt.kind, duration_ms: typeof attempt.at === 'number' ? Date.now() - attempt.at : undefined }
  } catch { /* stale diagnostic context */ }
  trackEvent(event, context)
  localStorage.removeItem(ATTEMPT_KEY)
  if (event !== 'auth_completed') {
    localStorage.removeItem(OAUTH_ROLE_KEY)
    localStorage.removeItem(LINK_KEY)
    localStorage.removeItem(JOIN_KEY)
  }
}



export function cancelSocialLogin() {
  endOAuthAttempt('auth_cancelled')
  window.dispatchEvent(new Event('iskra:auth-cancelled'))
  void Browser.close().catch(() => undefined)
}

export async function connectLoginProvider(provider: 'google' | 'apple') {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Войдите в аккаунт ещё раз перед подключением.')
  localStorage.removeItem(OAUTH_ROLE_KEY)
  // back — куда вернуться после привязки: профиль учителя или кабинет ученика
  localStorage.setItem(LINK_KEY, JSON.stringify({ userId: user.id, provider, time: Date.now(), back: window.location.hash || '#/' }))
  const id = beginOAuthAttempt(provider, 'link')
  try {
    const native = Capacitor.isNativePlatform()
    const { data, error } = await supabase.auth.linkIdentity({ provider, options: {
      redirectTo: native ? IOS_OAUTH_REDIRECT : `${window.location.origin}/`,
      skipBrowserRedirect: true,
    } })
    if (id !== generation) return
    if (error) throw error
    if (!data.url) throw new Error('Не удалось открыть страницу подключения')
    if (native) await Browser.open({ url: data.url })
    else window.location.assign(data.url)
  } catch (error) {
    if (id !== generation) return
    endOAuthAttempt('auth_failed')
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
  let pending: { userId: string; provider: string; time: number; back?: string }
  try { pending = JSON.parse(raw) } catch { localStorage.removeItem(LINK_KEY); return false }
  // GoTrue may return OAuth errors in the query string (web) or fragment.
  const queryParams = new URLSearchParams(window.location.search)
  const fragmentParams = new URLSearchParams(window.location.hash.slice(1))
  const callbackError = queryParams.get('error_description') || fragmentParams.get('error_description')
  if (callbackError) {
    const message = authErrorRu({
      code: queryParams.get('error_code') || fragmentParams.get('error_code'),
      message: callbackError,
    }, 'Не удалось подключить способ входа. Попробуйте ещё раз.')
    localStorage.removeItem(LINK_KEY)
    sessionStorage.setItem('iskra:link-error', message)
    sessionStorage.setItem('iskra:link-error-provider', pending.provider)
    for (const key of ['error', 'error_code', 'error_description']) queryParams.delete(key)
    const remainingQuery = queryParams.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`)
    window.location.hash = pending.back || '#/teacher/profile'
    throw new Error(message)
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
  const back = pending.back || '#/teacher/profile'
  // ученик привязал Google/Apple к своему же аккаунту — остаётся в своём кабинете
  if (back.startsWith('#/teacher')) clearStudentSession()
  window.location.hash = back
  endOAuthAttempt('auth_completed')
  window.dispatchEvent(new Event('iskra:identity-linked'))
  return true
}

export async function startSocialLogin(provider: Provider, role: LoginRole, joinToken?: string) {
  localStorage.removeItem(LINK_KEY)
  if (joinToken) localStorage.setItem(JOIN_KEY, joinToken)
  else localStorage.removeItem(JOIN_KEY)
  if (friendRoute.test(location.hash)) sessionStorage.setItem(FRIEND_RETURN_KEY, location.hash)
  else sessionStorage.removeItem(FRIEND_RETURN_KEY)
  localStorage.setItem(OAUTH_ROLE_KEY, role)
  const id = beginOAuthAttempt(provider, 'login')
  try {
    const native = Capacitor.isNativePlatform()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: native ? IOS_OAUTH_REDIRECT : `${window.location.origin}/`,
        // Navigate once after supabase-js has stored the PKCE verifier.
        skipBrowserRedirect: true,
      },
    })
    if (id !== generation) return
    if (error) throw error
    if (native) {
      if (!data.url) throw new Error('Не удалось открыть страницу входа')
      if (provider === 'google' && Capacitor.isPluginAvailable('GoogleAuth')) {
        const signal = oauthController!.signal
        const close = () => { void googleAuth.cancel().catch(() => undefined) }
        signal.addEventListener('abort', close, { once: true })
        const result = await googleAuth.open({ url: data.url }).finally(() => signal.removeEventListener('abort', close))
        if (signal.aborted || id !== generation) return
        if ('cancelled' in result) {
          cancelSocialLogin()
          return
        }
        if (!await completeNativeSocialLogin(result.url)) throw new Error('Google вернул неверный адрес входа.')
        await finishSocialLogin()
      } else {
        await Browser.open({ url: data.url })
      }
      return
    }
    if (!data.url) throw new Error('Не удалось открыть страницу входа')
    window.location.assign(data.url)
  } catch (error) { if (id !== generation) return; endOAuthAttempt('auth_failed'); throw error }
}

/**
 * Вход ключом доступа. Роль кладём туда же, где её ждёт finishSocialLogin:
 * дальше тот же путь, что у Google/Apple (двухфакторка, кабинет, адрес).
 * Возвращает false, если человек закрыл системное окно.
 */
export async function startPasskeyLogin(role: LoginRole): Promise<boolean> {
  localStorage.removeItem(LINK_KEY)
  localStorage.removeItem(JOIN_KEY)
  if (friendRoute.test(location.hash)) sessionStorage.setItem(FRIEND_RETURN_KEY, location.hash)
  else sessionStorage.removeItem(FRIEND_RETURN_KEY)
  localStorage.setItem(OAUTH_ROLE_KEY, role)
  const id = beginOAuthAttempt('passkey', 'login')
  try {
    await signInWithPasskey()
  } catch (error) {
    if (id !== generation) return false
    if (isPasskeyCancel(error)) { endOAuthAttempt('auth_cancelled'); return false }
    endOAuthAttempt('auth_failed')
    throw new Error(passkeyErrorRu(error, 'Не удалось войти по ключу. Попробуйте ещё раз или войдите по почте.'))
  }
  if (id !== generation) return false
  await finishSocialLogin()
  return true
}

/** Запуск входа через Яндекс/VK (свой OAuth). Веб-поток: редирект на провайдера
 *  с PKCE, возврат на /auth/<provider>, обмен кода через edge-функцию. Нативку
 *  (deep-link) добавим отдельной фазой — пока на телефоне ведём в веб. */
export async function startSocialLoginCustom(provider: CustomProvider, role: LoginRole, joinToken?: string) {
  if (Capacitor.isNativePlatform()) {
    throw new Error(`Вход через ${CUSTOM_LABEL[provider]} пока доступен в веб-версии — в приложении добавим позже.`)
  }
  if (!customProviderConfigured(provider)) {
    throw new Error(`Вход через ${CUSTOM_LABEL[provider]} ещё настраивается. Попробуйте другой способ.`)
  }
  localStorage.removeItem(LINK_KEY)
  if (joinToken) localStorage.setItem(JOIN_KEY, joinToken)
  else localStorage.removeItem(JOIN_KEY)
  if (friendRoute.test(location.hash)) sessionStorage.setItem(FRIEND_RETURN_KEY, location.hash)
  else sessionStorage.removeItem(FRIEND_RETURN_KEY)
  localStorage.setItem(OAUTH_ROLE_KEY, role)
  const verifier = randomVerifier()
  const challenge = await pkceChallenge(verifier)
  const state = crypto.randomUUID()
  const redirectUri = `${window.location.origin}/auth/${provider}`
  localStorage.setItem(CUSTOM_KEY, JSON.stringify({ provider, verifier, state, redirectUri, at: Date.now() }))
  beginOAuthAttempt(provider, 'login')
  const cfg = CUSTOM_CFG[provider]
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId(),
    redirect_uri: redirectUri,
    scope: cfg.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${cfg.authorize}?${params.toString()}`)
}

/** На свежей загрузке: мы на /auth/yandex|vk с кодом провайдера? */
export function isCustomOAuthCallback(): boolean {
  return /^\/auth\/(yandex|vk)\/?$/.test(window.location.pathname)
}

/** Завершение своего OAuth на вебе: код → edge-функция → token_hash → verifyOtp.
 *  После установки сессии App ловит SIGNED_IN и зовёт finishSocialLogin —
 *  роутинг (ученик/учитель, приглашение) переиспользуется как есть. */
export async function completeCustomOAuthFromUrl(): Promise<boolean> {
  const match = window.location.pathname.match(/^\/auth\/(yandex|vk)\/?$/)
  if (!match) return false
  const provider = match[1] as CustomProvider
  const query = new URLSearchParams(window.location.search)
  // Возвращаем адрес на корень с hash-роутером, чтобы дальнейший роутинг работал.
  const resetUrl = (hash = window.location.hash || '#/entry') =>
    window.history.replaceState(null, '', `${window.location.origin}/${hash}`)

  const callbackError = query.get('error_description') || query.get('error')
  if (callbackError) {
    // Яндекс/VK на отказе возвращают error=access_denied. Отмену показываем мягко
    // отдельным событием (как у google/apple), а не как ошибку входа.
    const cancelled = query.get('error') === 'access_denied'
    localStorage.removeItem(CUSTOM_KEY)
    resetUrl()
    if (cancelled) {
      endOAuthAttempt('auth_cancelled')
      window.dispatchEvent(new Event('iskra:auth-cancelled'))
      return false
    }
    endOAuthAttempt('auth_failed')
    throw new Error(authErrorRu({ code: query.get('error'), message: callbackError }, 'Не удалось завершить вход. Попробуйте ещё раз.'))
  }

  let pending: { provider: CustomProvider; verifier: string; state: string; redirectUri: string; at: number }
  try { pending = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '') }
  catch { resetUrl(); return false }
  const code = query.get('code')
  // VK ID переименовывает наш state в redirect_state на своей authorize-странице и
  // так же может вернуть его в колбэке — принимаем оба имени, иначе сверка падала бы.
  const state = query.get('state') ?? query.get('redirect_state')
  const deviceId = query.get('device_id') // VK ID отдаёт device_id в редиректе
  if (!code || !state || pending.provider !== provider || pending.state !== state || Date.now() - pending.at > 15 * 60 * 1000) {
    localStorage.removeItem(CUSTOM_KEY)
    endOAuthAttempt('auth_failed')
    resetUrl()
    throw new Error('Время входа истекло. Попробуйте ещё раз.')
  }
  localStorage.removeItem(CUSTOM_KEY)
  resetUrl()

  const { data, error } = await supabase.functions.invoke('social-oauth', {
    body: { provider, code, code_verifier: pending.verifier, device_id: deviceId, redirect_uri: pending.redirectUri },
  })
  if (error || !data?.token_hash) {
    endOAuthAttempt('auth_failed')
    throw new Error('Не удалось завершить вход через ' + CUSTOM_LABEL[provider] + '. Попробуйте ещё раз.')
  }
  // verifyOtp ставит сессию на общий клиент → SIGNED_IN → finishSocialLogin.
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash as string, type: 'magiclink' })
  if (otpError) {
    endOAuthAttempt('auth_failed')
    throw otpError
  }
  return true
}

/** Exchanges the PKCE callback delivered by the native app URL scheme. */
export async function completeNativeSocialLogin(url: string) {
  const callback = new URL(url)
  if (callback.protocol !== 'iskra:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return false
  const oauthError = callback.searchParams.get('error_description') || callback.searchParams.get('error')
  if (oauthError) throw new Error(callback.searchParams.get('error') === 'access_denied' ? 'Вход отменён. Можно попробовать ещё раз.' : authErrorRu({ code: callback.searchParams.get('error_code'), message: oauthError }, 'Не удалось завершить вход. Попробуйте ещё раз.'))
  const code = callback.searchParams.get('code')
  const fragment = new URLSearchParams(callback.hash.slice(1))
  const fragmentError = fragment.get('error_description') || fragment.get('error')
  if (fragmentError) throw new Error(fragment.get('error') === 'access_denied' ? 'Вход отменён. Можно попробовать ещё раз.' : 'Не удалось завершить вход. Попробуйте ещё раз.')
  const access_token = fragment.get('access_token')
  const refresh_token = fragment.get('refresh_token')
  if (!code && !(access_token && refresh_token)) throw new Error('Apple или Google не вернули данные входа')
  const signal = oauthController?.signal
  const release = signal ? (code ? fenceAuthCode(code, signal) : fenceAuthCommit(access_token!, signal)) : () => undefined
  signal?.throwIfAborted()
  const request = code
    ? supabase.auth.exchangeCodeForSession(code)
    : supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! })
  const { error } = await request.finally(release)
  signal?.throwIfAborted()
  if (error) throw error
  await Browser.close().catch(() => undefined)
  return true
}

/** Resolve the selected role to an existing Искра account after OAuth. */
// Завершение может позвать и обработчик входа, и заново смонтированный App
// (после экрана кода) — делаем его один раз.
let finishing: Promise<boolean> | null = null
export function finishSocialLogin() {
  finishing ??= (async () => {
    try { return await finishSocialLoginImpl() }
    catch (error) {
      if (hasPendingSocialAuth()) endOAuthAttempt('auth_failed')
      throw error
    }
    finally { finishing = null }
  })()
  return finishing
}
async function finishSocialLoginImpl() {
  // Двухфакторная защита: база не ответит, пока не введён код (экран MfaGate).
  await waitForLoginCode()
  if (localStorage.getItem(LINK_KEY)) return finishIdentityLink()
  const query = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  if (query.has('error') || fragment.has('error')) {
    const cancelled = (query.get('error') || fragment.get('error')) === 'access_denied'
    endOAuthAttempt(cancelled ? 'auth_cancelled' : 'auth_failed')
    for (const key of ['error', 'error_code', 'error_description', 'code']) query.delete(key)
    const remaining = query.toString()
    history.replaceState(null, '', `${location.pathname}${remaining ? '?' + remaining : ''}#/entry`)
    throw new Error(cancelled ? 'Вход отменён. Можно попробовать ещё раз.' : 'Не удалось завершить вход. Попробуйте ещё раз.')
  }
  const selectedRole = localStorage.getItem(OAUTH_ROLE_KEY) as LoginRole | null
  if (!selectedRole) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  if (selectedRole === 'student') {
    const joinToken = localStorage.getItem(JOIN_KEY)
    if (joinToken) {
      localStorage.removeItem(JOIN_KEY)
      const { error: claimError } = await supabase.rpc('claim_student_account', {
        p_token: joinToken,
        p_email: user.email ?? '',
      })
      if (claimError) {
        endOAuthAttempt('auth_failed')
        await supabase.auth.signOut()
        localStorage.removeItem(OAUTH_ROLE_KEY)
        throw new Error(/already used/i.test(claimError.message)
          ? 'Это приглашение уже использовано другим аккаунтом. Попросите учителя новую ссылку.'
          : authErrorRu(claimError, 'Не удалось привязать аккаунт к приглашению. Попробуйте ещё раз.'))
      }
      void trackNow('register', { role: 'student', method: 'oauth' })
    }
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, name, group_id, created_at')
      .eq('auth_user_id', user.id)
      .order('created_at', { ascending: true })
    if (studentError) throw studentError
    const student = students?.[0]
    if (student) {
      setStudentSession({ id: student.id, name: student.name, groupId: student.group_id ?? '' })
      rememberCabinet('student')
      localStorage.removeItem(OAUTH_ROLE_KEY)
      endOAuthAttempt('auth_completed')
      void trackNow('login', { role: 'student', method: 'oauth' })
      window.location.hash = '#/'
      window.location.reload()
      return true
    }
  }

  if (selectedRole === 'teacher') {
    // Check the selected cabinet before routing: one Auth account can have
    // both a teacher profile and a linked student row.
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) throw profileError
    const accountRole = user.app_metadata?.role || profile?.role
    if (accountRole === 'teacher' || accountRole === 'admin') {
      localStorage.removeItem(OAUTH_ROLE_KEY)
      clearStudentSession()
      endOAuthAttempt('auth_completed')
      void trackNow('login', { role: 'teacher', method: 'oauth' })
      const friendReturn = sessionStorage.getItem(FRIEND_RETURN_KEY) ?? ''
      sessionStorage.removeItem(FRIEND_RETURN_KEY)
      rememberCabinet('teacher')
      // Без перезагрузки: пока вход не завершён, App держит заставку и не
      // поднимает кабинет ученика, так что чистить нечего — смена адреса
      // сразу открывает учительскую (раньше reload добавлял ещё секунду).
      window.location.hash = friendRoute.test(friendReturn) ? friendReturn : '#/teacher'
      return true
    }
  }

  endOAuthAttempt('auth_failed')
  await supabase.auth.signOut()
  localStorage.removeItem(OAUTH_ROLE_KEY)
  throw new Error(selectedRole === 'student'
    ? 'Эта учётная запись ещё не подключена к профилю ученика. Попросите учителя связать аккаунт.'
    : 'Аккаунт преподавателя создаётся по приглашению. Войдите адресом из приглашения или попросите администратора связать Google/Apple ID.')
}

/** Handles OAuth deep links on warm and cold native launches. */
export async function initializeNativeOAuth(onError: (message: string) => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined
  let callbackInProgress = false
  let cancelTimer: ReturnType<typeof setTimeout> | undefined
  const handleUrl = async (url?: string) => {
    if (callbackInProgress || !url || !url.startsWith(IOS_OAUTH_REDIRECT) || !hasPendingSocialAuth()) return
    oauthController ??= new AbortController()
    const id = generation
    callbackInProgress = true
    clearTimeout(cancelTimer)
    try {
      const handled = await completeNativeSocialLogin(url)
      if (handled) await finishSocialLogin()
    } catch (error) {
      if (id !== generation) return
      endOAuthAttempt('auth_failed')
      localStorage.removeItem(LINK_KEY)
      await Browser.close().catch(() => undefined)
      onError(error instanceof Error ? error.message : 'Не удалось завершить вход')
    } finally { callbackInProgress = false }
  }
  const listener = await App.addListener('appUrlOpen', ({ url }) => { void handleUrl(url) })
  const closed = await Browser.addListener('browserFinished', () => {
    clearTimeout(cancelTimer)
    cancelTimer = setTimeout(() => {
      if (callbackInProgress || !hasPendingSocialAuth()) return
      endOAuthAttempt('auth_cancelled')
      window.dispatchEvent(new Event('iskra:auth-cancelled'))
    }, 750)
  })
  const launch = await App.getLaunchUrl()
  if (launch?.url) await handleUrl(launch.url)
  return () => { clearTimeout(cancelTimer); void listener.remove(); void closed.remove() }
}
