import assert from 'node:assert/strict'
import { build } from 'esbuild'
const compiled = await build({ entryPoints: ['src/lib/courseOrdinaryDelta.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { ordinaryContentDelta, noCourseAccessIntents } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const mod = 'bbbbbbbb-0000-4000-8000-000000000001'
const before = { course: { title: 'Course', description: 'Original', level: 'School', color: '#abc', bg: '#fff',
  subject: 'Chemistry', number_start: 1, status: 'draft' }, modules: [{ id: mod, label: 'Module', position: 0 }],
  lessons: Array.from({ length: 80 }, (_, i) => ({ id: `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    short_id: `course-${i}`, title: `Lesson ${i}`, description: 'Original lesson', module_id: mod, position: i,
    lesson_number: i, scheduled_date: null, scheduled_time: null, scheduled_duration: null, delivery_mode: 'live',
    homework: { hwTitle: 'Original homework', hwTasks: [{ id: 'a', text: 'Original' }] },
    content: { paragraphs: [{ id: 'p', text: 'Original theory' }] }, materials: { workbook: { path: 'file.pdf' } } })) }
let passed = 0
function test(name, fn) { try { fn(); passed++ } catch (error) { console.error(name); throw error } }
function change(mutator) { const next = structuredClone(before); mutator(next); return next }
for (const status of ['draft', 'published']) test(`owned ${status} metadata/description with all80 witnesses`, () => {
  const a = structuredClone(before); a.course.status = status
  const b = structuredClone(a); b.course.description = 'New metadata'; b.lessons[42].description = 'One edited lesson'
  const result = ordinaryContentDelta(a, b)
  assert.equal(result.p_expected_status, status)
  assert.deepEqual(result.p_course_patch, { description: 'New metadata' })
  assert.deepEqual(result.p_lesson_patches, [{ id: a.lessons[42].id, short_id: a.lessons[42].short_id, set: { description: 'One edited lesson' } }])
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1200)
})
const forbidden = [
  c => { c.course.status = 'published' }, c => { c.course.subject = 'Biology' }, c => { c.course.number_start = 2 },
  c => { c.course.extraUnknown = 'Not silently filtered' }, c => { c.lessons[0].title = 'Calendar title' },
  c => { c.lessons[0].scheduled_date = '2026-11-23' }, c => { c.lessons[0].delivery_mode = 'recording' },
  c => { c.lessons[0].homework.hwTitle = 'New homework' }, c => { c.lessons[0].content.cardSetId = 'card' },
  c => { c.lessons[0].content.paragraphs[0].text = 'New theory' }, c => { c.lessons[0].materials.workbook.path = 'other.pdf' },
  c => { c.lessons.pop() }, c => { c.lessons[0].id = c.lessons[1].id }, c => { c.modules[0].label = 'Renamed' },
  c => { c.lessons[0].position = 99 }, c => { c.lessons[0].chapter_variants = { source: 'video' } },
]
for (const [index, mutate] of forbidden.entries()) test(`unsupported mixed edit ${index} dispatches no ordinary write`, () => {
  const after = change(c => { c.course.description = 'Supported edit alongside unsupported'; mutate(c) })
  let planned; try { planned=ordinaryContentDelta(before,after) } catch(error) { assert.equal(error.code,'ISKRA_DATA_PRESERVATION'); planned=null } assert.equal(planned,null)
})
test('no-op and raw module position witness are retained', () => {
  const witness = [{ ...before.modules[0], position: 10 }]
  const result = ordinaryContentDelta(before, structuredClone(before), witness)
  assert.deepEqual(result.p_course_patch, {}); assert.deepEqual(result.p_lesson_patches, [])
  assert.deepEqual(result.p_expected_modules, witness)
})
test('access predicate rejects pending and unknown intents instead of audience comparison', () => {
  assert.equal(noCourseAccessIntents({ students: {}, groups: {}, modes: {} }), true)
  assert.equal(noCourseAccessIntents({}), true)
  for (const value of [null, [], { modes: [] }, { students: null }, { students: { student: true } },
    { modes: { student: 'full' } }, { unexpected: {} }]) assert.equal(noCourseAccessIntents(value), false)
})
console.log(`ordinary delta classifier PASS ${passed}`)
