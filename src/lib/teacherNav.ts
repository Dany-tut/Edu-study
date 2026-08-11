import { supabase } from './supabase'
import { t } from './i18n'

// Load the course that owns a lesson, then open it in the course editor so the
// teacher can re-review / tweak that lesson. Mirrors the constructor's
// goToCourseEditor edData shape.
export async function openLessonInCourseEditor(lessonId: string, openCourseEditor: (json: string) => void): Promise<boolean> {
  const { data: lessonRow } = await supabase
    .from('lessons').select('course_id').eq('id', lessonId).single()
  if (!lessonRow?.course_id) return false
  const { data: course } = await supabase
    .from('courses')
    .select('id, short_id, title, subject, level, status, color, bg, description, group_ids, student_ids, course_modules(id, label, position), lessons(short_id, title, lesson_number, position, module_id, youtube_url, timecodes, description, kind, test_tasks)')
    .eq('id', lessonRow.course_id)
    .single()
  if (!course) return false
  const c = course as any
  const dbModules = [...(c.course_modules ?? [])].sort((a, b) => a.position - b.position)
  const dbLessons = [...(c.lessons ?? [])].sort((a, b) => (a.lesson_number ?? a.position ?? 0) - (b.lesson_number ?? b.position ?? 0))
  const lessons = dbLessons.map((l: any, i: number) => ({
    id: l.short_id, title: l.title, number: (l.lesson_number ?? i) + 1,
    kind: l.kind === 'test' ? 'test' : 'lesson',
    testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : [],
    videoUrl: l.youtube_url ?? undefined, description: l.description ?? undefined,
    timecodes: Array.isArray(l.timecodes) ? l.timecodes : [],
  }))
  let modules = dbModules.map((m: any) => ({
    id: m.id, label: m.label, expanded: true,
    lessonIds: dbLessons.filter((l: any) => l.module_id === m.id).map((l: any) => l.short_id),
  }))
  if (modules.length === 0) {
    modules = [{ id: 'm1', label: t('Модуль 1'), expanded: true, lessonIds: lessons.map((l: any) => l.id) }]
  } else {
    const grouped = new Set(modules.flatMap((m: any) => m.lessonIds))
    const ungrouped = dbLessons.filter((l: any) => !grouped.has(l.short_id)).map((l: any) => l.short_id)
    if (ungrouped.length) modules[0].lessonIds.push(...ungrouped)
  }
  openCourseEditor(JSON.stringify({
    id: c.id, title: c.title, subject: c.subject, level: c.level,
    status: c.status, color: c.color, bg: c.bg, description: c.description ?? '',
    dbCourseId: c.short_id, groupIds: c.group_ids ?? [], studentIds: c.student_ids ?? [],
    modules, lessons,
  }))
  return true
}

// A hard submission ("хард домашка") belongs to the homework whose hard layer it
// came from. We link them through the lesson: the submission's baseRef is a
// lesson short_id, and the homework carries that lesson_id. Open that homework in
// the editor (the teacher reaches the lesson from there, course→lesson style).
export async function openHardSubHomework(baseRef: string, openHomeworkEdit: (id: string) => void): Promise<boolean> {
  const { data: lesson } = await supabase.from('lessons').select('id').eq('short_id', baseRef).single()
  if (!lesson?.id) return false
  const { data: hw } = await supabase
    .from('homework')
    .select('id')
    .eq('lesson_id', lesson.id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!hw || hw.length === 0) return false
  openHomeworkEdit(hw[0].id)
  return true
}
