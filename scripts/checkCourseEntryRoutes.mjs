import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const page = name => readFileSync(`src/pages/teacher/${name}.tsx`, 'utf8')
const editor = page('TeacherLessonEditorPage')
const publish = editor.slice(editor.indexOf('  async function publish(started:'), editor.indexOf('  // Shared glass recipe'))
assert.ok(publish.startsWith('  async function publish('))
const catalog = page('TeacherConstructorPage')
const seed = catalog.slice(catalog.indexOf('  async function goToSeedCourseEditor('), catalog.indexOf('  function goToNewCourseEditor('))
assert.ok(seed.startsWith('  async function goToSeedCourseEditor('))
const dependencies = [
  'editingScheduleId', 'source', 'sourceDate', 'lessonRowId', 'loaded', 'meta', 't', 'setPublishErr', 'intent',
  'videoUrl', 'timecodes', 'description', 'files', 'current', 'revision', 'setLoaded', 'writeDraft', 'draftNs',
  'clearDrafts', 'setPublished', 'setActivePage', 'confirmDialog', 'scheduleMove', 'setSourceDate', 'setSource',
]
const { outputFiles } = await build({
  stdin: { contents: `
    export * from './src/lib/teacherNav'
    export * from './src/lib/courseNavigationIntent'
    export * from './src/lib/scheduleLessonEdits'
    import { patchScheduleChapters, patchScheduleMaterials } from './src/lib/scheduleLessonEdits'
    import { plainTitle } from './src/lib/lessonKey'
    import { beginCourseNavigation } from './src/lib/courseNavigationIntent'
    export function runSeed(env) {
      const { courses, getOwnerId, dbCourseToLocal, goToCourseEditor, openCourseEditor, alertDialog, t, seedCourseId } = env
      const COURSE_CARD_SELECT = '*'
      ${seed}
      return goToSeedCourseEditor(env.seed)
    }
    import { parseLessonFiles } from './src/lib/lessonFiles'
    export { parseLessonFiles }
    import { supabase } from './src/lib/supabase'
    export function runPublish(env) {
      const {${dependencies.join(',')}, setTimeout, window} = env
      ${publish}
      return publish(env.revision.current)
    }
  `, loader: 'ts', resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'fixture', setup(api) {
    api.onResolve({ filter: /(?:^|\/)supabase$/ }, () => ({ path: 'db', namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = globalThis.fixtureDB' }))
  } }],
})
let courses = [], lookup = {}, links = {}, writes = [], returnRow = true, afterUpdate = () => {}
globalThis.fixtureDB = { auth: { onAuthStateChange() {} }, from(table) {
  const filters = {}
  let patch = null
  return {
    select() { return this },
    contains() { return Promise.resolve({ data: courses }) },
    eq(key, value) { filters[key] = value; return this },
    is(key, value) { filters[key] = value; return this },
    update(value) { patch = value; return this },
    single() { return Promise.resolve(table === 'lessons' ? links[filters.id] : lookup[filters.id ?? filters.short_id]) },
    async maybeSingle() {
      if (table === 'courses') return lookup[filters.short_id]
      writes.push({ table, patch, filters })
      afterUpdate()
      return { data: returnRow ? { id: 'schedule', updated_at: 'v2', materials: {}, chapter_variants: null } : null }
    },
  }
} }
const src = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'))
const legacyLink = { path: 'https://example.org/lesson.pdf', url: 'https://example.org/lesson.pdf', name: 'Тетрадь' }
const rawFiles = { workbook: legacyLink, materials: [{ ...legacyLink, id: 'existing-id' }] }
const loadedFiles = src.parseLessonFiles(rawFiles)
assert.deepEqual(loadedFiles, src.parseLessonFiles(structuredClone(rawFiles)), 'rehydration must not create new IDs for existing links')
assert.equal(loadedFiles.materials[0].id, 'existing-id')
const store = new Map()
globalThis.sessionStorage = { setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }
const requests = []
const open = json => requests.push(JSON.parse(json))
const lesson = (id, n) => ({ short_id: id, lesson_number: n, title: 'Тема' })
courses = [
  { id: 'courseA', title: 'A', lessons: [lesson('a1', 1), lesson('a2', 2)] },
  { id: 'courseB', title: 'B', lessons: [lesson('b1', 1)] },
]
const find = (title, lessonNumber) => src.findScheduleCourseTarget({ groupId: 'group', title, lessonNumber })
assert.equal(await find('Тема', 1), null)
assert.equal((await find('Тема', 2)).lessonShortId, 'a2')
assert.equal(await find('Unknown', 1), null)
courses.pop()
assert.equal((await find('Тема', null)).lessonShortId, null)
assert.equal((await find('Unknown', 1)).lessonShortId, 'a1')
lookup['uuid-A'] = lookup['short-A'] = { data: { short_id: 'short-A', lessons: [lesson('a1', 1)] } }
links['uuid-lesson'] = { data: { course_id: 'uuid-A', short_id: 'a1' } }
await src.openLessonInCourseEditor('uuid-lesson', open)
assert.equal(requests.at(-1).id, 'short-A')
assert.equal(requests.at(-1).metadataPending, true)
await src.openCourseByShortRefs('short-A', 'a1', open)
assert.equal(JSON.parse(store.get('ce-pos:short-A')).lessonId, 'a1')
assert.equal(await src.openCourseByShortRefs('short-A', 'foreign', open), false)
assert.equal(requests.length, 2)
await src.openCourseInEditor('uuid-A', null, open)
assert.ok(!store.has('ce-pos:short-A'))
let resolve
lookup.slow = new Promise(r => { resolve = r })
const pending = src.openCourseInEditor('slow', null, open)
await src.openCourseByShortRefs('short-A', 'a1', open)
resolve(lookup['short-A'])
assert.equal(await pending, 'superseded')
assert.equal(requests.length, 4)
const left = src.openCourseInEditor('slow', null, open)
src.invalidateCourseNavigation()
assert.equal(await left, 'superseded')

let built = 0
const seeded = [], errors = []
const seedEnv = {
  courses: [], getOwnerId: async () => 'owner', seedCourseId: () => 'seed-id',
  dbCourseToLocal: row => row, goToCourseEditor: row => seeded.push(row), openCourseEditor: open,
  alertDialog: message => errors.push(message), t: x => x,
  seed: { summary: { stamp: 'seed-v1' }, build: async id => { built++; return { id } } },
}
lookup['seed-id'] = { data: { id: 'saved', short_id: 'seed-id' } }
await src.runSeed(seedEnv)
assert.equal(seeded.at(-1).id, 'saved'); assert.equal(built, 0)
lookup['seed-id'] = { data: null, error: 'offline' }
await src.runSeed(seedEnv)
assert.equal(errors.length, 1); assert.equal(built, 0)
lookup['seed-id'] = { data: null, error: null }
await src.runSeed(seedEnv)
assert.equal(built, 1); assert.equal(requests.at(-1).id, 'seed-id')

function environment(fields = []) {
  writes = []; returnRow = true; afterUpdate = () => {}
  const env = {
    editingScheduleId: 'schedule', lessonRowId: 'lesson', loaded: { id: 'lesson', stamp: 'v1', materials: {}, variants: null, publishedCodes: [], recording: 'video' },
    source: { id: 'schedule', topic: 'Тема', time: '10:00', endTime: '11:00', lessonNumber: 1 }, sourceDate: '01.02.2026',
    meta: { recipients: [{ kind: 'group', id: 'group' }], title: 'Тема', date: '01.02.2026', startTime: '10:00', endTime: '11:00', lessonNumber: '1' },
    intent: { current: { lessonId: 'lesson', stamp: 'v1', fields } }, current: { current: true }, revision: { current: 2 },
    description: 'Правка', timecodes: [], files: {}, videoUrl: '', draftNs: 'lessoned.schedule',
    setLoaded: value => { env.loaded = value }, t: key => key, writeDraft() {}, setTimeout() {}, window: { dispatchEvent() {} },
    setPublishErr: error => { env.error = error }, clearDrafts: () => { env.cleared = true }, setPublished() {},
    confirmDialog: async () => false, scheduleMove: async () => {}, setSourceDate() {}, setSource() {},
  }
  return env
}
let env = environment()
env.loaded = null
await src.runPublish(env)
assert.equal(writes.length, 0)
assert.ok(env.error)
env = environment()
await src.runPublish(env)
assert.deepEqual(writes, [])
env = environment(['description'])
await src.runPublish(env)
assert.deepEqual(writes, [{ table: 'lessons', patch: { description: 'Правка' }, filters: { id: 'lesson', updated_at: 'v1' } }])
assert.equal(env.cleared, true)
env = environment(['timecodes'])
env.loaded.variants = { source: 'video', active: 'slides', revision: 1, text: [{ time: '0:11', label: 'Hidden' }], slides: [], extra: 7 }
env.timecodes = [{ time: '1:02', label: 'Visible', originalTitle: 'Original' }]
await src.runPublish(env)
assert.equal(writes[0].patch.timecodes[0].seconds, 62)
assert.deepEqual(writes[0].patch.chapter_variants.text[0].label, 'Hidden')
assert.equal(writes[0].patch.chapter_variants.slides[0].originalTitle, 'Original')
assert.throws(() => src.patchScheduleChapters([], { active: 'text', source: 'old', revision: 1, text: [] }, [], 'new'))
assert.throws(() => src.patchScheduleChapters([], { active: 'text', source: 'video', revision: 1, text: [] }, [{ time: '0:00', label: 'New' }], 'video'))
env = environment(['description'])
returnRow = false
await src.runPublish(env)
assert.ok(env.error); assert.ok(!env.cleared); assert.equal(writes.length, 1)
env = environment(['description'])
env.intent.current.stamp = 'stale'
await src.runPublish(env)
assert.equal(writes.length, 0); assert.ok(!env.cleared)
env = environment(['description'])
afterUpdate = () => env.revision.current++
await src.runPublish(env)
assert.ok(!env.cleared); assert.deepEqual(env.intent.current.fields, ['description'])
const file = { path: 'p', id: '1', name: 'm', size: 1, mime: '' }
const raw = { notebook: { ...file, hidden: true }, materials: [{ ...file, hidden: true }, { legacy: 'keep' }], private: 1 }
const added = { ...file, path: 'q', id: '2' }
const changed = src.patchScheduleMaterials(raw, { notebook: file, materials: [file] }, { notebook: file, materials: [file, added] })
assert.deepEqual(changed, { ...raw, materials: [...raw.materials, added] })
console.log('PASS: UUID/short-ref and ambiguous routes, obsolete requests, course-only selection, linked schedule edit CAS, early/empty/late writes, chapters and unknown materials.')
