import { strict as assert } from 'node:assert'
import { handler, normEmail } from './handler.ts'

const post = (body: unknown) =>
  new Request('https://fn.local/social-oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

Deno.test('normEmail: нижний регистр, обрезка, отсев мусора', () => {
  assert.equal(normEmail('  User@Mail.RU '), 'user@mail.ru')
  assert.equal(normEmail('нет-собаки'), null)
  assert.equal(normEmail(''), null)
  assert.equal(normEmail(null), null)
})

Deno.test('CORS preflight и метод', async () => {
  const pre = await handler(new Request('https://fn.local', { method: 'OPTIONS' }))
  assert.equal(pre.status, 200)
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*')
  const get = await handler(new Request('https://fn.local', { method: 'GET' }))
  assert.equal(get.status, 405)
})

Deno.test('валидация тела до похода к провайдеру и БД', async () => {
  const bad = await handler(new Request('https://fn.local', { method: 'POST', body: 'не json' }))
  assert.equal(bad.status, 400)
  assert.equal((await bad.json()).error, 'bad_request')

  const unknown = await handler(post({ provider: 'facebook', code: 'x' }))
  assert.equal(unknown.status, 400)
  assert.equal((await unknown.json()).error, 'unknown_provider')

  const noCode = await handler(post({ provider: 'yandex' }))
  assert.equal(noCode.status, 400)
  assert.equal((await noCode.json()).error, 'missing_code')
})

Deno.test('без кредов провайдера — 501 provider_not_configured, без сети', async () => {
  const names = ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET', 'SOCIAL_OAUTH_TEST_MODE']
  const old = names.map((n) => Deno.env.get(n))
  for (const n of names) Deno.env.delete(n)
  const fetchSpy = globalThis.fetch
  let hitNetwork = false
  globalThis.fetch = (() => { hitNetwork = true; return Promise.reject(new Error('no network in test')) }) as typeof fetch
  try {
    const res = await handler(post({ provider: 'yandex', code: 'abc', redirect_uri: 'https://iskra-study.ru/auth/yandex' }))
    assert.equal(res.status, 501)
    assert.equal((await res.json()).error, 'provider_not_configured')
    assert.equal(hitNetwork, false) // секрета нет → до fetch не доходим
  } finally {
    globalThis.fetch = fetchSpy
    names.forEach((n, i) => { const v = old[i]; if (v === undefined) Deno.env.delete(n); else Deno.env.set(n, v) })
  }
})

Deno.test('тест-режим: профиль принят, но без SUPABASE_URL — server_misconfigured (линковка не запускается)', async () => {
  const names = ['SOCIAL_OAUTH_TEST_MODE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const old = names.map((n) => Deno.env.get(n))
  Deno.env.set('SOCIAL_OAUTH_TEST_MODE', '1')
  Deno.env.delete('SUPABASE_URL')
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
  try {
    // test_profile без id — отбивается до БД.
    const noId = await handler(post({ provider: 'vk', test_profile: { email: 'a@b.ru' } }))
    assert.equal(noId.status, 400)
    assert.equal((await noId.json()).error, 'test_profile_requires_id')

    // Валидный test_profile проходит профиль-шаг, падает на отсутствии env БД.
    const res = await handler(post({ provider: 'vk', test_profile: { id: '42', email: 'vk@user.ru', name: 'Вика' } }))
    assert.equal(res.status, 500)
    assert.equal((await res.json()).error, 'server_misconfigured')
  } finally {
    names.forEach((n, i) => { const v = old[i]; if (v === undefined) Deno.env.delete(n); else Deno.env.set(n, v) })
  }
})
