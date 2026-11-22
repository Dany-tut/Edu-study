import assert from 'node:assert/strict'
import { build } from 'esbuild'
const compiled = await build({ entryPoints: ['src/lib/courseContentAcknowledgement.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { prepareConfirmedSnapshot, advanceConfirmedContent } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
)
const owner = '11111111-1111-4111-8111-111111111111'
const courseId = 'aaaaaaaa-0000-4000-8000-000000000001'
const modId = i => `bbbbbbbb-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const lessonId = i => `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const oldStamp = '2026-11-22T01:00:01.123456Z', stamp = '2026-11-22T01:00:02.123456+00:00'
const copy = value => structuredClone(value)
function fixture(count = 4) {
  const scope = { ownerId: owner, authEpoch: 7 }
  const modules = [{ id: modId(0), label: 'First', position: 0 }, { id: modId(1), label: 'Second', position: 1 }]
  const lessons = Array.from({ length: count }, (_, i) => ({ id: lessonId(i), short_id: `qa-${i}`, module_id: modId(i % 2),
    title: `Lesson ${i}`, position: i, lesson_number: i, description: '', scheduled_time: '12:30', rec_time: '13:45',
    homework: { hwTitle: 'Practice', hwTime: '18:00', recHwTime: null, hwTasks: [{ id: `task-${i}`, answer: 'Answer' }] },
    content: { paragraphs: [{ text: `Theory ${i}` }], cardSetId: 'cards', cardGroupId: 'group' }, materials: {} }))
  const serialized = { course: { title: 'Course', subject: 'QA', level: 'Test', description: '', status: 'draft', color: '#abc', bg: '#def', number_start: 1 }, modules, lessons }
  serialized.rawCourse = { ...copy(serialized.course), id: courseId, created_by: owner, description: null }
  serialized.rawLessons = Object.fromEntries(lessons.map(row => [row.short_id, { ...copy(row), course_id: courseId,
    updated_at: oldStamp, description: null,
    homework: { ...copy(row.homework), recHwTime: '19:45', unknownHw: { preserve: true } },
    content: { ...copy(row.content), unknownContent: { protected: true } }, materials: { legacyFileMetadata: [1, 2] } }]))
  const rawModules = modules.map((m, i) => ({ ...m, position: (i + 1) * 10 }))
  const expected = { modules: copy(rawModules), lessons: lessons.map(row => ({ id: row.id, shortId: row.short_id, moduleId: row.module_id })) }
  const base = { source: 'matched-load', token: { courseShortId: 'qa-course', scope: copy(scope), requestId: 4 },
    courseShortId: 'qa-course', courseId, ownerId: owner, stamp: oldStamp, serialized,
    modules: copy(rawModules), lessons: expected.lessons.map(row => ({ ...row, updatedAt: oldStamp })) }
  const canonical = copy(serialized); delete canonical.rawCourse; delete canonical.rawLessons
  canonical.course.description = 'Dispatched edit'
  const preserved = prepareConfirmedSnapshot(base.serialized, canonical)
  const ack = { full_snapshot_confirmed: true, course_id: courseId, stamp,
    module_witness: copy(expected.modules),
    lesson_witness: expected.lessons.map(row => ({ id: row.id, short_id: row.shortId, module_id: row.moduleId, updated_at: oldStamp })) }
  return { base, canonical, preserved, ack, scope, expected }
}
const advance = f => advanceConfirmedContent(f.base, f.canonical, f.preserved, f.ack, f.scope, f.expected)
let count = 0
function test(name, check) { check(); count++ }
function rejects(name, edit) { test(name, () => { const f = fixture(); edit(f); assert.equal(advance(f), null, name) }) }

test('prepare selects writable roots only and preserves unknown raw JSON/defaults', () => {
  const f = fixture()
  assert.equal(f.preserved.course.description, 'Dispatched edit')
  assert.equal('id' in f.preserved.course, false); assert.equal('created_by' in f.preserved.course, false)
  const row = f.preserved.lessons[0]
  assert.equal('course_id' in row, false); assert.equal('updated_at' in row, false)
  assert.equal(row.id, lessonId(0)); assert.equal(row.description, null)
  assert.equal(row.homework.recHwTime, '19:45'); assert.deepEqual(row.homework.unknownHw, { preserve: true })
  assert.deepEqual(row.content.unknownContent, { protected: true }); assert.deepEqual(row.materials.legacyFileMetadata, [1, 2])
})
test('prepare strips even accidentally supplied SQL-only canonical fields', () => {
  const f = fixture(); f.canonical.course.created_by = 'unowned'; f.canonical.lessons[0].generated_field = true
  const prepared = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
  assert.equal(Object.hasOwn(prepared.course, 'created_by'), false)
  assert.equal(Object.hasOwn(prepared.lessons[0], 'generated_field'), false)
})
test('prepare supports unknown new full row without borrowing another row content', () => {
  const f = fixture(); f.canonical.lessons.push({ ...copy(f.canonical.lessons[0]), id: '', short_id: 'new-row', title: 'New' })
  const prepared = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
  assert.equal(prepared.lessons.at(-1).id, ''); assert.equal(prepared.lessons.at(-1).homework.recHwTime, null)
  assert.equal('unknownHw' in prepared.lessons.at(-1).homework, false)
})
test('prepare and output do not alias/mutate inputs or editor current state', () => {
  const f = fixture(), base = copy(f.base), canonical = copy(f.canonical)
  const prepared = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
  prepared.lessons[0].homework.unknownHw.preserve = false; prepared.modules[0].label = 'Output only'
  f.canonical.lessons[0].homework.hwTasks[0].answer = 'New UI edit'
  assert.deepEqual(f.base, base); assert.equal(prepared.lessons[0].homework.hwTasks[0].answer, 'Answer')
  assert.equal(canonical.modules[0].label, f.canonical.modules[0].label)
})
test('ACK80 promotes exactly dispatched canonical and preserved raw with authoritative roster', () => {
  const f = fixture(80), result = advance(f)
  assert.ok(result); assert.equal(result.stamp, stamp); assert.equal(result.lessons.length, 80)
  assert.equal(result.modules[0].position, 10, 'unchanged delta retains RAW module position10')
  assert.equal(result.serialized.modules[0].position, 0, 'canonical editor representation stays canonical')
  assert.equal(result.serialized.lessons[0].homework.recHwTime, null)
  assert.equal(result.serialized.rawLessons['qa-0'].homework.recHwTime, '19:45', 'raw promotion is preserved dispatch, not canonical defaults')
  assert.equal(result.serialized.course.description, 'Dispatched edit')
})
test('ACK does not require course_updated_at but checks it if supplied', () => {
  const f = fixture(); assert.ok(advance(f))
  f.ack.course_updated_at = oldStamp; assert.ok(advance(f))
  f.ack.course_updated_at = '2026-11-22T01:00:03Z'; assert.equal(advance(f), null)
})
rejects('missing full snapshot proof', f => { delete f.ack.full_snapshot_confirmed })
rejects('false full snapshot proof', f => { f.ack.full_snapshot_confirmed = false })
rejects('another course ACK', f => { f.ack.course_id = 'aaaaaaaa-0000-4000-8000-000000000099' })
rejects('owner changed before ACK', f => { f.scope.ownerId = '22222222-2222-4222-8222-222222222222' })
rejects('auth epoch changed before ACK', f => { f.scope.authEpoch++ })
rejects('base token target mismatched', f => { f.base.token.courseShortId = 'other' })
rejects('ACK stamp missing', f => { delete f.ack.stamp })
rejects('ACK stamp invalid calendar date', f => { f.ack.stamp = '2026-02-30T01:00:02Z' })
rejects('ACK stamp invalid leap date', f => { f.ack.stamp = '2025-02-29T01:00:02Z' })
rejects('ACK stamp invalid clock', f => { f.ack.stamp = '2026-11-22T24:00:02Z' })
rejects('ACK stamp invalid year', f => { f.ack.stamp = '0000-11-22T01:00:02Z' })
rejects('ACK stamp excess precision', f => { f.ack.stamp = '2026-11-22T01:00:02.1234567Z' })
rejects('ACK stamp must not rewind source', f => { f.ack.stamp = '2026-11-22T01:00:01.123455Z' })
rejects('lesson updated_at exceeds ACK by one PG microsecond', f => { f.ack.lesson_witness[0].updated_at = '2026-11-22T01:00:02.123457Z' })
rejects('lesson version missing', f => { f.ack.lesson_witness[0].updated_at = null })
rejects('missing module witness', f => { delete f.ack.module_witness })
rejects('missing lesson witness', f => { delete f.ack.lesson_witness })
rejects('incomplete module roster', f => { f.ack.module_witness.pop() })
rejects('extra module roster', f => { f.ack.module_witness.push({ id: modId(8), label: 'Other', position: 80 }) })
rejects('duplicate module roster', f => { f.ack.module_witness.push(copy(f.ack.module_witness[0])) })
rejects('wrong exact RAW module position', f => { f.ack.module_witness[0].position = 0 })
rejects('wrong module label', f => { f.ack.module_witness[0].label = 'Other' })
rejects('incomplete lesson roster', f => { f.ack.lesson_witness.pop() })
rejects('extra lesson roster', f => { f.ack.lesson_witness.push({ id: lessonId(9), short_id: 'other', module_id: modId(0), updated_at: oldStamp }) })
rejects('duplicate lesson UUID', f => { f.ack.lesson_witness[1].id = f.ack.lesson_witness[0].id })
rejects('duplicate lesson short reference', f => { f.ack.lesson_witness[1].short_id = f.ack.lesson_witness[0].short_id })
rejects('wrong lesson reference', f => { f.ack.lesson_witness[0].short_id = 'other' })
rejects('wrong lesson FK', f => { f.ack.lesson_witness[0].module_id = modId(1) })
rejects('expected foreign FK', f => { f.expected.lessons[0].moduleId = modId(8) })
rejects('duplicate expected UUID', f => { f.expected.lessons[1].id = f.expected.lessons[0].id })
rejects('duplicate expected reference', f => { f.expected.lessons[1].shortId = f.expected.lessons[0].shortId })
rejects('unknown new lesson UUID cannot be certified by returned UUID', f => { f.canonical.lessons[0].id = ''; f.preserved.lessons[0].id = '' })
rejects('canonical/request roster disagreement', f => { f.canonical.lessons.pop() })
rejects('preserved/request FK disagreement', f => { f.preserved.lessons[0].module_id = modId(1) })
rejects('unowned canonical course field', f => { f.canonical.course.created_by = owner })
rejects('unowned preserved lesson field', f => { f.preserved.lessons[0].created_by = owner })
test('empty explicit lesson roster after deletion is complete and confirmed', () => {
  const f = fixture(); f.canonical.lessons = []; f.preserved.lessons = []; f.expected.lessons = []; f.ack.lesson_witness = []
  f.ack.applied_lesson_deletes = f.base.lessons.map(row => ({ id: row.id, short_id: row.shortId }))
  assert.equal(advance(f).lessons.length, 0)
})
test('equivalent UTC spelling/order and exact global microseconds accepted', () => {
  const f = fixture(); f.ack.stamp = '2026-11-22T01:00:02.123456Z'
  f.ack.lesson_witness[0].updated_at = '2026-11-22T01:00:02.123456+00:00'
  f.ack.module_witness.reverse(); f.ack.lesson_witness.reverse(); assert.ok(advance(f))
})
test('full ACK without echo uses preserved immutable request values', () => {
  const f = fixture(); const result = advance(f)
  assert.equal(result.serialized.rawCourse.description, 'Dispatched edit')
  assert.equal(result.serialized.rawLessons['qa-0'].description, null)
  assert.equal(result.serialized.rawLessons['qa-0'].homework.recHwTime, '19:45')
})
test('normalized integer echo updates raw only, never overwrites canonical/UI projection', () => {
  const f = fixture(); f.canonical.course.number_start = '2'; f.preserved = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
  f.ack.applied_course_patch = { number_start: 2, description: 'Dispatched edit' }
  const result = advance(f); assert.ok(result)
  assert.equal(result.serialized.course.number_start, '2'); assert.equal(result.serialized.rawCourse.number_start, 2)
})
test('homework/card scalar echoes preserve unknown siblings and explicit null clear', () => {
  const f = fixture(); f.canonical.lessons[0].homework.hwTime = '21:00'; delete f.canonical.lessons[0].content.cardSetId
  f.preserved = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
  f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', set: {}, homework_set: { hwTime: '21:00' }, content_set: { cardSetId: null } }]
  const result = advance(f); assert.ok(result)
  assert.equal(result.serialized.rawLessons['qa-0'].homework.hwTime, '21:00')
  assert.equal(result.serialized.rawLessons['qa-0'].homework.recHwTime, '19:45')
  assert.equal(result.serialized.rawLessons['qa-0'].content.cardSetId, null)
  assert.deepEqual(result.serialized.rawLessons['qa-0'].content.unknownContent, { protected: true })
  assert.equal('cardSetId' in result.serialized.lessons[0].content, false)
})
for (const key of ['scheduled_time', 'rec_time']) {
  test(`${key} SQL HH:MM:SS echo is semantically equal to dispatched HH:MM`, () => {
    const f = fixture(); f.canonical.lessons[0][key] = '12:30'; f.preserved = prepareConfirmedSnapshot(f.base.serialized, f.canonical)
    f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', set: { [key]: '12:30:00' }, homework_set: {}, content_set: {} }]
    const result = advance(f); assert.ok(result)
    assert.equal(result.serialized.lessons[0][key], '12:30'); assert.equal(result.serialized.rawLessons['qa-0'][key], '12:30:00')
  })
}
rejects('time echo cannot change seconds', f => { f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', set: { scheduled_time: '12:30:01' } }] })
rejects('time echo cannot change microseconds', f => { f.canonical.lessons[0].scheduled_time = '12:30:00.000001'; f.preserved = prepareConfirmedSnapshot(f.base.serialized, f.canonical); f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', set: { scheduled_time: '12:30:00.000002' } }] })
rejects('time echo cannot have invalid clock', f => { f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', set: { scheduled_time: '25:30:00' } }] })
rejects('arbitrary title echo mismatch', f => { f.ack.applied_course_patch = { title: 'Other content' } })
rejects('unowned scalar echo', f => { f.ack.applied_course_patch = { created_by: owner } })
rejects('object course echo', f => { f.ack.applied_course_patch = { title: { object: 'unsupported' } } })
rejects('unknown lesson echo identity', f => { f.ack.applied_lesson_patches = [{ id: lessonId(9), short_id: 'other', set: {} }] })
rejects('duplicate lesson echoes', f => { const p = { id: lessonId(0), short_id: 'qa-0', set: {} }; f.ack.applied_lesson_patches = [p, copy(p)] })
rejects('unsupported task array echo', f => { f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', homework_set: { hwTasks: [] } }] })
rejects('unsupported content object echo', f => { f.ack.applied_lesson_patches = [{ id: lessonId(0), short_id: 'qa-0', content_set: { cardSetId: {} } }] })
rejects('retained lesson cannot appear in delete echo', f => { f.ack.applied_lesson_deletes = [{ id: lessonId(0), short_id: 'qa-0' }] })
rejects('unknown deleted lesson echo', f => { f.ack.applied_lesson_deletes = [{ id: lessonId(9), short_id: 'other' }] })
rejects('module echo cannot claim deletion of retained module', f => { f.ack.applied_module_ops = [{ id: modId(0), op: 'delete' }] })
rejects('module patch echo cannot contradict final position', f => { f.ack.applied_module_ops = [{ id: modId(0), op: 'patch', set: { position: 11 } }] })
test('applied module ops agree with exact expected final values', () => {
  const f = fixture(); f.ack.applied_module_ops = [{ id: modId(0), op: 'patch', expected: { label: 'Old', position: 0 }, set: { label: 'First', position: 10 } }]
  assert.ok(advance(f))
})
test('old ACK advances dispatchedA only, never newer liveB, and returns independent storage', () => {
  const f = fixture(), savedInputs = copy(f), newerUi = copy(f.canonical)
  newerUi.course.description = 'B not yet acknowledged'
  const result = advance(f); assert.ok(result)
  assert.equal(result.serialized.course.description, 'Dispatched edit'); assert.equal(newerUi.course.description, 'B not yet acknowledged')
  result.serialized.rawLessons['qa-0'].homework.unknownHw.preserve = false
  result.serialized.lessons[0].homework.hwTasks[0].answer = 'Output mutation'
  result.modules[0].position = -1; result.token.scope.authEpoch = 999
  assert.deepEqual(f, savedInputs)
})
test('later caller mutation of dispatch object cannot mutate promoted base', () => {
  const f = fixture(), result = advance(f); assert.ok(result)
  f.canonical.course.description = 'Later local edit'; f.preserved.lessons[0].content.unknownContent.protected = false
  f.ack.lesson_witness[0].updated_at = '2099-01-01T00:00:00Z'
  assert.equal(result.serialized.course.description, 'Dispatched edit')
  assert.equal(result.serialized.rawLessons['qa-0'].content.unknownContent.protected, true)
  assert.equal(result.lessons[0].updatedAt, oldStamp)
})
for (const field of ['base', 'canonical', 'preserved', 'ack']) rejects(`missing ${field} fails closed`, f => { f[field] = null })
console.log(`PASS content acknowledgement ${count}cases: immutable writable-only preserved request,80row exact scope/roster, calendar/microsecond stamps, no unknownUUID promotion, raw canonical distinction, typed scalar/time echoes, late ACK/latest input isolation and malformed ACK fail-closed`)
