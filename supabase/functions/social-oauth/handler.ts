// Свой OAuth для Яндекс и ВКонтакте — провайдеров, которых у Supabase Auth нет
// нативно. Клиент открывает authorize провайдера, получает `code`, присылает его
// сюда; функция под service_role меняет код на токен, читает профиль, заводит или
// находит пользователя Supabase, фиксирует связь в public.oauth_identities и
// возвращает `token_hash` разового magic-link. Клиент завершает вход через
// supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) — так же, как
// проект уже делает с кодами входа (см. src/lib/authActions.ts).
//
// Секреты (client_id/secret) живут ТОЛЬКО в env функции, не в бандле и не в гите.
// Пока кредов нет, функция работает в тест-режиме (SOCIAL_OAUTH_TEST_MODE=1):
// принимает заранее заданный профиль и прогоняет линковку/сессию без похода к
// провайдеру — так каркас проверяется до регистрации приложений.
//
// РФ: функция лежит на *.supabase.co/functions/v1 и уже проксируется
// api.iskra-study.ru (docs/infra/ru-proxy.md), поэтому ученикам из РФ доступна.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

type Provider = 'yandex' | 'vk'
type Profile = { id: string; email: string | null; name: string | null }

const env = (k: string) => Deno.env.get(k) ?? ''
const isTestMode = () => env('SOCIAL_OAUTH_TEST_MODE') === '1'

/** Нормализуем email: сверка аккаунтов идёт по нижнему регистру без пробелов. */
export function normEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? '').trim().toLowerCase()
  return e && /.+@.+\..+/.test(e) ? e : null
}

/** Яндекс: code → токен → профиль (login.yandex.ru/info). */
async function yandexProfile(code: string, redirectUri: string, verifier: string | null): Promise<Profile> {
  const clientId = env('YANDEX_CLIENT_ID')
  const clientSecret = env('YANDEX_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('provider_not_configured')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  })
  // Яндекс поддерживает PKCE: если клиент прислал verifier — добавляем.
  if (verifier) body.set('code_verifier', verifier)
  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const token = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !token.access_token) {
    throw new Error('yandex_token_failed: ' + (token.error_description || token.error || tokenRes.status))
  }
  const infoRes = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${token.access_token}` },
  })
  const info = await infoRes.json().catch(() => ({}))
  if (!infoRes.ok || !info.id) throw new Error('yandex_info_failed')
  return {
    id: String(info.id),
    email: normEmail(info.default_email || (Array.isArray(info.emails) ? info.emails[0] : null)),
    name: (info.real_name || info.display_name || info.login || '').trim() || null,
  }
}

/** VK ID: code → токен → профиль (id.vk.com/oauth2). Требует PKCE и device_id.
 *  Точные параметры VK ID финализируем после регистрации приложения (device_id
 *  приходит с шага authorize; клиент прокидывает его в поле device_id). */
async function vkProfile(code: string, redirectUri: string, verifier: string | null, deviceId: string | null): Promise<Profile> {
  const clientId = env('VK_CLIENT_ID')
  const clientSecret = env('VK_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('provider_not_configured')
  if (!verifier) throw new Error('vk_missing_code_verifier')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  })
  if (deviceId) body.set('device_id', deviceId)
  const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const token = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !token.access_token) {
    throw new Error('vk_token_failed: ' + (token.error_description || token.error || tokenRes.status))
  }
  // VK может вернуть email прямо в ответе токена; иначе — user_info.
  let email = normEmail(token.email)
  let id = token.user_id ? String(token.user_id) : ''
  let name: string | null = null
  const infoRes = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, access_token: token.access_token }),
  })
  const info = await infoRes.json().catch(() => ({}))
  const u = info.user ?? info
  if (u && (u.user_id || u.id)) {
    id = String(u.user_id || u.id)
    email = email || normEmail(u.email)
    name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || null
  }
  if (!id) throw new Error('vk_info_failed')
  return { id, email, name }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let provider: Provider
  let code = ''
  let verifier: string | null = null
  let deviceId: string | null = null
  let redirectUri = ''
  let testProfile: Profile | null = null
  try {
    const b = await req.json()
    provider = b.provider
    code = String(b.code ?? '')
    verifier = b.code_verifier ? String(b.code_verifier) : null
    deviceId = b.device_id ? String(b.device_id) : null
    redirectUri = String(b.redirect_uri ?? '')
    if (isTestMode() && b.test_profile) {
      testProfile = {
        id: String(b.test_profile.id ?? ''),
        email: normEmail(b.test_profile.email),
        name: b.test_profile.name ? String(b.test_profile.name) : null,
      }
    }
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (provider !== 'yandex' && provider !== 'vk') return json({ error: 'unknown_provider' }, 400)
  if (!testProfile && !code) return json({ error: 'missing_code' }, 400)

  // 1) Профиль у провайдера (или тестовый).
  let profile: Profile
  try {
    if (testProfile) {
      if (!testProfile.id) return json({ error: 'test_profile_requires_id' }, 400)
      profile = testProfile
    } else if (provider === 'yandex') {
      profile = await yandexProfile(code, redirectUri, verifier)
    } else {
      profile = await vkProfile(code, redirectUri, verifier, deviceId)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'provider_error'
    const status = msg === 'provider_not_configured' ? 501 : 400
    return json({ error: msg }, status)
  }

  const supabaseUrl = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_misconfigured' }, 500)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // 2) Личность. VK мог не дать email (регистрация по телефону) — тогда синтетический
  //    логин по стабильному id провайдера. Такой аккаунт нельзя сматчить с чужим
  //    email-аккаунтом, но id всегда узнаёт ВЕРНУВШЕГОСЯ человека без дублей.
  const syntheticEmail = `${provider}-${profile.id}@${provider}.iskra`
  const loginEmail = profile.email ?? syntheticEmail
  const hadRealEmail = !!profile.email

  // 2a) Уже знаем этого человека?
  const { data: known } = await admin
    .from('oauth_identities')
    .select('user_id')
    .eq('provider', provider)
    .eq('provider_user_id', profile.id)
    .maybeSingle()

  let userId = known?.user_id as string | undefined
  if (!userId) {
    // 2b) Новый для нас. Заводим по loginEmail; дубликат email = аккаунт уже есть
    //     (например, вошёл через Google с тем же адресом) — линкуем к нему, не
    //     плодя второй. Возвращающегося потом узнаём по id через oauth_identities.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      email_confirm: true,
      user_metadata: { name: profile.name ?? undefined, [`${provider}_id`]: profile.id },
    })
    if (created?.user) {
      userId = created.user.id
    } else if (createErr && /registered|already|exists|duplicate/i.test(createErr.message)) {
      // Существующий по email: magic-link отдаёт user в ответе — берём его id.
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink', email: loginEmail,
      })
      if (linkErr || !link?.user) return json({ error: 'link_lookup_failed' }, 500)
      userId = link.user.id
    } else {
      return json({ error: 'user_create_failed: ' + (createErr?.message ?? '?') }, 500)
    }
  }

  // 2c) Фиксируем/обновляем связь на каждом входе (email мог появиться позже).
  await admin.from('oauth_identities').upsert({
    provider, provider_user_id: profile.id, user_id: userId,
    email: profile.email, updated_at: new Date().toISOString(),
  }, { onConflict: 'provider,provider_user_id' })

  // 3) Разовый токен — ТОЛЬКО по канонической почте найденного аккаунта.
  //    У вернувшегося VK-юзера без email loginEmail=синтетика, но его реальная
  //    почта в auth может быть иной; generateLink по чужой почте увёл бы в другой
  //    аккаунт или создал дубль. Поэтому берём email из самого пользователя.
  const { data: resolved } = await admin.auth.admin.getUserById(userId)
  const linkEmail = resolved?.user?.email
  if (!linkEmail) return json({ error: 'user_without_email' }, 500)
  const { data: magic, error: magicErr } = await admin.auth.admin.generateLink({
    type: 'magiclink', email: linkEmail,
  })
  const tokenHash = magic?.properties?.hashed_token
  if (magicErr || !tokenHash) return json({ error: 'session_link_failed' }, 500)

  return json({
    token_hash: tokenHash,
    email: linkEmail,
    synthetic_email: !hadRealEmail,
    name: profile.name,
  })
}

