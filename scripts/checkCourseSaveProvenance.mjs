import assert from 'node:assert/strict'
import { courseSaveProvenance, courseSnapshotStamp } from '../src/lib/courseSaveProvenance.ts'

const original = '2026-11-21T04:26:22.155596+00:00'
const changed = '2026-11-22T02:47:47.291893+00:00'
const draft = JSON.parse(JSON.stringify({ serverStamp: original, lessons: [{ description: 'unsaved work' }] }))
assert.equal(courseSaveProvenance(draft.serverStamp, changed), 'review', 'reopening an old draft never certifies it with the latest stamp')
assert.equal(draft.lessons[0].description, 'unsaved work', 'review retains unsaved input')
const acknowledged = JSON.parse(JSON.stringify({ ...draft, serverStamp: changed }))
assert.equal(courseSaveProvenance(acknowledged.serverStamp, changed), 'save', 'reload after our acknowledged save does not raise a false conflict')
assert.equal(courseSaveProvenance(null, changed), 'review', 'legacy drafts need review')
assert.equal(courseSaveProvenance(original, null), 'unverified', 'failed reads fail closed')
assert.equal(courseSaveProvenance(original, original), 'save')
assert.equal(courseSaveProvenance(changed, original), 'review', 'a server rollback also invalidates an open snapshot')
assert.equal(courseSnapshotStamp(original, [null, changed, undefined]), changed, 'external lesson writes invalidate course snapshots')
console.log('PASS: recovered draft provenance, missing-version review, failed-read rejection, external lesson change')
