import assert from 'node:assert/strict'
import { build } from 'esbuild'

// One process, pure helper only: no UI, network, database, or full app build.
const compiled = await build({
  entryPoints: ['src/lib/courseConfirmedBaseline.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false, logLevel: 'silent',
})
const { captureConfirmedBaseline, baselineCanDriveDelta } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
)
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const courseId = 'aaaaaaaa-0000-4000-8000-000000000001'
const moduleId = i => `bbbbbbbb-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const lessonId = i => `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const courseUpdatedAt = '2026-11-22T01:00:02.000000Z'
const sourceStamp = '2026-11-22T01:00:03.123456+00:00'

function fixture() {
  const scope = { authEpoch: 3, ownerId: owner }
  const token = { courseShortId: 'qa-eighty', scope, requestId: 10 }
  const modules = Array.from({ length: 4 }, (_, i) => ({ id: moduleId(i), label: `Module ${i + 1}`, position: i }))
  const lessons = Array.from({ length: 80 }, (_, i) => ({
    id: lessonId(i), shortId: `qa-eighty-${i}`, moduleId: moduleId(Math.floor(i / 20)),
    updatedAt: i === 79 ? sourceStamp : '2026-11-22T01:00:01.123456Z',
  }))
  const witness = { courseId, courseShortId: 'qa-eighty', ownerId: owner, courseUpdatedAt, modules, lessons }
  const light = {
    title: 'Pristine title', description: 'Server description',
    modules: structuredClone(modules),
    lessons: lessons.map(l => ({ id: l.shortId, persistedShortId: l.shortId, title: `Lesson ${l.shortId}` })),
  }
  const rows = lessons.map(l => ({
    id: l.id, short_id: l.shortId, module_id: l.moduleId, updated_at: l.updatedAt,
    content: { paragraphs: [{ text: `Server theory for ${l.shortId}` }] },
    homework: { hwTasks: [{ id: `task-${l.shortId}`, answer: `Answer ${l.shortId}` }] },
    materials: { attachments: [] },
  }))
  let projectedCalls = 0, serializedCalls = 0, cleanSeen, serializedSeen
  const args = {
    metadata: {
      origin: 'network-metadata', token, witness, sourceStamp,
      numberStart: { included: true, readCourseUpdatedAt: courseUpdatedAt }, light,
    },
    heavy: { token, witness: structuredClone(witness), rows },
    activeToken: token, currentScope: { ...scope }, recoveredDraft: false,
    projectClean(light, rows) {
      projectedCalls++
      const byRef = new Map(rows.map(l => [l.short_id, l]))
      cleanSeen = {
        ...light,
        lessons: light.lessons.map(l => ({ ...l, content: byRef.get(l.id).content, homework: byRef.get(l.id).homework })),
      }
      return cleanSeen
    },
    serialize(clean) { serializedCalls++; serializedSeen = clean; return clean },
  }
  return {
    args, token, scope, get projectedCalls() { return projectedCalls }, get serializedCalls() { return serializedCalls },
    get cleanSeen() { return cleanSeen }, get serializedSeen() { return serializedSeen },
  }
}
const capture = f => captureConfirmedBaseline(f.args)
function rejects(change, why) {
  const f = fixture(); change(f.args, f)
  const base = capture(f)
  assert.equal(base, null, why)
  assert.equal(f.projectedCalls, 0, `${why}: uncertain source must not be projected/certified`)
}

{
  const f = fixture(), base = capture(f)
  assert.ok(base)
  assert.equal(base.source, 'matched-load')
  assert.equal(base.serialized.lessons.length, 80)
  assert.equal(base.modules.length, 4)
  assert.equal(base.lessons[79].id, lessonId(79))
  assert.equal(base.serialized.lessons[0].homework.hwTasks[0].answer, 'Answer qa-eighty-0')
  assert.equal(base.stamp, sourceStamp, 'keep original source spelling/provenance')
  assert.equal(f.projectedCalls, 1); assert.equal(f.serializedCalls, 1)
  // No full-save ACK, current React course or current draft is an input.
  assert.equal('latestCourse' in f.args, false)
  assert.equal(baselineCanDriveDelta(base, { courseShortId: 'qa-eighty', baselineStamp: sourceStamp, scope: f.scope }), true)
}

// Scope/target response ownership; a structurally identical old token is not current.
rejects(a => { a.currentScope.ownerId = other }, 'another current owner')
rejects(a => { a.currentScope.authEpoch++ }, 'another auth permission epoch')
rejects(a => { a.activeToken = { ...a.activeToken } }, 'old request token')
rejects(a => { a.heavy.token = { ...a.activeToken } }, 'unrelated heavy token')
rejects(a => { a.heavy.witness.ownerId = other }, 'foreign heavy owner')
rejects(a => { a.heavy.witness.courseId = 'aaaaaaaa-0000-4000-8000-000000000002' }, 'another course UUID')
rejects(a => { a.heavy.witness.courseShortId = 'another-course' }, 'another course short reference')
rejects(a => { a.metadata.witness.ownerId = other }, 'metadata owner differs from request scope')
rejects(a => { a.metadata.token.courseShortId = 'another-target' }, 'metadata target mismatch')
rejects(a => { a.metadata.witness.ownerId = 'not-uuid'; a.heavy.witness.ownerId = 'not-uuid'; a.metadata.token.scope.ownerId = 'not-uuid'; a.currentScope.ownerId = 'not-uuid' }, 'unverified owner identity')

// Compare every row, not just the maximum; inventories are complete and unique.
rejects(a => { a.heavy.witness.courseUpdatedAt = '2026-11-22T01:00:02.000001Z' }, 'course changed between reads')
rejects(a => { a.heavy.witness.lessons[0].updatedAt = '2026-11-22T01:00:01.123457Z' }, 'non-max lesson changed while max unchanged')
rejects(a => { a.heavy.witness.lessons.pop() }, 'lesson removed from heavy witness')
rejects(a => { a.heavy.witness.lessons.push({ ...a.heavy.witness.lessons[0], id: lessonId(80), shortId: 'new' }) }, 'lesson added to heavy witness')
rejects(a => { a.heavy.witness.lessons[0].id = lessonId(80) }, 'lesson UUID changed')
rejects(a => { a.heavy.witness.lessons[0].moduleId = moduleId(1) }, 'lesson relocated between reads')
rejects(a => { a.heavy.witness.lessons[0].updatedAt = null }, 'missing lesson version')
rejects(a => { a.heavy.witness.lessons.push(a.heavy.witness.lessons[0]) }, 'duplicate short reference')
rejects(a => { a.heavy.witness.lessons[1].id = a.heavy.witness.lessons[0].id }, 'duplicate database lesson identity')
rejects(a => { a.heavy.rows.pop() }, 'content roster shorter than its witness')
rejects(a => { a.heavy.rows[0].short_id = null }, 'missing actual content short reference')
rejects(a => { a.heavy.rows[0].updated_at = '2026-11-22T01:00:01.123457Z' }, 'content version differs from witness')
rejects(a => { a.heavy.witness.modules.pop() }, 'module removed')
rejects(a => { a.heavy.witness.modules[0].label = 'Renamed elsewhere' }, 'module renamed')
rejects(a => { a.heavy.witness.modules[0].position = 9 }, 'module reordered')
rejects(a => { a.heavy.witness.modules.push(a.heavy.witness.modules[0]) }, 'duplicate module identity')
rejects(a => { a.metadata.witness.modules[0].id = 'legacy-local'; a.heavy.witness.modules[0].id = 'legacy-local' }, 'unverified local module identity')

// Optional compatibility field must belong to this version if included.
rejects(a => { a.metadata.numberStart.readCourseUpdatedAt = '2026-11-22T01:00:02.000001Z' }, 'number_start from another course version')
rejects(a => { a.metadata.numberStart.readCourseUpdatedAt = null }, 'number_start without version')
{
  const f = fixture(); f.args.metadata.numberStart = { included: false }
  assert.ok(capture(f), 'unknown optional column may stay omitted, never fabricated')
}

// Preserve Postgres microseconds; API spelling/order alone must not matter.
assert.equal(Date.parse('2026-11-22T01:00:03.123456Z'), Date.parse('2026-11-22T01:00:03.123457Z'), 'fixture exposes JS millisecond rounding trap')
rejects(a => { a.heavy.witness.lessons[79].updatedAt = '2026-11-22T01:00:03.123457Z' }, 'sixth PG microsecond is a real change')
rejects(a => { a.metadata.sourceStamp = '2026-11-22T01:00:03.123457Z' }, 'source max differs by sixth microsecond')
rejects(a => { a.metadata.sourceStamp = null }, 'unknown original max')
rejects(a => { a.metadata.sourceStamp = 'not-a-timestamp' }, 'invalid original max')
{
  const f = fixture()
  f.args.heavy.witness.courseUpdatedAt = '2026-11-22T01:00:02Z'
  f.args.heavy.witness.lessons[79].updatedAt = '2026-11-22T01:00:03.123456Z'
  f.args.heavy.rows[79].updated_at = '2026-11-22T01:00:03.123456Z'
  f.args.heavy.witness.lessons.reverse(); f.args.heavy.witness.modules.reverse(); f.args.heavy.rows.reverse()
  assert.ok(capture(f), 'UTC spelling and response array order do not change identity/version')
}

// Neither a draft nor ce-session with a plausible serverStamp certifies itself.
rejects(a => { a.recoveredDraft = true }, 'restored draft')
rejects(a => { a.metadata = null }, 'ce-session without network witness')
rejects(a => { a.metadata.origin = 'ce-session' }, 'serialized session presented as network metadata')

{
  const f = fixture()
  const live = structuredClone(f.args.metadata.light)
  live.description = 'Teacher input during heavy read'
  live.lessons[0].content = { paragraphs: [{ text: 'Teacher theory' }] }
  const base = capture(f)
  assert.equal(base.serialized.description, 'Server description', 'current teacher input never becomes acknowledged baseline')
  assert.equal(base.serialized.lessons[0].content.paragraphs[0].text, 'Server theory for qa-eighty-0')
  assert.equal(live.lessons[0].content.paragraphs[0].text, 'Teacher theory', 'capture does not overwrite live input')
  f.args.metadata.light.description = 'Later metadata object mutation'
  f.args.metadata.light.modules[0].label = 'Later label'
  f.args.heavy.rows[0].homework.hwTasks[0].answer = 'Later server-response object mutation'
  f.args.metadata.witness.lessons[0].shortId = 'mutated-identity'
  f.cleanSeen.lessons[0].content.paragraphs[0].text = 'Later shared projection mutation'
  assert.equal(base.serialized.description, 'Server description')
  assert.equal(base.serialized.modules[0].label, 'Module 1')
  assert.equal(base.serialized.lessons[0].homework.hwTasks[0].answer, 'Answer qa-eighty-0')
  assert.equal(base.serialized.lessons[0].content.paragraphs[0].text, 'Server theory for qa-eighty-0')
  assert.equal(base.lessons[0].shortId, 'qa-eighty-0')
}
{
  const f = fixture()
  f.args.projectClean = (light, rows) => { light.title = 'Projection-local change'; rows[0].content.paragraphs[0].text = 'Projection-local'; return light }
  capture(f)
  assert.equal(f.args.metadata.light.title, 'Pristine title', 'pure projection receives clones, not metadata ref')
  assert.equal(f.args.heavy.rows[0].content.paragraphs[0].text, 'Server theory for qa-eighty-0')
}
for (const field of ['projectClean', 'serialize']) {
  const f = fixture(); f.args[field] = () => { throw new Error('controlled optimization failure') }
  assert.equal(capture(f), null, `${field} failure disables optimization rather than blocking full-safe path`)
}

{
  const f = fixture(), base = capture(f)
  const dispatch = { courseShortId: 'qa-eighty', baselineStamp: null, scope: { ...f.scope } }
  assert.equal(baselineCanDriveDelta(base, dispatch), false, 'capture may precede source baseline initialization')
  assert.equal(dispatch.baselineStamp, null, 'readiness check never promotes a stamp')
  dispatch.baselineStamp = '2026-11-22T01:00:03.123456Z'
  assert.equal(baselineCanDriveDelta(base, dispatch), true, 'first clean save can use baseline without a full ACK')
  dispatch.baselineStamp = '2026-11-22T01:00:03.123457Z'
  assert.equal(baselineCanDriveDelta(base, dispatch), false)
  assert.equal(base.stamp, sourceStamp, 'newer remote stamp cannot recertify captured content')
  assert.equal(baselineCanDriveDelta(base, { ...dispatch, baselineStamp: sourceStamp, courseShortId: 'other' }), false)
  assert.equal(baselineCanDriveDelta(base, { ...dispatch, baselineStamp: sourceStamp, scope: { ...f.scope, authEpoch: 4 } }), false)
  assert.equal(baselineCanDriveDelta(base, { ...dispatch, baselineStamp: sourceStamp, scope: { ...f.scope, ownerId: other } }), false)
  assert.equal(baselineCanDriveDelta(null, { ...dispatch, baselineStamp: sourceStamp }), false)
}
console.log('PASS confirmed baseline: pristine80, complete UUID/ref/module/version witnesses, auth/owner/token scope, missing/mixed/duplicate inventories, optional-field version, PG microseconds, restored/ce-session rejection, clone isolation, safe projection fallback, dispatch source gate without stamp adoption')
