// Actual SDK + localhost Auth. Deferred transport responses model cancellation
// after the server has issued a session, and during shared-session validation.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { build } from 'esbuild'
import { createClient } from '@supabase/supabase-js'
const root = process.env.ISKRA_LOCAL_DIR || '/tmp/iskra-local-security'
const cfg = JSON.parse(readFileSync(root + '/status.json', 'utf8'))
assert.equal(new URL(cfg.API_URL).hostname, '127.0.0.1')
globalThis.__authQAConfig = cfg
const bundle = await build({
  stdin: { contents: `export * from './src/lib/authActions';export * from './src/lib/authTransport';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external',
  plugins: [{ name: 'local-main-auth', setup(b) {
    b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: 'main', namespace: 'qa' }))
    b.onLoad({ filter: /.*/, namespace: 'qa' }, () => ({ contents: `export const SUPABASE_URL=globalThis.__authQAConfig.API_URL,SUPABASE_KEY=globalThis.__authQAConfig.ANON_KEY;export const supabase={auth:{setSession:(...args)=>globalThis.__mainAuth.auth.setSession(...args)}};` }))
  } }], logLevel: 'silent',
})
mkdirSync('node_modules/.cache', { recursive: true })
writeFileSync('node_modules/.cache/localAuthCancellation.mjs', bundle.outputFiles[0].text)
const m = await import('../../node_modules/.cache/localAuthCancellation.mjs')
const realFetch = globalThis.fetch
let pause, release, reached, rejectProfile = false
const transport = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url)
  const response = await realFetch(input, init)
  if (rejectProfile && url.pathname === '/rest/v1/students') return Response.json({ code: 'QA_PROFILE_UNAVAILABLE', message: 'Synthetic profile failure' }, { status: 503 })
  if (pause && (pause === 'token' ? url.pathname.endsWith('/token') : pause === 'profile' ? url.pathname === '/rest/v1/students' : url.pathname.endsWith('/user'))) {
    pause = null
    reached = true
    await new Promise(resolve => { release = resolve })
  }
  return response
}
globalThis.fetch = transport
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const main = globalThis.__mainAuth = createClient(cfg.API_URL, cfg.ANON_KEY, { ...options, global: { fetch: m.authTransport(transport, cfg.API_URL) } })
const setup = createClient(cfg.API_URL, cfg.ANON_KEY, options)
const email = `qa-cancel-${Date.now()}@example.invalid`, password = randomUUID()
const created = await setup.auth.signUp({ email, password })
assert.ifError(created.error)
const userId = created.data.user.id
const results = []
const events = []
const { data: listener } = main.auth.onAuthStateChange(event => { events.push(event) })
async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 30)) }
  throw Error('Controlled Auth boundary was not reached')
}
try {
  for (const point of ['token', 'user']) {
    pause = point; release = undefined; reached = false; events.length = 0
    const controller = new AbortController()
    const pending = m.passwordSignIn(email, password, controller.signal).then(() => 'resolved', () => 'rejected')
    await waitFor(() => reached)
    controller.abort()
    assert.equal(await pending, 'rejected')
    release()
    await new Promise(r => setTimeout(r, 100))
    assert.equal((await main.auth.getSession()).data.session, null)
    assert.ok(!events.includes('SIGNED_IN'))
    results.push({ name: `Cancellation at ${point}: late response cannot persist session or emit SIGNED_IN`, status: 'PASS' })
  }
  await m.passwordSignIn(email, password, new AbortController().signal)
  assert.equal((await main.auth.getUser()).data.user?.id, userId)
  results.push({ name: 'Successful password login commits the real session', status: 'PASS' })
  assert.ifError((await main.auth.signOut({ scope: 'local' })).error)
  const admin = createClient(cfg.API_URL, cfg.SERVICE_ROLE_KEY, options)
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  assert.ifError(generated.error)
  await m.verifyEmailCode(email, generated.data.properties.email_otp, new AbortController().signal)
  assert.equal((await main.auth.getUser()).data.user?.id, userId)
  results.push({ name: 'Real one-time email code verification commits the intended session', status: 'PASS' })
  assert.ifError((await main.auth.signOut({ scope: 'local' })).error)
  const fixture = JSON.parse(readFileSync(root + '/fixture.json', 'utf8'))
  const student = fixture.accounts.studentA
  pause = 'profile'; reached = false; release = undefined; events.length = 0
  const controller = new AbortController()
  const pending = m.studentPasswordSignIn(student.email, student.password, controller.signal).then(() => 'resolved', () => 'rejected')
  await waitFor(() => reached)
  controller.abort()
  assert.equal(await pending, 'rejected')
  release()
  await new Promise(r => setTimeout(r, 100))
  assert.equal((await main.auth.getSession()).data.session, null)
  assert.ok(!events.includes('SIGNED_IN'))
  results.push({ name: 'Student profile cancellation cannot commit a late session', status: 'PASS' })
  rejectProfile = true
  await assert.rejects(m.studentPasswordSignIn(student.email, student.password, new AbortController().signal))
  rejectProfile = false
  assert.equal((await main.auth.getSession()).data.session, null)
  results.push({ name: 'Student profile failure is rejected instead of routing as a teacher', status: 'PASS' })
  const profile = await m.studentPasswordSignIn(student.email, student.password, new AbortController().signal)
  assert.ok(profile?.id && profile.name)
  assert.equal((await main.auth.getUser()).data.user?.email, student.email.toLowerCase())
  results.push({ name: 'Student login resolves the real profile before committing the session', status: 'PASS' })
  assert.ifError((await main.auth.signOut({ scope: 'local' })).error)
} finally { listener.subscription.unsubscribe(); globalThis.fetch = realFetch }
const out = process.env.ISKRA_QA_OUTPUT || 'docs/qa/readiness-fixes-2026-11-03'
mkdirSync(out, { recursive: true })
writeFileSync(out + '/auth-cancellation.json', JSON.stringify({ scope: 'Real localhost SDK/Auth, synthetic user; service key only generates the local OTP; no delivery claim', productionModified: false, results }, null, 2))
for (const r of results) console.log('PASS', r.name)
