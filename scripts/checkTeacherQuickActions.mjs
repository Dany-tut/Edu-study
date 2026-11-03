// Regression checks against the real navigation/task store, with a controlled Data API.
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const output = 'node_modules/.cache/checkTeacherQuickActions.mjs'
await build({
  stdin: { contents: `export { useTeacher, setLeaveGuard } from './src/store/teacherStore.ts'`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', outfile: output,
  define: { 'import.meta.env.DEV': 'true' },
  plugins: [{ name: 'controlled-boundaries', setup(b) {
    b.onResolve({ filter: /lib\/supabase$|components\/ConfirmHost$|lib\/i18n$/ }, args => ({ path: args.path, namespace: 'test-boundary' }))
    b.onLoad({ filter: /.*/, namespace: 'test-boundary' }, ({ path }) => ({ contents:
      path.endsWith('supabase') ? 'export const supabase = globalThis.__quickActionsDb' :
      path.endsWith('ConfirmHost') ? 'export const confirmDialog = () => Promise.resolve(globalThis.__allowLeave)' :
      'export const t = value => value'
    }))
  } }], logLevel: 'silent',
})
const memory = new Map()
globalThis.sessionStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) }
globalThis.window = { location: { hash: '#/teacher', pathname: '/' }, addEventListener() {} }
let resolveRequest
let request
globalThis.__quickActionsDb = { from(table) {
  request = { table }
  const q = {
    insert(row) { request.insert = row; return q },
    update(row) { request.update = row; return q },
    eq(key, value) { request.filter = [key,value]; return q },
    select() { return q },
    single() { return new Promise(resolve => { resolveRequest = resolve }) },
  }
  return q
} }
const { useTeacher, setLeaveGuard } = await import(pathToFileURL(`${process.cwd()}/${output}`))
const st = () => useTeacher.getState()
st().openLessonEditor('existing-lesson')
st().setActivePage('home')
st().openLessonEditor(null)
assert.equal(st().editingScheduleId, null)
st().openHomeworkEdit('existing-homework')
st().openHomeworkCreate()
assert.equal(st().editingHomeworkId, null)
assert.equal(st().hwPresetStudentId, null)
// Legacy quick links in the summary pill must also start fresh.
st().openLessonEditor('old')
st().setActivePage('lesson-editor')
assert.equal(st().editingScheduleId, null)
st().openHomeworkEdit('old')
st().setActivePage('homework-create')
assert.equal(st().editingHomeworkId, null)
// The form intent survives until its consumer mounts; works on the same page too.
st().openGroupForm('group')
assert.equal(st().activePage, 'groups')
assert.equal(st().pendingGroupForm, 'group')
st().clearPendingGroupForm()
st().openGroupForm('student')
assert.equal(st().pendingGroupForm, 'student')
st().clearPendingGroupForm()
assert.equal(st().pendingGroupForm, null)
// A rejected leave confirmation must not schedule a form or replace an editor.
setLeaveGuard(() => true)
globalThis.__allowLeave = false
st().openGroupForm('group')
await Promise.resolve()
assert.equal(st().pendingGroupForm, null)
st().openLessonEditor('blocked')
await Promise.resolve()
assert.equal(st().editingScheduleId, null)
setLeaveGuard(null)
st().openConstructor('course')
assert.equal(st().constructorIntent, 'course')
const task = { typeId: null, typeLabel: null, typeBg: null, typeColor: null, title: 'Проверка меню', date: '01.11.2026', time: '12:00', comment: '' }
let pending = st().addTask(task)
assert.equal(st().tasks.length, 0, 'No success before server confirmation')
assert.equal(request.table, 'teacher_tasks')
resolveRequest({ error: { message: 'permission denied' }, data: null })
assert.equal((await pending).error, 'permission denied')
assert.equal(st().tasks.length, 0, 'Failed insert must not leave a phantom task')
pending = st().addTask(task)
const row = request.insert
resolveRequest({ error: null, data: row })
assert.equal((await pending).error, null)
assert.equal(st().tasks[0].id, row.id)
assert.equal(st().tasks[0].title, task.title)
pending = st().updateTask(row.id, { ...task, title: 'Изменённая задача' })
assert.deepEqual(request.filter, ['id', row.id])
resolveRequest({ error: { message: 'row missing or inaccessible' }, data: null })
assert.ok((await pending).error)
assert.equal(st().tasks[0].title, task.title, 'Failed edit must preserve the original')
pending = st().updateTask(row.id, { ...task, title: 'Изменённая задача' })
resolveRequest({ error: null, data: { ...row, title: 'Изменённая задача' } })
assert.equal((await pending).error, null)
assert.equal(st().tasks[0].title, 'Изменённая задача')
<<<<<<< HEAD
st().setActivePage('homework')
assert.equal(st().activePage, 'gradebook', 'Retired review section must open the journal')
st().openHomeworkReview('existing-homework')
assert.equal(st().reviewReturnPage, 'gradebook', 'Work review returns to the journal')
=======
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
console.log('PASS: creation context, legacy links, pending forms, leave guard, confirmed task insert/update and failures')
