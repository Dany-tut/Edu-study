// Edge Function: запасные коды двухфакторной защиты.
//
// В Supabase Auth нет запасных кодов, поэтому храним свои — только хэши
// sha-256(user_id:код) в public.mfa_backup_codes (доступ только у service_role).
//
// POST { action: 'generate' }        — 8 новых кодов, старые гаснут. Нужен уровень aal2:
//                                       по одному паролю коды не перевыпустить.
// POST { action: 'recover', code }    — верный неиспользованный код снимает TOTP-фактор
//                                       (admin API) и гасит коды. Работает на aal1:
//                                       для этого коды и нужны. 5 ошибок за 15 минут — пауза.
// POST { action: 'clear' }            — удалить коды после отключения защиты.
//
// JWT пользователя — в Authorization; проверяется через auth.getUser().

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Без похожих символов (0/O, 1/I/L): код переписывают с бумажки.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_COUNT = 8
const MAX_FAILS = 5
const FAIL_WINDOW_MS = 15 * 60 * 1000

function newCode() {
  const bytes = new Uint8Array(10)
  let out = ''
  // Отбрасываем байты выше кратного длине алфавита — без перекоса.
  const limit = 256 - (256 % ALPHABET.length)
  while (out.length < 10) {
    crypto.getRandomValues(bytes)
    for (const b of bytes) if (b < limit && out.length < 10) out += ALPHABET[b % ALPHABET.length]
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`
}
const normalize = (code: string) => code.toUpperCase().replace(/[^0-9A-Z]/g, '')
async function hash(userId: string, code: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${normalize(code)}`))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function claims(token: string): Record<string, unknown> {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { return {} }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Не авторизован' }, 401)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const { data: userData, error: userErr } = await caller.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user || user.is_anonymous) return json({ error: 'Не авторизован' }, 401)
  // Токен только что проверен сервером Auth — его поля можно читать.
  const aal = claims(token).aal

  let body: { action?: string; code?: string }
  try { body = await req.json() } catch { return json({ error: 'Некорректный запрос' }, 400) }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: factorData, error: factorErr } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  if (factorErr) return json({ error: 'Не удалось проверить защиту' }, 500)
  const verified = (factorData?.factors ?? []).filter(f => f.factor_type === 'totp' && f.status === 'verified')

  if (body.action === 'generate') {
    if (aal !== 'aal2' || !verified.length) return json({ error: 'Сначала подтвердите вход кодом из приложения' }, 403)
    const codes = Array.from({ length: CODE_COUNT }, newCode)
    const rows = await Promise.all(codes.map(async code => ({ user_id: user.id, code_hash: await hash(user.id, code) })))
    const { error: delErr } = await admin.from('mfa_backup_codes').delete().eq('user_id', user.id)
    if (delErr) return json({ error: 'Не удалось выпустить коды' }, 500)
    const { error: insErr } = await admin.from('mfa_backup_codes').insert(rows)
    if (insErr) return json({ error: 'Не удалось выпустить коды' }, 500)
    return json({ codes })
  }

  if (body.action === 'clear') {
    if (verified.length && aal !== 'aal2') return json({ error: 'Сначала подтвердите вход кодом из приложения' }, 403)
    await admin.from('mfa_backup_codes').delete().eq('user_id', user.id)
    return json({ ok: true })
  }

  if (body.action === 'recover') {
    const code = normalize(String(body.code ?? ''))
    if (code.length !== 10) return json({ error: 'Запасной код — 10 букв и цифр' }, 400)
    if (!verified.length) return json({ error: 'Двухфакторная защита уже отключена' }, 409)
    const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString()
    const { count } = await admin.from('mfa_backup_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('at', since)
    if ((count ?? 0) >= MAX_FAILS) return json({ error: 'Слишком много попыток. Попробуйте через 15 минут.' }, 429)

    const codeHash = await hash(user.id, code)
    // Гасим код одним запросом: два одновременных входа одним кодом не пройдут оба.
    const { data: used, error: useErr } = await admin.from('mfa_backup_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('code_hash', codeHash).is('used_at', null)
      .select('id')
    if (useErr) return json({ error: 'Не удалось проверить код' }, 500)
    if (!used?.length) {
      await admin.from('mfa_backup_attempts').insert({ user_id: user.id })
      return json({ error: 'Код не подошёл или уже использован' }, 400)
    }
    for (const factor of factorData?.factors ?? []) {
      if (factor.factor_type !== 'totp') continue
      const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
      if (error) return json({ error: 'Не удалось снять защиту' }, 500)
    }
    await admin.from('mfa_backup_codes').delete().eq('user_id', user.id)
    await admin.from('mfa_backup_attempts').delete().eq('user_id', user.id)
    return json({ ok: true })
  }

  return json({ error: 'Неизвестное действие' }, 400)
})
