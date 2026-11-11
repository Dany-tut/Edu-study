import { strict as assert } from 'node:assert'
import { handler, normEmail, maskEmail, signTicket, verifyTicket } from './handler.ts'

const post = (body: unknown, auth?: string) =>
  new Request('https://fn.local/social-oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  })

// Фейковый серверный env, чтобы дойти до валидации, не трогая сеть/БД
// (createClient ленив — без запроса сети не ходит).
function withStubEnv<T>(extra: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const base: Record<string, string | undefined> = {
    SUPABASE_URL: 'http://stub.local', SUPABASE_SERVICE_ROLE_KEY: 'stub-secret', SUPABASE_ANON_KEY: 'stub-anon',
    SOCIAL_OAUTH_TEST_MODE: undefined, YANDEX_CLIENT_ID: undefined, YANDEX_CLIENT_SECRET: undefined,
    ...extra,
  }
  const names = Object.keys(base)
  const old = names.map((n) => Deno.env.get(n))
  for (const n of names) { const v = base[n]; if (v === undefined) Deno.env.delete(n); else Deno.env.set(n, v) }
  return fn().finally(() => names.forEach((n, i) => { const v = old[i]; if (v === undefined) Deno.env.delete(n); else Deno.env.set(n, v) }))
}

Deno.test('normEmail / maskEmail', () => {
  assert.equal(normEmail('  User@Mail.RU '), 'user@mail.ru')
  assert.equal(normEmail('нет-собаки'), null)
  assert.equal(maskEmail('danil@mail.ru'), 'd***l@mail.ru')
  assert.equal(maskEmail('ab@x.ru'), 'a*@x.ru')
  assert.equal(maskEmail('notanemail'), '***')
})

Deno.test('ticket: подпись/проверка, подделка и срок', async () => {
  await withStubEnv({}, async () => {
    const base = { provider: 'yandex' as const, provider_user_id: '42', email: 'a@b.ru', email_verified: true, user_id: 'u1', role: 'teacher' as const }
    const good = await signTicket({ ...base, exp: Date.now() + 60_000 })
    const parsed = await verifyTicket(good)
    assert.equal(parsed?.user_id, 'u1')
    // подделка подписи
    assert.equal(await verifyTicket(good.slice(0, -2) + 'xx'), null)
    // истёкший
    const expired = await signTicket({ ...base, exp: Date.now() - 1 })
    assert.equal(await verifyTicket(expired), null)
    assert.equal(await verifyTicket('garbage'), null)
  })
})

Deno.test('CORS/метод/формат', async () => {
  assert.equal((await handler(new Request('https://fn.local', { method: 'OPTIONS' }))).status, 200)
  assert.equal((await handler(new Request('https://fn.local', { method: 'GET' }))).status, 405)
  const bad = await handler(new Request('https://fn.local', { method: 'POST', body: 'нет' }))
  assert.equal(bad.status, 400); assert.equal((await bad.json()).error, 'bad_request')
})

Deno.test('server_misconfigured без SUPABASE_URL', async () => {
  await withStubEnv({ SUPABASE_URL: undefined }, async () => {
    const res = await handler(post({ action: 'resolve', provider: 'yandex', code: 'x' }))
    assert.equal(res.status, 500); assert.equal((await res.json()).error, 'server_misconfigured')
  })
})

Deno.test('валидация resolve: действие/провайдер/код/креды', async () => {
  await withStubEnv({}, async () => {
    const unknownAction = await handler(post({ action: 'frobnicate' }))
    assert.equal((await unknownAction.json()).error, 'unknown_action')

    const unknownProvider = await handler(post({ action: 'resolve', provider: 'facebook', code: 'x' }))
    assert.equal((await unknownProvider.json()).error, 'unknown_provider')

    const noCode = await handler(post({ provider: 'yandex' }))
    assert.equal((await noCode.json()).error, 'missing_code')

    // есть код, но нет кредов провайдера — 501, без сети
    const spy = globalThis.fetch; let hit = false
    globalThis.fetch = (() => { hit = true; return Promise.reject(new Error('no net')) }) as typeof fetch
    try {
      const notConfigured = await handler(post({ provider: 'yandex', code: 'abc', redirect_uri: 'https://iskra-study.ru/auth/yandex' }))
      assert.equal(notConfigured.status, 501)
      assert.equal((await notConfigured.json()).error, 'provider_not_configured')
      assert.equal(hit, false)
    } finally { globalThis.fetch = spy }
  })
})

Deno.test('confirm-link с битым тикетом → bad_ticket', async () => {
  await withStubEnv({}, async () => {
    const res = await handler(post({ action: 'confirm-link', ticket: 'не-тикет' }))
    assert.equal(res.status, 400); assert.equal((await res.json()).error, 'bad_ticket')
  })
})
