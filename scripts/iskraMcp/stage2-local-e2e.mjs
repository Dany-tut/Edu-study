// Этап 2 MCP: настоящий OAuth-токен на ЛОКАЛЬНОМ стеке Supabase (не прод).
// Что проверяет: токен помощника без секрета функции не проходит в REST,
// с секретом — проходит; обычная сессия не задета; куда ещё этот токен
// может попасть (Storage, Auth /user) — фиксирует фактом.
//
// Запуск: SB_URL=http://127.0.0.1:56321 SB_ANON=… SB_SERVICE=… DB_CONTAINER=supabase_db_iskra-mcp-stage2 \
//   GATE_KEY=… node scripts/iskraMcp/stage2-local-e2e.mjs
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const { SB_URL, SB_ANON, SB_SERVICE, DB_CONTAINER, GATE_KEY } = process.env
if (!SB_URL || !SB_ANON || !SB_SERVICE || !DB_CONTAINER || !GATE_KEY) throw new Error('env')
const sql = q => execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: q }).toString().trim()
const results = []
const check = (name, ok, info = '') => { results.push([ok ? 'ok' : 'FAIL', name, info]); console.log(ok ? 'ok  ' : 'FAIL', name, info) }
const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// 1. Учитель
const email = `t${Date.now()}@example.test`, password = 'Stage2-' + randomBytes(6).toString('hex')
let r = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { role: 'teacher' } }) })
const user = await r.json()
r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: SB_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
const session = await r.json()
check('teacher session', !!session.access_token)
sql(`insert into public.students (id, name, created_by) values (gen_random_uuid(), 'Натали', '${user.id}');`)

// 2. OAuth: регистрация клиента, authorize, согласие, обмен кода
const redirect = 'http://localhost:9999/cb'
r = await fetch(`${SB_URL}/auth/v1/oauth/clients/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_ANON },
  body: JSON.stringify({ client_name: 'Claude', redirect_uris: [redirect], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) })
const client = await r.json()
check('DCR client', !!client.client_id, r.status + '')
const verifier = b64url(randomBytes(32)), challenge = b64url(createHash('sha256').update(verifier).digest())
const auth = new URL(`${SB_URL}/auth/v1/oauth/authorize`)
Object.entries({ response_type: 'code', client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'S256', state: 's1', scope: 'email' }).forEach(([k, v]) => auth.searchParams.set(k, v))
r = await fetch(auth, { redirect: 'manual', headers: { apikey: SB_ANON } })
const loc = r.headers.get('location') ?? ''
const authorizationId = new URL(loc, SB_URL).searchParams.get('authorization_id')
check('authorize → consent', !!authorizationId, `${r.status}`)
r = await fetch(`${SB_URL}/auth/v1/oauth/authorizations/${authorizationId}`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${session.access_token}` } })
check('consent details', r.ok, `${r.status} ${(await r.text()).slice(0, 160)}`)
r = await fetch(`${SB_URL}/auth/v1/oauth/authorizations/${authorizationId}/consent`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) })
const consent = await r.json()
const code = new URL(consent.redirect_url ?? 'http://x/').searchParams.get('code')
check('consent → code', !!code, `${r.status} ${JSON.stringify(consent).slice(0, 160)}`)
r = await fetch(`${SB_URL}/auth/v1/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', apikey: SB_ANON },
  body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: client.client_id, code_verifier: verifier }) })
const tok = await r.json()
const oauth = tok.access_token
check('OAuth access token', !!oauth, `${r.status}`)
const claims = JSON.parse(Buffer.from(oauth.split('.')[1], 'base64url').toString())
check('token carries client_id', claims.client_id === client.client_id, `aud=${claims.aud} role=${claims.role} aal=${claims.aal}`)

const rest = (token, path, extra = {}, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra } })

// 3. REST
r = await rest(oauth, 'students?select=id,name')
check('assistant token, no key → REST 403', r.status === 403, `${r.status} ${(await r.text()).slice(0, 120)}`)
r = await rest(oauth, 'students?select=id,name', { 'x-iskra-mcp-key': 'wrong' })
check('assistant token, wrong key → REST 403', r.status === 403, `${r.status}`)
r = await rest(oauth, 'students?select=id,name', { 'x-iskra-mcp-key': GATE_KEY })
const rows = await r.json()
check('assistant token + function key → REST 200, own row', r.status === 200 && rows.length === 1, `${r.status} ${JSON.stringify(rows)}`)
r = await rest(oauth, 'rpc/mcp_client_state', {}, { method: 'POST', body: '{}' })
check('assistant token, no key → RPC 403', r.status === 403, `${r.status}`)
r = await rest(oauth, 'rpc/mcp_set_scopes', { 'x-iskra-mcp-key': GATE_KEY }, { method: 'POST', body: JSON.stringify({ p_client_id: client.client_id, p_scopes: ['attachments:read'] }) })
check('assistant cannot self-grant even with key', r.status >= 400, `${r.status}`)
r = await rest(session.access_token, 'students?select=id,name')
check('normal teacher session unaffected → REST 200', r.status === 200, `${r.status}`)
r = await rest(SB_ANON, 'students?select=id')
check('anon request unaffected (not 403 assistant)', !(await r.text()).includes('assistant_direct_access'), `${r.status}`)

r = await rest(oauth, 'rpc/mcp_client_state', { 'x-iskra-mcp-key': GATE_KEY }, { method: 'POST', body: '{}' })
const st0 = await r.json()
check('no scopes row → needs_consent (no legacy rights)', st0.state === 'needs_consent', JSON.stringify(st0))
r = await rest(session.access_token, 'rpc/mcp_set_scopes', {}, { method: 'POST', body: JSON.stringify({ p_client_id: client.client_id, p_scopes: ['events:read'] }) })
r = await rest(oauth, 'rpc/mcp_client_state', { 'x-iskra-mcp-key': GATE_KEY }, { method: 'POST', body: '{}' })
check('after consent in Iskra → active', (await r.json()).state === 'active')

// 4. Storage (политика mfa_required на storage.objects; объект probe/a.txt залит заранее)
const list = (headers) => fetch(`${SB_URL}/storage/v1/object/list/probe`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: `Bearer ${oauth}`, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ prefix: '' }) }).then(async x => [x.status, await x.json().catch(() => null)])
let [ls, lb] = await list({})
check('storage, assistant token no key → nothing', !Array.isArray(lb) || lb.length === 0, `${ls} ${JSON.stringify(lb).slice(0, 80)}`)
;[ls, lb] = await list({ 'x-iskra-mcp-key': GATE_KEY })
check('storage, assistant token + key → objects', Array.isArray(lb) && lb.length > 0, `${ls} ${JSON.stringify(lb).slice(0, 80)}`)
r = await fetch(`${SB_URL}/storage/v1/object/list/probe`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '' }) })
const nb = await r.json()
check('storage, normal session unaffected', Array.isArray(nb) && nb.length > 0, `${r.status}`)

// 5. Realtime: подписка помощника на изменения учеников
const { createClient } = await import('@supabase/supabase-js')
async function realtimeSees(token) {
  const c = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  await c.realtime.setAuth(token)
  let got = 0
  await new Promise(res => { c.channel('rt-' + Math.random()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, () => { got++ }).subscribe(s => { if (s === 'SUBSCRIBED') res() }); setTimeout(res, 8000) })
  await new Promise(r => setTimeout(r, 1500))
  sql(`insert into public.students (id, name, created_by, phone) values (gen_random_uuid(), 'Новый', '${user.id}', '+70000000009');`)
  await new Promise(r => setTimeout(r, 4000))
  await c.removeAllChannels()
  return got
}
const seenNormal = await realtimeSees(session.access_token)
const seenAssistant = await realtimeSees(oauth)
check('realtime: normal session receives change', seenNormal > 0, `${seenNormal}`)
check('realtime: assistant token receives nothing', seenAssistant === 0, `${seenAssistant}`)

// 6. Auth: токен помощника не меняет аккаунт (встроенная защита Auth ≥ 2.199)
r = await fetch(`${SB_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: SB_ANON, Authorization: `Bearer ${oauth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'Hijack-' + randomBytes(6).toString('hex') }) })
check('auth PUT /user password refused', r.status === 403, `${r.status} ${(await r.text()).slice(0, 100)}`)
r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: SB_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
check('original password still works', r.status === 200, `${r.status}`)

console.log(JSON.stringify(results))
process.exit(results.some(x => x[0] === 'FAIL') ? 1 : 0)
