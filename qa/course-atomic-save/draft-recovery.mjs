import assert from 'node:assert/strict'
import { build } from 'esbuild'

const { outputFiles } = await build({
  entryPoints: ['src/lib/courseDraftRecovery.ts'], bundle: true, platform: 'node',
  format: 'esm', write: false, logLevel: 'silent',
})
const { openCourseRecovery, courseDraftIntent, applyCourseDraftIntent, isAmbiguousLegacyRecovery } =
  await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

const oldStamp = '2026-11-20T01:00:01.123456Z'
const freshStamp = '2026-11-20T01:00:02.123456Z'
const lessons = Array.from({ length: 80 }, (_, i) => ({
  id: `lesson-${i}`, description: 'Initial', timecodes: [{ seconds: 15, label: 'Chapter' }],
  files: { workbook: { id: 'f', name: 'Workbook', path: 'file.pdf' } },
}))
const before = { id: 'course', dbCourseId: 'course', description: 'Original', lessons,
  modules: [{ id: 'module', label: 'Lessons', lessonIds: lessons.map(l => l.id) }], serverStamp: oldStamp }
const local = structuredClone(before)
local.description = 'Unsaved course description'
local.lessons[0].files.workbook.name = 'Edited file name'
const intent = courseDraftIntent(before, local)
const fresh = structuredClone(before)
fresh.serverStamp = freshStamp
fresh.lessons[0].files.workbook.path = 'server-file.pdf'
fresh.lessons[0].files.workbook.extra = 'must survive'
fresh.lessons[0].timecodes = [{ seconds: 42, label: 'New server timecode' }]
fresh.lessons[1].description = 'Another teacher edit'
fresh.lessons.unshift({ id: 'new-server-lesson', description: 'Inserted remotely' })
fresh.modules[0].lessonIds.unshift('new-server-lesson')

const recovered = applyCourseDraftIntent(fresh, local, intent)
assert.equal(recovered.serverStamp, oldStamp, 'restoring field intent cannot approve a new server stamp')
assert.equal(recovered.description, local.description)
const expected = structuredClone(fresh.lessons)
expected[1].files.workbook.name = 'Edited file name'
assert.deepEqual(recovered.lessons, expected)
assert.deepEqual(recovered.modules, fresh.modules)
assert.deepEqual(courseDraftIntent(before, structuredClone(before)), {})
const removed = structuredClone(fresh)
removed.lessons = removed.lessons.filter(l => l.id !== local.lessons[0].id)
assert.equal(applyCourseDraftIntent(removed, local, intent), null, 'review an edit to a lesson removed elsewhere')

const clean = openCourseRecovery(before, null)
assert.equal(clean.recoveredDraft, false)
assert.equal(clean.course.heavyPending, true)
assert.equal(clean.course.metadataPending, true)
const current = { ...local, editorRecovery: { revision: 3, intent } }
const older = { ...before, editorRecovery: { revision: 2, intent: {} } }
for (const [mirror, draft] of [[current, older], [older, current], [current, null], [before, current]]) {
  const restored = openCourseRecovery(mirror, draft)
  assert.equal(restored.recoveredDraft, true)
  assert.equal(restored.course.description, local.description)
  assert.equal(restored.editRevision, 3)
  assert.deepEqual(restored.recoveryIntent, intent)
}
const unsaved = openCourseRecovery({ ...local, dbCourseId: undefined }, null)
assert.ok(!unsaved.course.heavyPending && !unsaved.course.metadataPending)

const snapshot = {
  course: { description: 'Original' }, modules: structuredClone(before.modules),
  lessons: before.lessons.map(row => ({ short_id: row.id, description: row.description })),
}
const witness = { serialized: snapshot, lessons: snapshot.lessons.map((row, i) => ({
  shortId: row.short_id, updatedAt: i === 42 ? freshStamp : oldStamp,
})) }
const legacy = structuredClone(snapshot)
legacy.course.description = 'Legacy edit'
assert.equal(isAmbiguousLegacyRecovery(witness, oldStamp, legacy), false)
legacy.lessons[0].description = 'Edit to unchanged lesson'
assert.equal(isAmbiguousLegacyRecovery(witness, oldStamp, legacy), false)
legacy.lessons[42].description = 'Could undo newer content'
assert.equal(isAmbiguousLegacyRecovery(witness, oldStamp, legacy), true)
assert.equal(isAmbiguousLegacyRecovery(witness, oldStamp, { ...snapshot, lessons: snapshot.lessons.slice(1) }), true)
console.log('PASS F5 draft intent: fresh clean load, dirty mirror, nested edit only, remote roster/timecodes/files retained, ambiguous legacy and deleted targets protected')
