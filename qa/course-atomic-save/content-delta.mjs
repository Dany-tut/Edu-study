import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Actual pure snapshot/planner only; unsupported shapes are checked BEFORE a
// simulated dispatch. No database, browser, network, UI or application build.
const compiled = await build({ entryPoints: ['src/lib/courseContentDelta.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { courseContentSnapshot, courseContentDelta, courseDeltaProbeEnabled } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
)
const failures = []
let passed = 0
function test(name, check) {
  try { check(); passed++ }
  catch (error) { failures.push({ name, error }); console.error(`FAIL ${name}: ${error.message}`) }
}
const modId = i => `bbbbbbbb-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const lessonId = i => `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const identities = Array.from({ length: 80 }, (_, i) => ({ id: lessonId(i), shortId: `00e3a0efbf-${i}`,
  moduleId: modId(Math.floor(i / 20)), updatedAt: '2026-11-22T00:00:01.123456Z' }))
const course = {
  id: '00e3a0efbf', dbCourseId: '00e3a0efbf', title: 'Filled QA course', subject: 'Chemistry', level: 'Test',
  description: 'Original description', status: 'draft', color: '#abcdef', bg: '#eeeeee', numberStart: 1,
  studentIds: [], groupIds: [],
  modules: Array.from({ length: 4 }, (_, i) => ({ id: modId(i), label: `Module ${i + 1}`, expanded: true,
    lessonIds: identities.slice(i * 20, i * 20 + 20).map(l => l.shortId) })),
  lessons: identities.map((l, i) => ({ id: l.shortId, persistedShortId: l.shortId, title: `Topic ${i + 1}`, number: i + 1,
    videoUrl: 'https://example.invalid/recording', theory: `Server theory ${i}. `.repeat(40),
    timecodes: [{ time: '00:10', label: 'Chapter', seconds: 10 }],
    chapterVariants: { source: 'https://example.invalid/recording', active: 'text', revision: 1,
      text: [{ time: '00:10', label: 'Chapter', seconds: 10 }] },
    hwTitle: `Homework ${i + 1}`, hwTarget: 'Practice', hwTime: '18:00', recHwTime: '19:00',
    hwTasks: [{ id: `hw-${i}`, text: 'Question', answer: 'Answer' }], recHwTasks: [], extraHw: [],
    recapCardSetId: 'card-set-1', recapCardGroupId: 'card-group-1',
    files: { documents: [{ path: `course/file-${i}.pdf`, name: 'Material.pdf' }] },
  })),
}
const rawModules = course.modules.map((m, i) => ({ id: m.id, label: m.label, position: (i + 1) * 10 }))
const clone = value => structuredClone(value)
const snapshot = c => courseContentSnapshot(c, identities)
const initial = snapshot(course)
assert.ok(initial, 'populated fixture must be eligible')
const noOps = delta => {
  assert.ok(delta)
  assert.deepEqual(delta.p_course_patch, {})
  assert.deepEqual(delta.p_lesson_patches, [])
  assert.deepEqual(delta.p_lesson_deletes, [])
  assert.deepEqual(delta.p_module_ops, [])
}
function rejectsEdit(edit, name) {
  const c = clone(course); edit(c)
  const after = snapshot(c)
  let simulatedDispatches = 0
  const delta = after ? courseContentDelta(initial, after, rawModules) : null
  if (delta) simulatedDispatches++
  assert.equal(delta, null, `${name}: unsupported change must use full-safe path`)
  assert.equal(simulatedDispatches, 0, `${name}: never choose unsupported RPC then retry after write`)
}

test('same80 snapshot has no operations and retains complete4module witness', () => {
  const result = courseContentDelta(initial, snapshot(clone(course)), rawModules)
  noOps(result); assert.deepEqual(result.p_expected_modules, rawModules)
  assert.equal(result.p_expected_modules.length, 4)
})
test('description-only delta excludes80lesson content and is small', () => {
  const c = clone(course); c.description = 'One newly typed description'
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_course_patch, { description: c.description })
  assert.deepEqual(result.p_lesson_patches, []); assert.deepEqual(result.p_lesson_deletes, []); assert.deepEqual(result.p_module_ops, [])
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1500)
  assert.ok(Buffer.byteLength(JSON.stringify(initial)) > Buffer.byteLength(JSON.stringify(result)) * 50)
})
test('single lesson title delta contains only that stable UUID/reference', () => {
  const c = clone(course); c.lessons[42].title = 'Renamed topic'
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_lesson_patches, [{ id: lessonId(42), short_id: identities[42].shortId,
    set: { title: 'Renamed topic' }, homework_set: {}, content_set: {} }])
  assert.deepEqual(result.p_course_patch, {}); assert.deepEqual(result.p_lesson_deletes, [])
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1500)
})
test('homework scalar leaf patch does not send sibling arrays/time values', () => {
  const c = clone(course); c.lessons[2].hwTime = '20:15'
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_lesson_patches, [{ id: lessonId(2), short_id: identities[2].shortId,
    set: {}, homework_set: { hwTime: '20:15' }, content_set: {} }])
  assert.equal('hwTasks' in result.p_lesson_patches[0].homework_set, false)
  assert.equal('recHwTime' in result.p_lesson_patches[0].homework_set, false)
})
test('explicit homework scalar clear remains explicit null', () => {
  const c = clone(course); delete c.lessons[0].recHwTime
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_lesson_patches[0].homework_set, { recHwTime: null })
})
test('nested cardID removal clears only the known scalar leaf', () => {
  const c = clone(course); delete c.lessons[0].recapCardSetId
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_lesson_patches, [{ id: lessonId(0), short_id: identities[0].shortId,
    set: {}, homework_set: {}, content_set: { cardSetId: null } }])
  assert.equal('paragraphs' in result.p_lesson_patches[0].content_set, false)
  assert.equal('cardGroupId' in result.p_lesson_patches[0].content_set, false)
})
for (const [name, change] of [
  ['homework task array', c => { c.lessons[0].hwTasks = [{ id: 'changed-task', answer: 'New' }] }],
  ['recording homework task array', c => { c.lessons[0].recHwTasks = [{ id: 'recording-task', answer: 'New' }] }],
  ['extra homework array', c => { c.lessons[0].extraHw = [{ id: 'extra', tasks: [] }] }],
  ['test task array', c => { c.lessons[0].testTasks = [{ id: 'test', answer: 'New' }] }],
  ['paragraph/theory edit', c => { c.lessons[0].theory = 'New teacher theory' }],
  ['video source edit', c => { c.lessons[0].videoUrl = 'https://example.invalid/other-video' }],
  ['chapter timecode edit', c => { c.lessons[0].timecodes[0].label = 'New chapter' }],
  ['chapter variants edit', c => { c.lessons[0].chapterVariants.revision = 2 }],
  ['file/material edit', c => { c.lessons[0].files.documents.push({ path: 'new.pdf' }) }],
  ['publication change', c => { c.status = 'published' }],
]) test(`unsupported ${name} is rejected before dispatch`, () => rejectsEdit(change, name))

test('explicit deletion of last lesson keeps stable delete UUID and leaves others alone', () => {
  const c = clone(course); c.lessons.pop(); c.modules[3].lessonIds.pop()
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_lesson_deletes, [{ id: lessonId(79), short_id: identities[79].shortId }])
  assert.deepEqual(result.p_lesson_patches, []); assert.deepEqual(result.p_module_ops, [])
})
test('empty lesson snapshot explicitly deletes80; empty patch list alone deletesnone', () => {
  const c = clone(course); c.lessons = []; for (const m of c.modules) m.lessonIds = []
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.equal(result.p_lesson_deletes.length, 80)
  assert.deepEqual(result.p_lesson_deletes, identities.map(l => ({ id: l.id, short_id: l.shortId })))
  assert.deepEqual(result.p_lesson_patches, [])
  const metadata = clone(course); metadata.description = 'Only metadata'
  const narrow = courseContentDelta(initial, snapshot(metadata), rawModules)
  assert.deepEqual(narrow.p_lesson_patches, []); assert.deepEqual(narrow.p_lesson_deletes, [])
})
test('new lesson cannot select typed delta even if snapshot supports full-fallback placeholder', () => {
  const c = clone(course); c.lessons.push({ ...clone(c.lessons[0]), id: 'new-local-lesson', persistedShortId: undefined, title: 'New lesson' })
  c.modules[3].lessonIds.push('new-local-lesson')
  const after = snapshot(c)
  assert.equal(after ? courseContentDelta(initial, after, rawModules) : null, null)
})
test('new module unsupported', () => {
  const after = clone(initial); after.modules.push({ id: modId(4), label: 'New module', position: 4 })
  assert.equal(courseContentDelta(initial, after, rawModules), null)
})
test('duplicate after lesson reference unsupported', () => {
  const after = clone(initial); after.lessons.push(clone(after.lessons[0]))
  assert.equal(courseContentDelta(initial, after, rawModules), null)
})
test('duplicate before lesson reference unsupported', () => {
  const before = clone(initial); before.lessons.push(clone(before.lessons[0]))
  assert.equal(courseContentDelta(before, initial, rawModules), null)
})
test('duplicate after DBUUID under different stable refs unsupported', () => {
  const after = clone(initial); after.lessons[1].id = after.lessons[0].id
  assert.equal(courseContentDelta(after, clone(after), rawModules), null)
})
test('duplicate before DBUUID under different stable refs unsupported', () => {
  const before = clone(initial); before.lessons[1].id = before.lessons[0].id
  assert.equal(courseContentDelta(before, clone(before), rawModules), null)
})
test('changed lesson UUID under same reference unsupported', () => {
  const after = clone(initial); after.lessons[0].id = lessonId(99)
  assert.equal(courseContentDelta(initial, after, rawModules), null)
})
test('duplicate current module IDs unsupported', () => {
  const after = clone(initial); after.modules.push(clone(after.modules[0]))
  assert.equal(courseContentDelta(initial, after, rawModules), null)
})
test('duplicate expected raw module IDs unsupported before dispatch', () => {
  assert.equal(courseContentDelta(initial, clone(initial), [...rawModules, clone(rawModules[0])]), null)
})
test('module rename compares canonical labels but guards authoritative RAW position10', () => {
  const c = clone(course); c.modules[0].label = 'Teacher module label'
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_module_ops, [{ id: modId(0), op: 'patch',
    expected: { label: 'Module 1', position: 10 }, set: { label: 'Teacher module label' } }])
  assert.deepEqual(result.p_expected_modules, rawModules)
  assert.deepEqual(result.p_lesson_patches, [], 'normalizing raw positions must not renumber untouched lessons')
})
test('module reorder guards RAW positions10/20 instead of canonical0/1', () => {
  const c = clone(course); [c.modules[0], c.modules[1]] = [c.modules[1], c.modules[0]]
  const result = courseContentDelta(initial, snapshot(c), rawModules)
  assert.deepEqual(result.p_module_ops, [
    { id: modId(1), op: 'patch', expected: { label: 'Module 2', position: 20 }, set: { position: 0 } },
    { id: modId(0), op: 'patch', expected: { label: 'Module 1', position: 10 }, set: { position: 1 } },
  ])
  assert.ok(result.p_lesson_patches.length > 0, 'reordered modules explicitly update lesson order by stable identity')
  assert.deepEqual(result.p_expected_modules, rawModules)
})
test('expected module witness is cloned, never aliases caller-owned roster', () => {
  const result = courseContentDelta(initial, snapshot(course), rawModules)
  result.p_expected_modules[0].position = -1
  assert.equal(rawModules[0].position, 10)
})
test('snapshot/planner do not mutate input course/identities or snapshots', () => {
  const c = clone(course), ids = clone(identities), c0 = clone(c), ids0 = clone(ids)
  const before = courseContentSnapshot(c, ids), after = clone(before)
  after.course.description = 'New description'; after.lessons[0].homework.hwTitle = 'New homework'
  const before0 = clone(before), after0 = clone(after), expected0 = clone(rawModules)
  courseContentDelta(before, after, rawModules)
  assert.deepEqual(c, c0); assert.deepEqual(ids, ids0)
  assert.deepEqual(before, before0); assert.deepEqual(after, after0); assert.deepEqual(rawModules, expected0)
})
test('QA flags defaultOFF and cannot enable another course', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'window')
  try {
    delete globalThis.window; assert.equal(courseDeltaProbeEnabled('00e3a0efbf'), false)
    for (const search of ['', '?qa_course_save=20261122', '?qa_course_delta=20261122', '?qa_course_save=20261122&qa_course_delta=wrong']) {
      globalThis.window = { location: { search } }; assert.equal(courseDeltaProbeEnabled('00e3a0efbf'), false)
    }
    globalThis.window = { location: { search: '?qa_course_save=20261122&qa_course_delta=20261122' } }
    assert.equal(courseDeltaProbeEnabled('00e3a0efbf'), true)
    assert.equal(courseDeltaProbeEnabled('some-real-course'), false)
  } finally { if (old) Object.defineProperty(globalThis, 'window', old); else delete globalThis.window }
})
assert.equal(failures.length, 0, `${failures.length} content delta cases failed (${passed} passed): ${failures.map(x => x.name).join('; ')}`)
console.log(`PASS content delta ${passed}cases:80same/metadata/title tiny changes, supported scalar/card clears, unsupported arrays/video/chapters before dispatch, explicit deletes, duplicate scope, raw module witnesses, input immutability and scoped QA gate`)
