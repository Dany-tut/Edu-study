// ─────────────────────────────────────────────────────────────────────────────
// Разовая простановка отпечатка сида сохранённым курсам
//
// ЗАЧЕМ. Признак «сид ушёл вперёд» на плитке считается сравнением отпечатков:
// пусто в courses.seed_stamp значит «неизвестно», а неизвестное показывается.
// Курсы, сохранённые до появления колонки, все до одного стоят с пустым
// отпечатком — точка горит у каждого. Гасит её заход в курс: редактор считает
// сверку и, если расхождений нет, штампует курс сам. По шестнадцати курсам это
// шестнадцать заходов, и этот скрипт делает ровно то же самое пачкой.
//
// ПРАВИЛО ТО ЖЕ, ЧТО В РЕДАКТОРЕ, И НИ НА ШАГ ШИРЕ. Отпечаток ставится только
// курсу, у которого сверка с сидом дала НОЛЬ расхождений — то есть курс
// доказано совпадает с готовым. Курс с расхождениями остаётся с точкой: он и
// правда отстал, и решать, что из сида брать, — дело учителя в окне «Из сида».
// Скрипт не меняет ни уроков, ни заданий, ни статуса: одна колонка одним
// UPDATE.
//
// ПОЧЕМУ КУРС СОБИРАЕТСЯ ЗДЕСЬ ЗАНОВО. Сверка работает не с строкой БД, а с
// состоянием редактора (CourseEdData): уроки с конспектом, домашками и файлами.
// Поэтому ниже повторена сборка из goToCourseEditor + догрузка тяжёлой половины
// + починка потерянного конспекта — тот же путь, которым курс попадает в
// редактор. Разойдись сборка с оригиналом — сверка покажет ЛИШНИЕ расхождения,
// и курс просто не будет заштампован: ошибка этого скрипта молчит, а не портит.
//
// ЗАПУСК. Дев-сервер (npm run dev), вкладка с кабинетом учителя — нужна ЖИВАЯ
// сессия: и чтение, и запись идут под RLS от лица учителя. В консоли:
//
//   const m = await import('/src/devBackfillSeedStamps.ts')
//   await m.backfillSeedStamps()                 // разбор без записи
//   await m.backfillSeedStamps({ write: true })  // проставить отпечатки
//
// Файл никуда не импортируется — в бандл не попадает, живёт только по этому
// ручному import().
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './lib/supabase'
import { getOwnerId } from './lib/owner'
import { diffAgainstSeed, seedKeyOf } from './lib/seedSync'
import { restoreSeedTheory } from './data/seedTheory'
import { SEED_CARDS } from './data/courseSeedCards'
import { paragraphsToTheory } from './lib/theoryImages'
import { parseLessonFiles } from './lib/lessonFiles'
import type { CourseEdData } from './pages/teacher/TeacherCourseEditorPage'

/** Что случилось с одним курсом. */
interface Report {
  курс: string
  short_id: string
  расхождений: number | '—'
  итог: string
}

const FULL_SELECT =
  'short_id, title, subject, level, description, status, color, bg, created_by, seed_stamp, ' +
  'group_ids, student_ids, ' +
  'course_modules(id, label, position), ' +
  'lessons(short_id, title, lesson_number, position, module_id, youtube_url, timecodes, ' +
  'description, kind, test_tasks, scheduled_date, scheduled_time, scheduled_duration, ' +
  'rec_date, rec_time, rec_duration, lesson_sched_manual, content, homework, materials)'

/** Строка БД → состояние редактора. Повтор goToCourseEditor + тяжёлой догрузки.
 *  Экспортируется ради проверки: сборку можно прогнать на строке, собранной из
 *  самого сида, и убедиться, что сверка после круга даёт ноль расхождений. */
export function rowToCourseEd(row: any): CourseEdData {
  const dbLessons = [...(row.lessons ?? [])].sort(
    (a: any, b: any) => (a.lesson_number ?? a.position ?? 0) - (b.lesson_number ?? b.position ?? 0),
  )
  const lessons = dbLessons.map((l: any, i: number) => {
    const theory = paragraphsToTheory(Array.isArray(l.content?.paragraphs) ? l.content.paragraphs : [])
    const hw = l.homework ?? {}
    return {
      id: l.short_id,
      title: l.title,
      number: (l.lesson_number ?? i) + 1,
      kind: l.kind === 'test' ? 'test' : 'lesson',
      testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : [],
      videoUrl: l.youtube_url ?? undefined,
      timecodes: Array.isArray(l.timecodes) ? l.timecodes : [],
      description: l.description ?? undefined,
      scheduledDate: l.scheduled_date ?? undefined,
      scheduledTime: l.scheduled_time ?? undefined,
      scheduledDuration: l.scheduled_duration ?? undefined,
      recDate: l.rec_date ?? undefined,
      recTime: l.rec_time ?? undefined,
      recDuration: l.rec_duration ?? undefined,
      lessonSchedManual: l.lesson_sched_manual ?? false,
      theory: theory.theory || undefined,
      theoryImages: theory.images,
      files: parseLessonFiles(l.materials),
      hwTitle: hw.hwTitle ?? undefined,
      hwTarget: hw.hwTarget ?? undefined,
      hwDate: hw.hwDate ?? undefined,
      hwDateManual: hw.hwDateManual ?? false,
      hwTasks: Array.isArray(hw.hwTasks) ? hw.hwTasks : [],
      recHwTitle: hw.recHwTitle ?? undefined,
      recHwTarget: hw.recHwTarget ?? undefined,
      recHwDate: hw.recHwDate ?? undefined,
      recHwDateManual: hw.recHwDateManual ?? false,
      recHwTasks: Array.isArray(hw.recHwTasks) ? hw.recHwTasks : [],
    }
  })

  const dbModules = [...(row.course_modules ?? [])].sort((a: any, b: any) => a.position - b.position)
  let modules = dbModules.map((m: any) => ({
    id: m.id,
    label: m.label,
    expanded: true,
    lessonIds: dbLessons.filter((l: any) => l.module_id === m.id).map((l: any) => l.short_id),
  }))
  if (modules.length === 0) {
    modules = [{ id: 'm0', label: 'Модуль 1', expanded: true, lessonIds: lessons.map(l => l.id) }]
  } else {
    // Урок без модуля — в первый, как в редакторе.
    const grouped = new Set(modules.flatMap(m => m.lessonIds))
    const ungrouped = dbLessons.filter((l: any) => !grouped.has(l.short_id)).map((l: any) => l.short_id)
    if (ungrouped.length) modules[0].lessonIds.push(...ungrouped)
  }

  return {
    id: row.short_id,
    dbCourseId: row.short_id,
    title: row.title,
    subject: row.subject ?? 'Химия',
    level: row.level ?? 'ЕГЭ',
    description: row.description ?? '',
    status: row.status ?? 'draft',
    color: row.color ?? 'var(--color-purple)',
    bg: row.bg ?? 'var(--color-purple-soft)',
    groupIds: row.group_ids ?? [],
    studentIds: row.student_ids ?? [],
    modules,
    lessons,
    seedStamp: row.seed_stamp ?? undefined,
  } as CourseEdData
}

export async function backfillSeedStamps({ write = false }: { write?: boolean } = {}): Promise<Report[]> {
  const ownerId = await getOwnerId()
  if (!ownerId) {
    console.error('[seed-stamps] нет сессии — зайди в кабинет учителя в этой же вкладке')
    return []
  }

  // Список отдельно от содержимого: тянуть конспекты всех курсов одним ответом —
  // это десятки мегабайт, поэтому курсы разбираются по одному.
  const { data: list, error: listErr } = await supabase
    .from('courses')
    .select('short_id, title, seed_stamp, created_by')
    .like('short_id', 'seed-%')
    .eq('created_by', ownerId)
    .order('title')
  if (listErr || !list) {
    console.error('[seed-stamps] не прочитать список курсов', listErr)
    return []
  }

  const report: Report[] = []
  for (const brief of list as any[]) {
    const key = seedKeyOf({ id: brief.short_id, dbCourseId: brief.short_id })
    const stamp = key ? SEED_CARDS[key]?.stamp : undefined
    const line = (расхождений: Report['расхождений'], итог: string) =>
      report.push({ курс: brief.title, short_id: brief.short_id, расхождений, итог })

    if (!stamp) { line('—', 'не из сида — пропуск'); continue }
    if (brief.seed_stamp === stamp) { line('—', 'уже на текущем отпечатке'); continue }

    const { data: row, error } = await supabase
      .from('courses').select(FULL_SELECT).eq('short_id', brief.short_id).single()
    if (error || !row) { line('—', `не прочитать курс: ${error?.message ?? 'пусто'}`); continue }

    const course = await restoreSeedTheory(rowToCourseEd(row))
    const diff = await diffAgainstSeed(course)
    if (!diff.seedKey) { line('—', 'сид не найден — пропуск'); continue }
    if (diff.changes.length > 0) { line(diff.changes.length, 'отстал — гасить только через «Из сида»'); continue }

    if (!write) { line(0, 'совпадает с сидом → проставить (сухой прогон)'); continue }

    const { error: upErr } = await supabase
      .from('courses').update({ seed_stamp: stamp }).eq('short_id', brief.short_id)
    line(0, upErr ? `запись не прошла: ${upErr.message}` : `отпечаток проставлен (${stamp})`)
  }

  console.table(report)
  if (!write) console.info('[seed-stamps] сухой прогон. Записать: backfillSeedStamps({ write: true })')
  return report
}
