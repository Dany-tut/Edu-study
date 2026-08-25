// ─────────────────────────────────────────────────────────────────────────────
// Пересев готового курса из сида прямо в базу
//
// ЗАЧЕМ. Курс, созданный из сида месяц назад, живёт в базе снимком: сид с тех
// пор переписали (порции по ≤4 слова, карточка слова ПЕРЕД заданиями с ним), а
// у ученика открыт старый слепок, где слово 오이 надо собрать раньше, чем его
// показали. Пересоздавать курс руками в Конструкторе — значит потерять его id,
// а с ним расписание и прогресс.
//
// ЧТО ДЕЛАЕТ. Собирает курс тем же генератором, что и Конструктор
// (buildLanguageCourse), раскладывает уроки в те же строки таблицы `lessons`,
// какие пишет редактор, и upsert'ит их по short_id. short_id сохраняются
// (`<курс>-0`, `-1`, …), поэтому lesson_progress и календарь не осиротеют.
// Уроки курса, которых в новой сборке нет, удаляются.
//
// ЗАПУСК (ключ service_role — из Supabase → Settings → API; в репозиторий его
// класть не надо, он живёт только в переменной окружения одной команды):
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_KEY=<service_role key> \
//   node scripts/reseedCourse.mjs "Кор хангыль"
//
// Первым аргументом — название курса в базе, вторым (необязательно) --dry:
// показать, что будет записано, и ничего не писать.
// ─────────────────────────────────────────────────────────────────────────────

import { build } from 'esbuild'
import { createClient } from '@supabase/supabase-js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const COURSE_TITLE = process.argv[2] || 'Кор хангыль'
const DRY = process.argv.includes('--dry')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в окружении.')
  process.exit(1)
}

// Сиды написаны на TypeScript — собираем их в один модуль и импортируем.
// Тот же путь, что у приложения: генератор один, расхождению взяться неоткуда.
const dir = mkdtempSync(join(tmpdir(), 'reseed-'))
const entry = join(dir, 'entry.ts')
await build({
  stdin: {
    contents: `
      export { buildKoreanHangulCourse } from '${process.cwd()}/src/data/koreanHangul'
      export { theoryToParagraphs } from '${process.cwd()}/src/lib/theoryImages'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
    sourcefile: entry,
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(dir, 'seed.mjs'),
  logLevel: 'error',
})
const seed = await import(pathToFileURL(join(dir, 'seed.mjs')).href)

const db = createClient(url, key, { auth: { persistSession: false } })

const { data: course, error: courseErr } = await db
  .from('courses').select('id, title').eq('title', COURSE_TITLE).single()
if (courseErr || !course) {
  console.error(`Курс «${COURSE_TITLE}» не найден:`, courseErr?.message)
  process.exit(1)
}

const { data: oldLessons } = await db
  .from('lessons').select('short_id, module_id, position').eq('course_id', course.id).order('position')
const shortPrefix = (oldLessons?.[0]?.short_id ?? '').replace(/-\d+$/, '')
if (!shortPrefix) {
  console.error('У курса нет уроков с short_id вида «<курс>-N» — пересев небезопасен.')
  process.exit(1)
}

const { data: mods } = await db
  .from('course_modules').select('id, position').eq('course_id', course.id).order('position')

const built = seed.buildKoreanHangulCourse(course.id)

// Порядок и поля — как в редакторе (см. syncAccessToSupabase в
// TeacherCourseEditorPage): модули по порядку → их lessonIds, короткий id по
// порядку уроков сборки.
const ordered = []
const seen = new Set()
built.modules.forEach((m, mi) => {
  m.lessonIds.forEach(lid => {
    const lesson = built.lessons.find(l => l.id === lid)
    if (lesson && !seen.has(lid)) { ordered.push({ lesson, mi }); seen.add(lid) }
  })
})
built.lessons.forEach(l => { if (!seen.has(l.id)) { ordered.push({ lesson: l, mi: 0 }); seen.add(l.id) } })

const shortIdByLessonId = {}
built.lessons.forEach((l, i) => { shortIdByLessonId[l.id] = `${shortPrefix}-${i}` })

const rows = ordered.map(({ lesson, mi }, i) => ({
  short_id: shortIdByLessonId[lesson.id] ?? `${shortPrefix}-${i}`,
  course_id: course.id,
  module_id: mods?.[mi]?.id ?? mods?.[0]?.id ?? null,
  title: lesson.title,
  position: i,
  lesson_number: i,
  youtube_url: lesson.videoUrl ?? null,
  timecodes: (lesson.timecodes ?? []).filter(tc => tc.label.trim())
    .map(tc => ({ time: tc.time, label: tc.label.trim(), seconds: tc.seconds })),
  description: lesson.description ?? null,
  content: lesson.theory?.trim()
    ? { paragraphs: seed.theoryToParagraphs(lesson.theory, lesson.theoryImages, shortIdByLessonId[lesson.id]) }
    : {},
  kind: lesson.kind ?? 'lesson',
  test_tasks: lesson.testTasks ?? [],
  materials: lesson.files ?? {},
  scheduled_duration: lesson.scheduledDuration ?? null,
  lesson_sched_manual: lesson.lessonSchedManual ?? false,
  homework: {
    hwTitle: lesson.hwTitle ?? null,
    hwTarget: lesson.hwTarget ?? null,
    hwDate: null,
    hwDateManual: false,
    hwTasks: lesson.hwTasks ?? [],
    recHwTitle: null,
    recHwTarget: null,
    recHwDate: null,
    recHwDateManual: false,
    recHwTasks: [],
  },
}))

console.log(`Курс «${course.title}» (${course.id}): было уроков ${oldLessons?.length ?? 0}, станет ${rows.length}.`)
console.log(rows.slice(0, 5).map(r => `  ${r.short_id} · ${r.title} · заданий ${r.homework.hwTasks.length}`).join('\n'))
if (DRY) { rmSync(dir, { recursive: true, force: true }); process.exit(0) }

// Пишем частями: 59 уроков с конспектами и картинками — это мегабайты, и один
// запрос на всё упирается в лимит тела.
for (let i = 0; i < rows.length; i += 10) {
  const part = rows.slice(i, i + 10)
  const { error } = await db.from('lessons').upsert(part, { onConflict: 'short_id' })
  if (error) { console.error('Не записалось:', error.message); process.exit(1) }
  console.log(`  записано ${Math.min(i + 10, rows.length)} из ${rows.length}`)
}

const keep = rows.map(r => r.short_id)
const stale = (oldLessons ?? []).filter(l => !keep.includes(l.short_id)).map(l => l.short_id)
if (stale.length) {
  const { error } = await db.from('lessons').delete().eq('course_id', course.id).in('short_id', stale)
  if (error) console.error('Лишние уроки не удалились:', error.message)
  else console.log(`  удалено лишних уроков: ${stale.length}`)
}

rmSync(dir, { recursive: true, force: true })
console.log('Готово.')
