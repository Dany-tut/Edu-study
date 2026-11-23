import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

// Run without production credentials. ISKRA_PGLITE_MODULE can point to an
// isolated install of @electric-sql/pglite when it isn't in node_modules.
const { PGlite } = await import(process.env.ISKRA_PGLITE_MODULE ?? '@electric-sql/pglite')
const editor = readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx', 'utf8')
const cloneStart = editor.indexOf('  function buildHandoutClone(')
const cloneEnd = editor.indexOf('  async function runHandout(', cloneStart)
assert.ok(cloneStart > 0 && cloneEnd > cloneStart)
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { courseAtomicRows } from './src/lib/courseAtomicRows';
      export { planLegacyLessonWrites } from './src/lib/courseLegacyLessonPreservation';
      export { openCourseInEditor } from './src/lib/teacherNav';
      export function cloneCourse(course, opts) {
        let sequence = 0;
        const uid = () => 'clone-' + (++sequence);
        const earliestCourseDate = () => null;
        const shiftDot = date => date;
        ${editor.slice(cloneStart, cloneEnd)}
        return buildHandoutClone(opts);
      }`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'mock-network', setup(api) {
    api.onResolve({ filter: /^\.\/supabase$/ }, ({ importer }) =>
      importer.endsWith('/teacherNav.ts') ? { path: 'supabase', namespace: 'fixture' } : null)
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export const supabase = globalThis.testSupabase',
    }))
  } }],
})
globalThis.testSupabase = { from: table => {
  assert.equal(table, 'courses')
  return { select: () => ({ eq: () => ({ single: async () => ({
    data: { short_id: 'copy', lessons: [{ short_id: 'copy-33', title: 'Урок 34' }] },
  }) }) }) }
} }
const { courseAtomicRows, planLegacyLessonWrites, openCourseInEditor, cloneCourse } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const selection = new Map()
globalThis.sessionStorage = { setItem: (key, value) => selection.set(key, value) }
let opened
assert.equal(await openCourseInEditor('db-uuid', 'copy-33', raw => { opened = JSON.parse(raw) }), true)
assert.equal(opened.id, 'copy')
assert.equal(opened.dbCourseId, 'copy')
assert.ok(opened.metadataPending && opened.heavyPending)
assert.equal(JSON.parse(selection.get('ce-pos:copy')).lessonId, 'copy-33')
const db = new PGlite()

function course(ref) {
  const lessons = Array.from({ length: 47 }, (_, i) => ({
    id: `${ref}-${i}`, persistedShortId: `${ref}-${i}`, title: `Урок ${i + 1}`, number: i + 1,
  }))
  return { id: ref, modules: [{ id: 'module', label: 'Биология', lessonIds: lessons.map(l => l.id) }], lessons }
}
const serialize = c => courseAtomicRows(c, c.id, c.modules, { module: c.id }).lessonRows
const read = async () => (await db.query('select * from lessons order by short_id')).rows
const chapter = Array.from({ length: 10 }, (_, i) => ({ time: `00:${10 + i}`, label: `Глава ${i + 1}`, seconds: 10 + i }))
const variants = { active: 'edited', edited: chapter }
const original = course('original')
const copy = course('copy')
for (const item of [original, copy]) {
  Object.assign(item.lessons[33], { timecodes: chapter, chapterVariants: variants, description: 'Описание из базы' })
}

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table lessons(
      id uuid primary key default gen_random_uuid(), short_id text unique, course_id text, module_id text,
      title text, position int, lesson_number int, youtube_url text, description text, timecodes jsonb,
      chapter_variants jsonb, content jsonb, materials jsonb, homework jsonb, test_tasks jsonb, kind text,
      scheduled_date text, scheduled_time text, scheduled_duration int,
      rec_date text, rec_time text, rec_duration int, lesson_sched_manual boolean, delivery_mode text,
      updated_at timestamptz default now()
    );
  `)
  const columns = Object.keys(serialize(copy)[33]).join(',')
  await db.query(`insert into lessons (${columns}) select ${columns}
    from jsonb_populate_recordset(null::lessons, $1::jsonb)`, [JSON.stringify([...serialize(original), ...serialize(copy)])])
  await db.exec(readFileSync('supabase/migrations/20261122031218_data_preservation_history.sql', 'utf8'))
  await db.exec(readFileSync('supabase/migrations/20261123085900_preserve_lesson_course.sql', 'utf8'))
  const initial = await read()
  await assert.rejects(db.query(`insert into lessons(short_id,course_id)
    values('original-33','copy') on conflict(short_id) do update set course_id=excluded.course_id`),
    { code: '23514', message: /a saved lesson cannot change course/ })
  assert.deepEqual(await read(), initial)
  const stored = initial.filter(row => row.course_id === 'copy')
  const draft = JSON.parse(JSON.stringify(copy))
  draft.lessons[33].title = 'Новая правка из восстановленного черновика'
  delete draft.lessons[33].timecodes
  delete draft.lessons[33].description
  delete draft.lessons[33].chapterVariants
  const outgoing = serialize(draft)
  const old = outgoing[33]
  assert.deepEqual(old.timecodes, [])
  // Match the actual 23514 incident first; a separate case below covers both fields missing.
  await assert.rejects(db.query(`update lessons set title=$1, timecodes=$2 where short_id=$3`,
    [old.title, JSON.stringify(old.timecodes), old.short_id]), { code: '23514', message: /refusing to clear lessons.timecodes/ })
  assert.deepEqual(await read(), initial)

  const { upserts, updates } = planLegacyLessonWrites(outgoing, stored)
  assert.equal(upserts.length, 46)
  assert.equal(updates.length, 1)
  const repair = updates[0]
  assert.equal(repair.stored.short_id, 'copy-33')
  assert.ok(!('timecodes' in repair.values) && !('chapter_variants' in repair.values) && !('description' in repair.values))
  const updateColumns = columns.split(',').filter(key => key !== 'short_id')
  await db.query(`insert into lessons (${columns}) select ${columns}
    from jsonb_populate_recordset(null::lessons, $1::jsonb)
    on conflict(short_id) do update set ${updateColumns.map(key => `${key}=excluded.${key}`).join(',')}`, [JSON.stringify(upserts)])
  // Apply every field present in the real payload, scoped to the original row
  // and stamp, as the PATCH does. Omitted fields stay in Postgres.
  const patch = (values, stamp) => {
    const keys = Object.keys(values)
    assert.ok(keys.every(key => /^[a-z_]+$/.test(key)))
    return db.query(`update lessons l set ${keys.map(key => `${key}=p.${key}`).join(',')}
      from jsonb_populate_record(null::lessons, $1::jsonb) p
      where l.course_id=p.course_id and l.short_id=p.short_id and l.updated_at=$2
      returning l.short_id`, [JSON.stringify(values), stamp])
  }
  assert.equal((await patch(repair.values, '2000-01-01T00:00:00Z')).rows.length, 0)
  assert.equal((await patch(repair.values, repair.stored.updated_at)).rows.length, 1)
  assert.deepEqual(await read(), initial.map(row => row.short_id === old.short_id ? { ...row, title: old.title } : row))

  const blank = { ...old, timecodes: [] }
  assert.equal(planLegacyLessonWrites([blank], []).upserts.length, 1, 'a new or verified row keeps the original write semantics')
  const clearOnlyDescription = { ...old, timecodes: chapter }
  assert.deepEqual(planLegacyLessonWrites([clearOnlyDescription], stored).updates[0].values.timecodes, chapter)
  const chapterEdit = { ...old, timecodes: chapter, chapter_variants: variants, description: 'Новый текст' }
  assert.deepEqual(planLegacyLessonWrites([chapterEdit], stored).upserts, [chapterEdit])
  const clone = cloneCourse({ ...copy, dbCourseId: 'copy', serverStamp: stored[0].updated_at }, { groupId: 'test', title: 'Отдельная группа' })
  assert.equal(clone.dbCourseId, undefined)
  assert.equal(clone.serverStamp, undefined)
  const cloneRows = serialize(clone)
  assert.equal(new Set(cloneRows.map(row => row.short_id)).size, 47)
  assert.ok(cloneRows.every(row => row.short_id.startsWith(`${clone.id}-`)))
  assert.deepEqual(cloneRows[33].timecodes, chapter)
  await db.query(`insert into lessons (${columns}) select ${columns}
    from jsonb_populate_recordset(null::lessons, $1::jsonb)`, [JSON.stringify(cloneRows)])
  assert.equal((await read()).length, 141)
  assert.deepEqual((await read()).filter(row => row.course_id === 'original'), initial.filter(row => row.course_id === 'original'))
  console.log('PASS: schedule entry, exact preservation trigger, restored draft, guarded PATCH, 47-lesson readback and independent handout references')
} finally {
  await db.close()
}
