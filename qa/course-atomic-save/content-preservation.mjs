import assert from 'node:assert/strict'
import { build } from 'esbuild'
const compiled = await build({ entryPoints: ['src/lib/courseContentPreservation.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { mergeConfirmedFields } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
)
const raw = {
  id: 'db-only-id', created_by: 'db-only-owner', updated_at: 'db-only-stamp', generated_column: { internal: true },
  title: '01. Original lesson', description: null, youtube_url: null, chapter_variants: { source: 'legacy-preserved' },
  content: { paragraphs: [{ id: 'legacy-paragraph', text: 'Original theory' }],
    transcript: { source: 'recording', words: [{ text: 'Original transcript' }] }, unknownContent: { nested: [1, 2] } },
  homework: { hwTasks: [{ id: 'old-task', text: 'Question', answer: 'Answer' }],
    hwDateManual: null, recHwTime: '18:45', unknownHomework: { grading: 'preserve' } },
  materials: { files: [{ path: 'original.pdf' }], privateMetadata: { schemaVersion: 7 } },
}
const before = {
  title: 'Original lesson', description: '', youtube_url: null,
  content: { paragraphs: [{ id: 'editor-paragraph', text: 'Original theory' }], transcript: { source: 'recording', words: [{ text: 'Original transcript' }] } },
  // The loaded UI currently has no recHwTime. Canonical defaults must not erase it.
  homework: { hwTasks: [{ id: 'old-task', text: 'Question', answer: 'Answer' }], hwDateManual: false, recHwTime: null },
  materials: { files: [{ path: 'original.pdf' }] },
}
{
  const unchanged = mergeConfirmedFields(raw, before, structuredClone(before))
  assert.deepEqual(Object.keys(unchanged), Object.keys(before), 'project only afterCanonical ownership')
  for (const key of Object.keys(before)) assert.deepEqual(unchanged[key], raw[key])
  assert.equal(unchanged.title, '01. Original lesson', 'unchanged prefix normalization is not an edit')
  assert.equal(unchanged.description, null, 'raw null survives UI empty default')
  assert.equal(unchanged.homework.recHwTime, '18:45', 'unhydrated nonempty time survives UI null default')
  for (const key of ['id', 'created_by', 'updated_at', 'generated_column', 'chapter_variants']) assert.equal(Object.hasOwn(unchanged, key), false, 'unowned SQL fields cannot leak')
}
{
  const after = structuredClone(before); after.title = 'Teacher renamed'; after.description = 'Teacher description'
  const merged = mergeConfirmedFields(raw, before, after)
  assert.equal(merged.title, 'Teacher renamed'); assert.equal(merged.description, 'Teacher description')
  assert.deepEqual(merged.homework, raw.homework); assert.deepEqual(merged.content, raw.content)
}
{
  const after = structuredClone(before); after.homework.hwTasks = [{ id: 'new-task', answer: 'New answer' }]
  const merged = mergeConfirmedFields(raw, before, after)
  assert.deepEqual(merged.homework.hwTasks, after.homework.hwTasks)
  assert.equal(merged.homework.recHwTime, '18:45', 'edited tasks preserve unrelated unhydrated time')
  assert.equal(merged.homework.hwDateManual, null, 'unchanged child default preserves raw null')
  assert.deepEqual(merged.homework.unknownHomework, raw.homework.unknownHomework)
  assert.deepEqual(merged.content, raw.content); assert.deepEqual(merged.materials, raw.materials)
}
{
  const after = structuredClone(before); after.content.paragraphs = [{ id: 'edited', text: 'Teacher theory' }]
  const merged = mergeConfirmedFields(raw, before, after)
  assert.deepEqual(merged.content.paragraphs, after.content.paragraphs, 'changed array replaces its leaf only')
  assert.deepEqual(merged.content.transcript, raw.content.transcript)
  assert.deepEqual(merged.content.unknownContent, raw.content.unknownContent)
}
{
  const after = structuredClone(before); after.materials.files = []
  const merged = mergeConfirmedFields(raw, before, after)
  assert.deepEqual(merged.materials.files, [], 'explicit empty array clears known leaf')
  assert.deepEqual(merged.materials.privateMetadata, raw.materials.privateMetadata)
}
{
  const after = structuredClone(before); delete after.content.transcript; after.homework.hwTasks = []
  const merged = mergeConfirmedFields(raw, before, after)
  assert.equal(Object.hasOwn(merged.content, 'transcript'), false, 'removed known child explicitly clears it')
  assert.deepEqual(merged.content.unknownContent, raw.content.unknownContent)
  assert.deepEqual(merged.homework.hwTasks, []); assert.equal(merged.homework.recHwTime, '18:45')
}
{
  const after = structuredClone(before); after.homework.recHwTime = ''
  const merged = mergeConfirmedFields(raw, before, after)
  assert.equal(merged.homework.recHwTime, '', 'explicitly edited known scalar can clear raw nonempty time')
  assert.deepEqual(merged.homework.unknownHomework, raw.homework.unknownHomework)
}
{
  const after = structuredClone(before); after.content = null
  assert.equal(mergeConfirmedFields(raw, before, after).content, null, 'explicit root clear is distinct from omission')
  delete after.youtube_url
  const merged = mergeConfirmedFields(raw, before, after)
  assert.equal(Object.hasOwn(merged, 'youtube_url'), false, 'missing optional root field is omitted, not inferred deletion')
  assert.equal(raw.youtube_url, null)
}
{
  const result = mergeConfirmedFields({}, {}, {
    title: 'New lesson', content: { paragraphs: [{ text: 'New theory' }] }, homework: { hwTasks: [] }, materials: {},
  })
  assert.deepEqual(result, { title: 'New lesson', content: { paragraphs: [{ text: 'New theory' }] }, homework: { hwTasks: [] }, materials: {} }, 'new rows get supplied canonical fields/defaults')
  const missingRaw = mergeConfirmedFields({}, { description: '', homework: {} }, { description: '', homework: {} })
  assert.deepEqual(missingRaw, { description: '', homework: {} }, 'unchanged root with no raw field uses canonical default')
}
{
  const after = structuredClone(before)
  // Unknown raw siblings survive even if there was no projected object before.
  after.content = { paragraphs: [{ text: 'First canonical theory' }] }
  const merged = mergeConfirmedFields(raw, { ...before, content: null }, after)
  assert.deepEqual(merged.content.paragraphs, after.content.paragraphs)
  assert.deepEqual(merged.content.transcript, raw.content.transcript)
  assert.deepEqual(merged.content.unknownContent, raw.content.unknownContent)
}
{
  const recordRaw = { payload: { known: 1, unknown: 2 } }
  assert.deepEqual(mergeConfirmedFields(recordRaw, { payload: { known: 1 } }, { payload: { known: 3 } }, ['payload']), { payload: { known: 3, unknown: 2 } }, 'caller may opt in a different JSON root')
  assert.deepEqual(mergeConfirmedFields(recordRaw, { payload: { known: 1 } }, { payload: { known: 3 } }), { payload: { known: 3 } }, 'other changed root objects replace as owned scalar values')
}
{
  const r = { content: { unknown: { a: 9 } }, homework: { recHwTime: '18:45' }, materials: ['legacy-file'] }
  const b = { content: { known: { a: 1, b: [2, 3] } }, homework: { recHwTime: null }, materials: [] }
  const a = { content: { known: { b: [2, 3], a: 1 } }, homework: { recHwTime: null }, materials: [] }
  const merged = mergeConfirmedFields(r, b, a)
  assert.deepEqual(merged.content, r.content, 'object key order is not a change')
  assert.deepEqual(merged.materials, ['legacy-file'], 'unchanged normalized legacy array preserves raw')
}
{
  const snapshots = [raw, before].map(value => structuredClone(value))
  const after = structuredClone(before); after.homework.hwTasks = [{ id: 'new', answer: 'New' }]
  const afterSnapshot = structuredClone(after)
  const merged = mergeConfirmedFields(raw, before, after)
  merged.content.unknownContent.nested.push(3)
  merged.homework.hwTasks[0].answer = 'Output mutation'
  merged.materials.files[0].path = 'mutated.pdf'
  assert.deepEqual(raw, snapshots[0]); assert.deepEqual(before, snapshots[1]); assert.deepEqual(after, afterSnapshot)
  after.homework.hwTasks[0].answer = 'Later UI mutation'
  assert.equal(merged.homework.hwTasks[0].answer, 'Output mutation', 'no shared output/UI leaf reference')
}
{
  const r = JSON.parse('{"__proto__":{"polluted":true},"content":{"__proto__":{"old":1},"unknown":2}}')
  const b = JSON.parse('{"__proto__":{"safe":true},"content":{"known":1}}')
  const a = JSON.parse('{"__proto__":{"safe":true},"content":{"known":2,"__proto__":{"new":3}}}')
  const merged = mergeConfirmedFields(r, b, a)
  assert.equal(Object.getPrototypeOf(merged), Object.prototype)
  assert.equal(Object.getPrototypeOf(merged.content), Object.prototype)
  assert.deepEqual(merged.__proto__, { polluted: true }); assert.deepEqual(merged.content.__proto__, { new: 3 })
  assert.equal({}.polluted, undefined, 'JSON keys do not alter object prototypes')
}
console.log('PASS content preservation: canonical-only root ownership, unchanged raw/null/default/prefix values, unknown siblings, recHwTime, changed arrays/direct leaves, known clears vs optional omissions, new rows, key-order equality, custom roots, deep clone and prototype-safe JSON keys')
