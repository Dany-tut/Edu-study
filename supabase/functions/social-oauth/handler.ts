// Свой OAuth для Яндекс и ВКонтакте (провайдеров нет нативно у Supabase) +
// РЕШЕНИЕ входа: login / предложить привязку / самрег препода / «нет ученика».
//
// БЕЗОПАСНОСТЬ (ядро): edge НЕ авто-мёржит по email. Совпадение email само по
// себе доступа НЕ даёт. При совпадении возвращаем подписанный короткоживущий
// тикет (≤5 мин) и просим подтвердить владение: verified-IdP (Яндекс) —
// достаточно согласия; непроверенный (VK) — вход по коду на email существующего
// аккаунта (confirm-link под его сессией). Роль сервер-управляемая: нового
// препода заводим с app_metadata.role='teacher' (триггер handle_new_user создаёт
// profiles+пустой кабинет). Ученику самрега нет — только вход/«попроси учителя».
//
// Секреты client_id/secret — только в env функции. Тест-режим SOCIAL_OAUTH_TEST_MODE=1.
// РФ: функция проксируется api.iskra-study.ru.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

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
type Role = 'teacher' | 'student'
type Profile = { id: string; email: string | null; name: string | null }

const env = (k: string) => Deno.env.get(k) ?? ''
const isTestMode = () => env('SOCIAL_OAUTH_TEST_MODE') === '1'

/** Нормализуем email: сверка аккаунтов идёт по нижнему регистру без пробелов. */
export function normEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? '').trim().toLowerCase()
  return e && /.+@.+\..+/.test(e) ? e : null
}

/** Маска email для экрана «Вы Данил?»: d***l@mail.ru — не раскрываем полный адрес. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  const masked = user.length <= 2 ? user[0] + '*' : user[0] + '*'.repeat(Math.max(1, user.length - 2)) + user[user.length - 1]
  return `${masked}@${domain}`
}

// Яндекс подтверждает владение основным email; VK — не доверяем (нужен код).
function emailVerifiedFor(provider: Provider): boolean { return provider === 'yandex' }

/** Яндекс: code → токен → профиль (login.yandex.ru/info). */
async function yandexProfile(code: string, redirectUri: string, verifier: string | null): Promise<Profile> {
  const clientId = env('YANDEX_CLIENT_ID')
  const clientSecret = env('YANDEX_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('provider_not_configured')
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri })
  if (verifier) body.set('code_verifier', verifier)
  const tokenRes = await fetch('https://oauth.yandex.ru/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const token = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !token.access_token) throw new Error('yandex_token_failed: ' + (token.error_description || token.error || tokenRes.status))
  const infoRes = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: `OAuth ${token.access_token}` } })
  const info = await infoRes.json().catch(() => ({}))
  if (!infoRes.ok || !info.id) throw new Error('yandex_info_failed')
  return {
    id: String(info.id),
    email: normEmail(info.default_email || (Array.isArray(info.emails) ? info.emails[0] : null)),
    name: (info.real_name || info.display_name || info.login || '').trim() || null,
  }
}

/** VK ID: code → токен → профиль (id.vk.com/oauth2). Требует PKCE и device_id. */
async function vkProfile(code: string, redirectUri: string, verifier: string | null, deviceId: string | null): Promise<Profile> {
  const clientId = env('VK_CLIENT_ID')
  const clientSecret = env('VK_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('provider_not_configured')
  if (!verifier) throw new Error('vk_missing_code_verifier')
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri })
  if (deviceId) body.set('device_id', deviceId)
  const tokenRes = await fetch('https://id.vk.com/oauth2/auth', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const token = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !token.access_token) throw new Error('vk_token_failed: ' + (token.error_description || token.error || tokenRes.status))
  let email = normEmail(token.email)
  let id = token.user_id ? String(token.user_id) : ''
  let name: string | null = null
  const infoRes = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

// ── Подписанный тикет привязки (HMAC-SHA256 ключом service_role, он только на
//    сервере). Позволяет шагу «подтвердить» действовать без повторного обмена
//    уже потраченного OAuth-кода. ≤5 минут жизни. ─────────────────────────────
const enc = new TextEncoder()
function b64url(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0))
}
async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(env('SUPABASE_SERVICE_ROLE_KEY') || 'dev'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
type Ticket = { provider: Provider; provider_user_id: string; email: string; email_verified: boolean; user_id: string; role: Role; exp: number }
export async function signTicket(payload: Ticket): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body)))
  return `${body}.${sig}`
}
export async function verifyTicket(token: string): Promise<Ticket | null> {
  const [body, sig] = (token || '').split('.')
  if (!body || !sig) return null
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), b64urlToBytes(sig) as BufferSource, enc.encode(body)).catch(() => false)
  if (!ok) return null
  let p: Ticket
  try { p = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) } catch { return null }
  if (!p.exp || Date.now() > p.exp) return null
  return p
}

/** Разовый token_hash для входа в аккаунт userId (по его канонической почте). */
async function sessionForUser(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: resolved } = await admin.auth.admin.getUserById(userId)
  const email = resolved?.user?.email
  if (!email) return null
  const { data: magic, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return null
  return magic?.properties?.hashed_token ?? null
}

async function recordIdentity(admin: SupabaseClient, provider: Provider, providerUserId: string, userId: string, email: string | null) {
  await admin.from('oauth_identities').upsert(
    { provider, provider_user_id: providerUserId, user_id: userId, email, updated_at: new Date().toISOString() },
    { onConflict: 'provider,provider_user_id' },
  )
}

async function confirmLink(req: Request, admin: SupabaseClient, ticketStr: string): Promise<Response> {
  const ticket = await verifyTicket(ticketStr)
  if (!ticket) return json({ error: 'bad_ticket' }, 400)
  // verified-IdP (Яндекс/Google/Apple): провайдер подтвердил владение email
  // существующего аккаунта → привязка безопасна по одному согласию.
  if (!ticket.email_verified) {
    // Непроверенный (VK): привязка ТОЛЬКО если вызывающий доказал владение —
    // вошёл в существующий аккаунт по коду на его email (его сессия == ticket.user_id).
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user || user.id !== ticket.user_id) return json({ error: 'ownership_required' }, 401)
  }
  await recordIdentity(admin, ticket.provider, ticket.provider_user_id, ticket.user_id, ticket.email)
  const tokenHash = await sessionForUser(admin, ticket.user_id)
  if (!tokenHash) return json({ error: 'session_link_failed' }, 500)
  return json({ status: 'login', token_hash: tokenHash })
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const action = (b.action as string) || 'resolve'

  const supabaseUrl = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_misconfigured' }, 500)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  if (action === 'confirm-link') return confirmLink(req, admin, String(b.ticket ?? ''))
  if (action !== 'resolve') return json({ error: 'unknown_action' }, 400)

  const provider = b.provider as Provider
  if (provider !== 'yandex' && provider !== 'vk') return json({ error: 'unknown_provider' }, 400)
  const role: Role = b.role === 'teacher' ? 'teacher' : 'student'
  const code = String(b.code ?? '')
  const verifier = b.code_verifier ? String(b.code_verifier) : null
  const deviceId = b.device_id ? String(b.device_id) : null
  const redirectUri = String(b.redirect_uri ?? '')

  // 1) Профиль у провайдера (или тестовый).
  let profile: Profile
  let emailVerified: boolean
  try {
    if (isTestMode() && b.test_profile) {
      const tp = b.test_profile as { id?: unknown; email?: unknown; name?: unknown }
      if (!tp.id) return json({ error: 'test_profile_requires_id' }, 400)
      profile = { id: String(tp.id), email: normEmail(tp.email as string), name: tp.name ? String(tp.name) : null }
      emailVerified = b.test_email_verified !== false
    } else {
      if (!code) return json({ error: 'missing_code' }, 400)
      profile = provider === 'yandex' ? await yandexProfile(code, redirectUri, verifier) : await vkProfile(code, redirectUri, verifier, deviceId)
      emailVerified = emailVerifiedFor(provider)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'provider_error'
    return json({ error: msg }, msg === 'provider_not_configured' ? 501 : 400)
  }

  // 2) Уже знаем эту соц-личность? → сразу вход в тот аккаунт.
  const { data: known } = await admin.from('oauth_identities').select('user_id').eq('provider', provider).eq('provider_user_id', profile.id).maybeSingle()
  if (known?.user_id) {
    const tokenHash = await sessionForUser(admin, known.user_id as string)
    if (!tokenHash) return json({ error: 'session_link_failed' }, 500)
    return json({ status: 'login', token_hash: tokenHash })
  }

  // 3) Есть аккаунт с таким email? → предложить привязку (НЕ входим, НЕ мёржим).
  if (profile.email) {
    const { data: match } = await admin.rpc('auth_user_id_by_email', { p_email: profile.email })
    const hit = Array.isArray(match) ? match[0] : match
    if (hit?.user_id) {
      const ticket = await signTicket({
        provider, provider_user_id: profile.id, email: profile.email,
        email_verified: emailVerified, user_id: hit.user_id as string, role,
        exp: Date.now() + 5 * 60 * 1000,
      })
      return json({ status: 'link_candidate', email_masked: maskEmail(profile.email), requires_code: !emailVerified, name: profile.name, ticket })
    }
  }

  // 4) Совпадения нет.
  if (role === 'teacher') {
    // Самрег препода: роль ставится app_metadata.role='teacher' → триггер
    // handle_new_user заводит profiles(role=teacher) + пустой кабинет (scoped by owner).
    const loginEmail = profile.email ?? `${provider}-${profile.id}@${provider}.iskra`
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: loginEmail, email_confirm: true,
      app_metadata: { role: 'teacher' },
      user_metadata: { name: profile.name ?? undefined, [`${provider}_id`]: profile.id },
    })
    if (createErr || !created?.user) return json({ error: 'user_create_failed: ' + (createErr?.message ?? '?') }, 500)
    await recordIdentity(admin, provider, profile.id, created.user.id, profile.email)
    // Триггер handle_new_user срабатывает на INSERT в auth.users ДО того, как GoTrue
    // домешивает role в raw_app_meta_data (provider/providers пишутся отдельным шагом),
    // поэтому читает role=null и ставит profiles.role='student'. Явно приводим профиль
    // к teacher под service_role (guard_profile_role это разрешает). Идемпотентно,
    // строго ДО sessionForUser — иначе препод входит со student-профилем и гейт его
    // выбрасывает через секунду. Триггер не трогаем: student по умолчанию — верно.
    const { error: roleErr } = await admin.from('profiles').update({ role: 'teacher' }).eq('id', created.user.id)
    if (roleErr) return json({ error: 'role_set_failed: ' + roleErr.message }, 500)
    const tokenHash = await sessionForUser(admin, created.user.id)
    if (!tokenHash) return json({ error: 'session_link_failed' }, 500)
    return json({ status: 'created_teacher', token_hash: tokenHash, name: profile.name })
  }

  // Ученик без привязки — самрега нет.
  return json({ status: 'no_student' })
}
