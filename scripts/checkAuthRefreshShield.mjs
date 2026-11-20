// Сбой по дороге к Auth не выкидывает учителя; настоящий отказ сервера — выкидывает.
// Настоящий auth-js + authTransport, сеть подменена.
import assert from 'node:assert/strict'
import { AuthClient } from '@supabase/auth-js'
import { authTransport } from '../src/lib/authTransport'

const backend = 'https://proj.supabase.co'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = exp => `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp, session_id: 's1' })}.x`

async function run(reply) {
  const store = new Map()
  const now = Math.floor(Date.now() / 1000)
  store.set('sb-test', JSON.stringify({ access_token: jwt(now - 10), refresh_token: 'r1', expires_at: now - 10, expires_in: 3600, token_type: 'bearer', user: { id: 'u1' } }))
  const net = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/auth/v1/token') return reply()
    return new Response('{}', { status: 200 })
  }
  const events = []
  const client = new AuthClient({
    url: `${backend}/auth/v1`, storageKey: 'sb-test', autoRefreshToken: false, persistSession: true, detectSessionInUrl: false,
    storage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    fetch: authTransport(net, backend),
  })
  client.onAuthStateChange(e => events.push(e))
  await client.getSession()
  return { kept: store.has('sb-test'), events }
}

const transient = [
  () => new Response('{"code":500,"msg":"failed to connect to host=localhost"}', { status: 500, headers: { 'content-type': 'application/json' } }),
  () => new Response('<html>Bad gateway</html>', { status: 404 }),
  () => new Response('<html>rate</html>', { status: 429 }),
  () => new Response('<html>oops</html>', { status: 400 }),
]
for (const reply of transient) {
  const r = await run(reply)
  assert.equal(r.kept, true, 'transient refresh failure must keep the session')
  assert.ok(!r.events.includes('SIGNED_OUT'))
}
const revoked = await run(() => new Response('{"code":"refresh_token_not_found","error_code":"refresh_token_not_found","msg":"Invalid Refresh Token"}', { status: 400, headers: { 'content-type': 'application/json' } }))
assert.equal(revoked.kept, false, 'a revoked refresh token must still sign out')
console.log('auth refresh shield: ok')
