// Учёт записей (src/lib/sync/writeActivity.ts, docs/saving.md §7): слой только
// наблюдает — запрос, ответ и ошибка проходят 1:1; что считается записью;
// «Покинуть страницу?» строго на время записи; постоянное хранилище; онлайн.
//
// Узкий и детерминированный: бандлит ОДИН модуль без зависимостей, без сети,
// без чтения исходников приложения. Падает, только если изменили сам слой.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'

// Окружение страницы — ДО импорта: модуль читает navigator.onLine при загрузке.
const win = new EventTarget()
globalThis.window = win
globalThis.document = { visibilityState: 'visible' }
let persistCalls = 0
let persisted = false
const fakeNavigator = {
  onLine: true,
  userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  storage: { persisted: async () => persisted, persist: async () => { persistCalls++; return true } },
}
Object.defineProperty(globalThis, 'navigator', { value: fakeNavigator, configurable: true, writable: true })

mkdirSync('node_modules/.cache', { recursive: true })
const out = await build({ entryPoints: ['src/lib/sync/writeActivity.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
assert.equal(out.outputFiles.length, 1)
assert.doesNotMatch(out.outputFiles[0].text, /\bimport\s/, 'слой без зависимостей: сторож не тянет приложение')
writeFileSync('node_modules/.cache/writeActivity.mjs', out.outputFiles[0].text)
const { classifyWrite, withWriteActivity, getWriteActivity, subscribeWriteActivity, resetWriteActivityForTest } =
  await import('../node_modules/.cache/writeActivity.mjs')

const DB = 'https://db.example'
const PROXY = 'https://api.proxy.example'
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function beforeUnloadBlocked() {
  const event = new Event('beforeunload', { cancelable: true })
  win.dispatchEvent(event)
  return event.defaultPrevented
}

// ── 1. Прозрачность: исходный fetch получает ТЕ ЖЕ объекты, вызывающий — тот же результат ──
resetWriteActivityForTest()
{
  const seen = []
  const response = new Response('[]', { status: 201 })
  const answer = Promise.resolve(response)
  const wrapped = withWriteActivity((...args) => { seen.push(args); return answer }, DB)
  const cases = [
    [`${DB}/rest/v1/lessons?short_id=eq.1`, { method: 'PATCH', headers: { Authorization: 'Bearer t', apikey: 'k' }, body: '{"a":1}' }],
    [`${DB}/rest/v1/rpc/teacher_lesson_save`, { method: 'POST', body: '{}' }],
    [`${DB}/storage/v1/object/avatars/u/p.jpg`, { method: 'POST', body: new FormData() }],
    [`${DB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', body: '{"refresh_token":"r"}' }],
    [`${DB}/auth/v1/user`, undefined],
    [`${DB}/functions/v1/tts`, { method: 'POST', body: '{}' }],
    [`${PROXY}/rest/v1/lessons`, { method: 'POST', body: '[]' }],
    [new URL(`${DB}/rest/v1/lessons`), { method: 'DELETE' }],
    [new Request(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }), undefined],
  ]
  for (const [input, init] of cases) {
    seen.length = 0
    document.visibilityState = 'hidden' // и на скрытой странице ничего не добавляется
    const returned = wrapped(input, init)
    assert.equal(returned, answer, `вызывающий получает тот же промис: ${input}`)
    assert.equal(seen.length, 1, 'исходный fetch вызван ровно один раз')
    assert.equal(seen[0].length, 2)
    assert.equal(seen[0][0], input, 'input — тот же объект')
    assert.equal(seen[0][1], init, 'init — тот же объект (без новых заголовков, keepalive, signal)')
    assert.equal(await returned, response)
  }
  document.visibilityState = 'visible'
  if (cases[0][1]) assert.deepEqual(Object.keys(cases[0][1]), ['method', 'headers', 'body'], 'init не мутирован')
  await tick()
  assert.equal(getWriteActivity().pending, 0)

  // Ошибки, таймаут и отмена приходят вызывающему тем же объектом.
  for (const error of [new TypeError('Failed to fetch'), new DOMException('Timed out', 'TimeoutError'), new DOMException('cancel', 'AbortError')]) {
    const failing = withWriteActivity(() => Promise.reject(error), DB)
    await assert.rejects(failing(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }), e => e === error, error.name)
    await assert.rejects(failing(`${DB}/auth/v1/token`, { method: 'POST' }), e => e === error, 'вход: ' + error.name)
  }
  // Синхронный бросок исходного fetch — тоже синхронный и тот же.
  const boom = new TypeError('Invalid URL')
  const sync = withWriteActivity(() => { throw boom }, DB)
  assert.throws(() => sync(`${DB}/rest/v1/lessons`, { method: 'POST' }), e => e === boom)
  assert.throws(() => sync(`${DB}/rest/v1/lessons`, { method: 'GET' }), e => e === boom)
  await tick()
  assert.equal(getWriteActivity().pending, 0)
  assert.equal(beforeUnloadBlocked(), false)
}
console.log('PASS прозрачность: input/init/ответ/ошибка 1:1 для записей, входа, функций и прокси')

// ── 2. Что считается записью ────────────────────────────────────────────────
const c = (path, method = 'POST', origin = DB) => classifyWrite(origin + path, method, DB)
assert.equal(c('/rest/v1/lessons', 'GET'), null, 'чтение — не запись')
assert.equal(c('/rest/v1/lessons', 'HEAD'), null)
assert.equal(c('/rest/v1/lessons?short_id=eq.SECRET', 'PATCH'), '/rest/v1/lessons', 'метка без запроса и идентификаторов')
assert.equal(c('/rest/v1/lesson_progress', 'POST'), '/rest/v1/lesson_progress')
assert.equal(c('/rest/v1/groups?id=eq.1', 'DELETE'), '/rest/v1/groups')
assert.equal(c('/rest/v1/analytics_events'), null, 'телеметрия — не правка человека')
assert.equal(c('/rest/v1/lessons', 'POST', PROXY), null, 'чужой адрес')
assert.equal(c('/auth/v1/token'), null, 'вход — не сохранение')
assert.equal(c('/functions/v1/tts'), null, 'функции (ИИ, голос) — не сохранение')
for (const read of ['teacher_journal_snapshot_v3', 'journal_pending', 'admin_analytics_reports', 'admin_students_list',
  'my_plan', 'my_reminder_settings', 'get_teacher_invite', 'student_track', 'reminders_today', 'month_close_preview',
  'hw_ai_grade_batch_preview', 'parent_reports_week', 'transcript_terms_pack', 'load_diag_progress', 'is_staff']) {
  assert.equal(c(`/rest/v1/rpc/${read}`), null, `RPC-чтение ${read} не должно спрашивать при закрытии`)
}
for (const write of ['teacher_journal_save', 'teacher_lesson_save', 'teacher_lesson_publish', 'save_diag_progress',
  'save_course_access_changes', 'claim_payment', 'confirm_payment_claim', 'parent_report_save', 'set_course_order',
  'set_my_reminder_settings', 'schedule_undo', 'admin_delete_teacher', 'admin_student_move', 'start_homework_retake',
  'tg_unlink', 'month_close_send', 'hw_ai_grade_apply_batch', 'log_diag_confidence', 'parent_contact_add']) {
  assert.equal(c(`/rest/v1/rpc/${write}`), `/rest/v1/rpc/${write}`, `RPC-запись ${write}`)
}
assert.equal(c('/storage/v1/object/avatars/u1/photo.jpg'), '/storage/v1', 'загрузка файла — запись')
assert.equal(c('/storage/v1/object/lesson-files', 'DELETE'), '/storage/v1', 'удаление файлов — запись')
assert.equal(c('/storage/v1/object/move'), '/storage/v1')
assert.equal(c('/storage/v1/upload/resumable'), '/storage/v1', 'докачка — запись')
assert.equal(c('/storage/v1/object/sign/lesson-files/a.pdf'), null, 'подписанная ссылка — чтение')
assert.equal(c('/storage/v1/object/list/lesson-files'), null)
assert.equal(c('/storage/v1/object/upload/sign/lesson-files/a.pdf'), null)
assert.equal(c('/storage/v1/object/public/x/y.png', 'GET'), null)
assert.equal(classifyWrite('не адрес', 'POST', DB), null)
console.log('PASS классификация: записи таблиц, RPC по глаголу, хранилище; чтения, телеметрия, вход и функции — мимо')

// ── 3. «Покинуть страницу?» — строго пока запись в полёте ──────────────────
resetWriteActivityForTest()
{
  const pending = deferred()
  const wrapped = withWriteActivity(() => pending.promise, DB)
  let notified = 0
  const unsubscribe = subscribeWriteActivity(() => { notified++ })
  assert.equal(beforeUnloadBlocked(), false, 'без записей вкладка закрывается без вопроса')
  const inFlight = wrapped(`${DB}/rest/v1/courses?id=eq.1`, { method: 'PATCH', body: '{}' })
  assert.equal(getWriteActivity().pending, 1)
  assert.equal(beforeUnloadBlocked(), true, 'пока запись в полёте — браузер спрашивает перед закрытием')
  pending.resolve(new Response('[]', { status: 200 }))
  await inFlight; await tick()
  assert.equal(getWriteActivity().pending, 0)
  assert.ok(getWriteActivity().lastSuccessAt > 0)
  assert.equal(beforeUnloadBlocked(), false, 'запись доехала — обработчик снят сразу')
  assert.ok(notified >= 2, 'подписчики узнают о старте и конце записи')
  unsubscribe()

  // Две записи параллельно: предупреждение держится до последней.
  const a = deferred(), b = deferred()
  const queue = [a, b]
  const twin = withWriteActivity(() => queue.shift().promise, DB)
  const first = twin(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' })
  const second = twin(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' })
  assert.equal(getWriteActivity().pending, 2)
  a.resolve(new Response(null, { status: 201 })); await first; await tick()
  assert.equal(beforeUnloadBlocked(), true, 'вторая ещё летит')
  b.resolve(new Response(null, { status: 201 })); await second; await tick()
  assert.equal(beforeUnloadBlocked(), false)

  // Чтения, вход, телеметрия, функции не включают предупреждение даже в полёте.
  const hold = deferred()
  const reads = withWriteActivity(() => hold.promise, DB)
  const flying = [
    reads(`${DB}/rest/v1/lessons`, { method: 'GET' }),
    reads(`${DB}/rest/v1/rpc/teacher_journal_snapshot_v3`, { method: 'POST', body: '{}' }),
    reads(`${DB}/rest/v1/analytics_events`, { method: 'POST', body: '[]' }),
    reads(`${DB}/auth/v1/token`, { method: 'POST', body: '{}' }),
    reads(`${DB}/functions/v1/tts`, { method: 'POST', body: '{}' }),
  ]
  assert.equal(getWriteActivity().pending, 0)
  assert.equal(beforeUnloadBlocked(), false, 'навигация и чтения — без диалога')
  hold.resolve(new Response('[]')); await Promise.all(flying)

  // Сбой и отмена тоже снимают предупреждение.
  for (const settle of [d => d.resolve(new Response('', { status: 500 })), d => d.reject(new TypeError('x')), d => d.reject(new DOMException('c', 'AbortError'))]) {
    const d = deferred()
    const w = withWriteActivity(() => d.promise, DB)
    const p = w(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }).catch(() => {})
    assert.equal(beforeUnloadBlocked(), true)
    settle(d); await p; await tick()
    assert.equal(beforeUnloadBlocked(), false, 'после ответа с ошибкой вкладку не держим')
  }
}
console.log('PASS предупреждение: только пока запись в полёте, снимается сразу после любого исхода')

// ── 4. Сбои записываются для будущего индикатора ───────────────────────────
resetWriteActivityForTest()
{
  const http = withWriteActivity(() => Promise.resolve(new Response('{"message":"rls"}', { status: 403 })), DB)
  assert.equal((await http(`${DB}/rest/v1/courses`, { method: 'POST', body: '{}' })).status, 403)
  await tick()
  assert.deepEqual({ ...getWriteActivity().lastFailure, at: 0 }, { endpoint: '/rest/v1/courses', status: 403, kind: 'http', at: 0 })
  const fail = error => withWriteActivity(() => Promise.reject(error), DB)(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }).catch(() => {})
  await fail(new TypeError('Failed to fetch')); await tick()
  assert.equal(getWriteActivity().lastFailure.kind, 'network')
  await fail(new DOMException('Timed out', 'TimeoutError')); await tick()
  assert.equal(getWriteActivity().lastFailure.kind, 'timeout')
  const before = getWriteActivity().lastFailure
  await fail(new DOMException('cancel', 'AbortError')); await tick()
  assert.equal(getWriteActivity().lastFailure, before, 'отмену самим приложением сбоем не считаем')
  assert.equal(getWriteActivity().pending, 0)

  // Подписчик, бросающий исключение, не ломает ни учёт, ни запрос.
  subscribeWriteActivity(() => { throw new Error('ui bug') })
  const ok = withWriteActivity(() => Promise.resolve(new Response(null, { status: 204 })), DB)
  assert.equal((await ok(`${DB}/rest/v1/lessons`, { method: 'PATCH' })).status, 204)
  await tick()
  assert.equal(getWriteActivity().pending, 0)
}
console.log('PASS сбои: http/сеть/таймаут записаны, отмена — нет; ошибка подписчика не мешает')

// ── 5. Постоянное хранилище ────────────────────────────────────────────────
{
  const ok = withWriteActivity(() => Promise.resolve(new Response(null, { status: 201 })), DB)
  resetWriteActivityForTest(); persistCalls = 0; persisted = false
  await ok(`${DB}/rest/v1/lessons`, { method: 'GET' }); await tick()
  assert.equal(persistCalls, 0, 'чтение не повод просить хранилище')
  await ok(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' })
  await ok(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' })
  await tick(); await tick()
  assert.equal(persistCalls, 1, 'просим один раз, после первой записи')

  resetWriteActivityForTest(); persistCalls = 0; persisted = true
  await ok(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }); await tick(); await tick()
  assert.equal(persistCalls, 0, 'уже постоянное — не просим')

  resetWriteActivityForTest(); persistCalls = 0; persisted = false
  fakeNavigator.userAgent = 'Mozilla/5.0 (Macintosh; rv:133.0) Gecko/20100101 Firefox/133.0'
  await ok(`${DB}/rest/v1/lessons`, { method: 'POST', body: '[]' }); await tick(); await tick()
  assert.equal(persistCalls, 0, 'Firefox показывает запрос человеку — не просим')
}
console.log('PASS хранилище: один запрос после первой записи, без Firefox')

// ── 6. Онлайн ──────────────────────────────────────────────────────────────
resetWriteActivityForTest()
{
  let seen = 0
  subscribeWriteActivity(() => { seen++ })
  win.dispatchEvent(new Event('offline'))
  assert.equal(getWriteActivity().online, false)
  win.dispatchEvent(new Event('online'))
  assert.equal(getWriteActivity().online, true)
  assert.equal(seen, 2)
}
console.log('PASS онлайн: состояние сети для будущего индикатора')
