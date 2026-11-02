import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'

const teacher = 'a2857e8b-b11f-45e1-a59e-336466b80db7'
const admin = '84fe210b-677d-41e2-a3d9-74021390c0c2'
const key = 'iskra:viewAsTeacher'
const bundle = await build({
  entryPoints: ['src/lib/owner.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'auth-fixture', setup(b) {
    b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = globalThis.__supabase' }))
  } }],
})
const sharedLocal = new Map()
const storage = data => ({ getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) })
function tab(user) {
  const session = new Map([['teacher-nav', 'other teacher'], ['ce-session', 'course'], ['cards-session', 'cards']])
  const calls = []
  let authListener
  const module = { exports: {} }
  const context = vm.createContext({ module, exports: module.exports,
    sessionStorage: storage(session), localStorage: storage(sharedLocal),
    window: { history: { replaceState: (...args) => calls.push(args[2]) }, location: { reload: () => calls.push('reload') } },
    __supabase: { auth: {
      getSession: async () => ({ data: { session: { user } } }),
      getUser: async () => ({ data: { user } }),
      onAuthStateChange: listener => { authListener = listener },
    } },
  })
  vm.runInContext(bundle.outputFiles[0].text, context)
  return { api: module.exports, session, calls, auth: event => authListener(event) }
}
const first = tab({ id: admin, app_metadata: { role: 'admin' } })
const second = tab({ id: admin, app_metadata: { role: 'admin' } })
first.api.setViewAs({ id: teacher, name: 'Teacher' })
assert.deepEqual(first.calls, ['#/teacher', 'reload'])
assert.equal(first.session.size, 1)
assert.equal(await first.api.getOwnerId(), teacher)
assert.equal((await first.api.getSessionUser()).id, admin, 'Viewing must not replace authentication')
assert.equal(second.api.getViewAs(), null, 'Another tab must keep its own context')
assert.equal(await second.api.getOwnerId(), admin)
first.api.setViewAs(null)
assert.deepEqual(first.calls.slice(-2), ['#/teacher/admin', 'reload'])
assert.equal(first.session.has(key), false)
first.api.setViewAs({ id: teacher, name: 'Teacher' })
first.auth('SIGNED_OUT')
assert.equal(first.api.getViewAs(), null)
const ordinary = tab({ id: teacher, app_metadata: { role: 'teacher' }, user_metadata: { role: 'admin' } })
ordinary.session.set(key, JSON.stringify({ id: admin, name: 'Spoofed admin' }))
assert.equal(await ordinary.api.getOwnerId(), teacher)
assert.equal(ordinary.api.getViewAs(), null, 'Client-editable metadata cannot authorize viewing')
assert.throws(() => ordinary.api.setViewAs({ id: 'invalid', name: 'Invalid' }))
console.log('PASS: clean entry/exit navigation, isolated tabs, unchanged Auth identity, sign-out and non-admin isolation')

const policyBundle = await build({ entryPoints: ['supabase/functions/_shared/teacherView.ts'], bundle: true, platform: 'node', format: 'cjs', write: false })
const policyModule = { exports: {} }
vm.runInNewContext(policyBundle.outputFiles[0].text, { module: policyModule, exports: policyModule.exports })
const { teacherReadContext } = policyModule.exports
for (const action of ['module', 'tests', 'results']) {
  const result = teacherReadContext({ id: admin, app_metadata: { role: 'admin' } }, { action, viewTeacherId: teacher })
  assert.equal(result.teacher, teacher)
  assert.equal(result.viewing, true)
}
for (const action of ['connect', 'disconnect', 'return_homework', 'start', 'status', 'sync', 'unknown']) {
  assert.equal(teacherReadContext({ id: admin, app_metadata: { role: 'admin' } }, { action, viewTeacherId: teacher }).status, 403)
}
assert.equal(teacherReadContext({ id: teacher, user_metadata: { role: 'admin' } }, { action: 'results', viewTeacherId: admin }).status, 403)
assert.equal(teacherReadContext({ id: admin, app_metadata: { role: 'admin' } }, { action: 'tests', viewTeacherId: 'bad' }).status, 400)
assert.equal(teacherReadContext({ id: teacher }, { action: 'results' }).teacher, teacher)
console.log('PASS: verified admin can read target Testly context; writes, student actions, forged role and invalid targets are rejected')

const viewBundle = await build({ entryPoints: ['src/lib/teacherView.ts'], bundle: true, platform: 'node', format: 'cjs', write: false })
const viewModule = { exports: {} }
const previewStorage = new Map([[key, JSON.stringify({ id: teacher, name: 'Teacher' })]])
const sent = []
vm.runInNewContext(viewBundle.outputFiles[0].text, {
  module: viewModule, exports: viewModule.exports, sessionStorage: storage(previewStorage),
  Request, Response, URL, fetch: async (...args) => { sent.push(args); return Response.json({ ok: true }) },
})
const { teacherViewRequestAllowed: allowed, teacherViewFetch } = viewModule.exports
for (const table of ['students', 'lesson_progress', 'courses', 'payments', 'profiles']) {
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) assert.equal(allowed(`/rest/v1/${table}`, method), false)
  assert.equal(allowed(`/rest/v1/${table}`, 'GET'), true)
}
assert.equal(allowed('/rest/v1/rpc/teacher_finance_summary', 'POST'), true)
assert.equal(allowed('/rest/v1/rpc/teacher_journal_snapshot_v1', 'POST'), true)
assert.equal(allowed('/rest/v1/rpc/teacher_journal_snapshot_v2', 'POST'), true)
assert.equal(allowed('/rest/v1/rpc/teacher_journal_save', 'POST'), false)
assert.equal(allowed('/rest/v1/rpc/admin_delete_teacher', 'POST'), false)
assert.equal(allowed('/rest/v1/rpc/start_homework_retake', 'POST'), false)
assert.equal(allowed('/storage/v1/object/sign/task-media/file.png', 'POST'), true)
assert.equal(allowed('/storage/v1/object/task-media/file.png', 'POST'), false)
assert.equal(allowed('/auth/v1/token', 'POST'), true)
assert.equal(allowed('/auth/v1/logout', 'POST'), true)
assert.equal(allowed('/auth/v1/user', 'PUT'), false)
assert.equal(allowed('/auth/v1/user/identities/authorize', 'GET'), false)
for (const action of ['module', 'tests', 'results']) assert.equal(allowed('/functions/v1/testly-bridge', 'POST', { action }), true)
for (const action of ['return_homework', 'connect', 'disconnect']) assert.equal(allowed('/functions/v1/testly-bridge', 'POST', { action }), false)
assert.equal(allowed('/functions/v1/reset-teacher-password', 'POST'), false)
const blocked = await teacherViewFetch('https://example.invalid/rest/v1/lesson_progress', { method: 'PATCH', body: '{}' })
assert.equal(blocked.status, 403)
assert.equal(sent.length, 0, 'A blocked write must never reach the server')
await teacherViewFetch('https://example.invalid/rest/v1/lesson_progress')
assert.equal(sent.length, 1)
previewStorage.delete(key)
await teacherViewFetch('https://example.invalid/rest/v1/lesson_progress', { method: 'PATCH', body: '{}' })
assert.equal(sent.length, 2, 'Leaving preview restores normal authenticated writes')
console.log('PASS: read-only reports/downloads, no grade/student/course/payment/Auth/module mutations, normal writes restored on exit')
