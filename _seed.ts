import { buildKoreanHangulCourse } from './src/data/koreanHangul'
import { theoryToParagraphs } from './src/lib/theoryImages'
import { writeFileSync } from 'node:fs'

const COURSE_DB_ID = '9cc8f839-c0fc-40e5-a00a-95864319ebe5'
const SHORT = 'seed-kohg-84fe210b'
const MODULE_DB: Record<number, string> = {
  0: '1570b28d-2d6d-41e4-932f-3792df1ed744',
  1: 'cbbe6393-1e96-4c4b-bbbe-9620a31ffb18',
  2: 'da4be3ea-b1bf-4e01-a541-c12544b6b7a1',
}

const c: any = buildKoreanHangulCourse(COURSE_DB_ID)

// Порядок как в редакторе: модули по порядку → их lessonIds.
const ordered: Array<{ lesson: any; mi: number }> = []
const seen = new Set<string>()
c.modules.forEach((m: any, mi: number) => {
  m.lessonIds.forEach((lid: string) => {
    const lesson = c.lessons.find((l: any) => l.id === lid)
    if (lesson && !seen.has(lid)) { ordered.push({ lesson, mi }); seen.add(lid) }
  })
})
c.lessons.forEach((l: any) => { if (!seen.has(l.id)) { ordered.push({ lesson: l, mi: 0 }); seen.add(l.id) } })

// short_id — как lessonShortIdMap: ни один id сборки не начинается с префикса
// курса, поэтому суффиксы раздаются подряд в порядке c.lessons.
const shortIdByLessonId: Record<string, string> = {}
let n = -1
c.lessons.forEach((l: any) => { n += 1; shortIdByLessonId[l.id] = `${SHORT}-${n}` })

const rows = ordered.map(({ lesson, mi }, i) => ({
  short_id: shortIdByLessonId[lesson.id] ?? `${SHORT}-${i}`,
  course_id: COURSE_DB_ID,
  module_id: MODULE_DB[mi] ?? null,
  title: lesson.title,
  position: i,
  lesson_number: i,
  youtube_url: lesson.videoUrl ?? null,
  timecodes: (lesson.timecodes ?? []).filter((tc: any) => tc.label.trim())
    .map((tc: any) => ({ time: tc.time, label: tc.label.trim(), seconds: tc.seconds })),
  description: lesson.description ?? null,
  content: lesson.theory?.trim()
    ? { paragraphs: theoryToParagraphs(lesson.theory, lesson.theoryImages, shortIdByLessonId[lesson.id] ?? lesson.id) }
    : {},
  kind: lesson.kind ?? 'lesson',
  test_tasks: lesson.testTasks ?? [],
  materials: lesson.files ?? {},
  scheduled_date: lesson.scheduledDate ?? null,
  scheduled_time: lesson.scheduledTime ?? null,
  scheduled_duration: lesson.scheduledDuration ?? null,
  rec_date: lesson.recDate ?? null,
  rec_time: lesson.recTime ?? null,
  rec_duration: lesson.recDuration ?? null,
  lesson_sched_manual: lesson.lessonSchedManual ?? false,
  homework: {
    hwTitle: lesson.hwTitle ?? null,
    hwTarget: lesson.hwTarget ?? null,
    hwDate: lesson.hwDate ?? null,
    hwDateManual: lesson.hwDateManual ?? false,
    hwTasks: lesson.hwTasks ?? [],
    recHwTitle: lesson.recHwTitle ?? null,
    recHwTarget: lesson.recHwTarget ?? null,
    recHwDate: lesson.recHwDate ?? null,
    recHwDateManual: lesson.recHwDateManual ?? false,
    recHwTasks: lesson.recHwTasks ?? [],
  },
}))

writeFileSync(process.argv[2], JSON.stringify(rows))
console.log('уроков:', rows.length, '| байт:', JSON.stringify(rows).length)
console.log(rows.slice(0, 3).map(r => `${r.short_id} · ${r.title} · заданий ${r.homework.hwTasks.length}`).join('\n'))
