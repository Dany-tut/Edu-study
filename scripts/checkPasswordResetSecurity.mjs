// Executes actual handlers with a mocked Auth/DB boundary. Not an RLS/JWT integration test.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
let count = 0
async function check(name, options = {}) {
  const { staffTarget = false, role = 'student', appRole, profileRole = 'student', owner = 'other', token = 'valid', password = 'synthetic-password-123', status = 403, targetRole = 'teacher', linked = true, updateError = false, rawBody } = options
  let handler, changed = 0, writes = 0, verified = false
  const q = table => {
    let id
    const chain = {
      select() { return chain }, eq(key, value) { if (key === 'id') id = value; return chain },
      update() { writes++; return chain },
      async single() { return { data: table === 'students' ? { id: 'target', auth_user_id: linked ? 'account' : null, created_by: owner } : { id, role: id === 'caller' ? profileRole : (name === 'reset-student-password' ? (staffTarget ? 'admin' : 'student') : targetRole) } } },
      then(resolve) { resolve({ error: null }) },
    }
    return chain
  }
  const createClient = () => ({
    auth: {
      async getUser() { verified = true; return { data: { user: token === 'invalid' ? null : { id: 'caller', user_metadata: { role }, app_metadata: { role: appRole } } }, error: token === 'invalid' ? {} : null } },
      admin: { async getUserById() { return { data: { user: { app_metadata: { role: staffTarget ? 'admin' : 'student' } } } } }, async updateUserById() { assert.ok(verified); changed++; return { error: updateError ? { message: 'synthetic failure' } : null } } },
    }, from: q,
  })
  const source = fs.readFileSync(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), 'utf8').replace(/^import .*createClient.*$/m, '')
  vm.runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), { createClient, Deno: { env: { get: () => 'stub' }, serve: h => { handler = h } }, Response, crypto })
  const body = { studentId: 'target', teacherId: 'target' }
  if (password !== null) body.password = password
  const response = await handler(new Request('https://local.invalid', { method: 'POST', headers: token === 'missing' ? {} : { Authorization: 'Bearer synthetic' }, body: rawBody ?? JSON.stringify(body) }))
  assert.equal(response.status, status, `${name}: ${JSON.stringify(options)}`)
  assert.equal(changed, status === 200 || updateError ? 1 : 0)
  if (status !== 200) assert.equal(writes, 0, 'Rejected operations must have no DB writes')
  if (status === 200 && password === null) assert.match((await response.json()).password, /^[0-9a-f]{32}$/)
  count++
}
for (const name of ['reset-student-password', 'reset-teacher-password']) {
  await check(name, { role: 'admin' })
  await check(name, { profileRole: 'admin' })
  await check(name, { token: 'missing', status: 401 })
  await check(name, { token: 'invalid', status: 401 })
  await check(name, { appRole: 'admin', status: 200 })
  await check(name, { appRole: 'admin', password: null, status: 200 })
  for (const password of ['short', '', 123456789012, 'a'.repeat(129)]) await check(name, { appRole: 'admin', password, status: 400 })
  await check(name, { appRole: 'admin', rawBody: '{', status: 400 })
  await check(name, { appRole: 'admin', updateError: true, status: 500 })
}
await check('reset-student-password', { owner: 'caller', status: 200 })
await check('reset-student-password', { owner: 'caller', linked: false, status: 409 })
await check('reset-teacher-password', { owner: 'caller' })
await check('reset-teacher-password', { appRole: 'admin', targetRole: 'student', status: 409 })
await check('reset-student-password', { owner: 'caller', staffTarget: true, status: 409 })
console.log(`PASS: ${count} password-reset security cases (mocked Auth/DB; no external requests)`)
