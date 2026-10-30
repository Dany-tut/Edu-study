import { supabase } from './supabase'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

/** Authoritative editor metadata, loaded after navigation. Never save the
 * shelf's incomplete snapshot if this request fails or is cancelled. */
export async function loadCourseEditorMetadata(shortId: string, signal: AbortSignal): Promise<Pick<CourseEdData, 'groupIds' | 'studentIds' | 'modules' | 'lessons'>> {
  let modules: CourseEdData['modules'] = []

  const { data: dbCourse, error } = await supabase
    .from('courses')
    .select('id, group_ids, student_ids, course_modules(id, label, position), lessons(short_id, title, lesson_number, position, module_id, youtube_url, timecodes, description, kind, test_tasks, scheduled_date, scheduled_time, scheduled_duration, rec_date, rec_time, rec_duration, lesson_sched_manual)')
    .eq('short_id', shortId)
    .abortSignal(signal)
    .single()
  if (error || !dbCourse) throw error ?? new Error('Course not found')
  const groupIds: string[] = dbCourse.group_ids ?? []
  const studentIds: string[] = dbCourse.student_ids ?? []
  const dbModules = [...((dbCourse as any).course_modules ?? [])].sort((a, b) => a.position - b.position)
  const dbLessons = [...((dbCourse as any).lessons ?? [])].sort((a, b) => (a.lesson_number ?? a.position ?? 0) - (b.lesson_number ?? b.position ?? 0))
  const lessons: CourseEdData['lessons'] = dbLessons.map((l: any, i: number) => ({
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
    // Конспект, домашки и файлы сюда НЕ едут: это мегабайты, из-за
    // которых открытие курса ждало секундами. Их досыпает редактор
    // вторым запросом (loadHeavyLessons), а до его прихода курс помечен
    // heavyPending и сохранение заблокировано — иначе запись затёрла бы
    // недоехавшее пустотой.
  }))
  if (dbModules.length > 0) {
    modules = dbModules.map((m: any) => ({
      id: m.id, label: m.label, expanded: true,
      lessonIds: dbLessons.filter((l: any) => l.module_id === m.id).map((l: any) => l.short_id),
    }))
    const grouped = new Set(modules.flatMap(m => m.lessonIds))
    const ungrouped = dbLessons.filter((l: any) => !grouped.has(l.short_id)).map((l: any) => l.short_id)
    if (ungrouped.length) modules[0].lessonIds.push(...ungrouped)
  }
  if (modules.length === 0) {
    modules = [{ id: `course-${shortId}`, label: '', expanded: true, lessonIds: lessons.map(l => l.id) }]
  }
  return { groupIds, studentIds, modules, lessons }
}
