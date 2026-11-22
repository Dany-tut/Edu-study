import { courseSnapshotStamp } from './courseSaveProvenance'
import { lessonNumberShift } from './lessonNumber'
import { supabase } from './supabase'
import type { Witness } from './courseConfirmedBaseline'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

/** Authoritative editor metadata, loaded after navigation. Never save the
 * shelf's incomplete snapshot if this request fails or is cancelled. */
export type CourseMetadata = Pick<CourseEdData, 'serverStamp' | 'title' | 'subject' | 'level' | 'status' | 'description' | 'color' | 'bg' | 'seedStamp' | 'numberStart' | 'groupIds' | 'studentIds' | 'modules' | 'lessons'>
export type CourseMetadataRead = {
  metadata: CourseMetadata
  witness: Witness
  rawCourse: Record<string, unknown>
  rawLessons: Array<Record<string, unknown>>
  numberStart: { included: false } | { included: true; readCourseUpdatedAt: string }
}
export async function loadCourseEditorMetadata(shortId: string, signal: AbortSignal): Promise<CourseMetadataRead> {
  let modules: CourseEdData['modules'] = []

  const { data: dbCourse, error } = await supabase
    .from('courses')
    .select('id, created_by, updated_at, title, subject, level, status, description, color, bg, seed_stamp, group_ids, student_ids, course_modules(id, label, position), lessons(id, updated_at, short_id, title, lesson_number, position, module_id, youtube_url, timecodes, chapter_variants, description, kind, test_tasks, scheduled_date, scheduled_time, scheduled_duration, rec_date, rec_time, rec_duration, lesson_sched_manual, delivery_mode)')
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
    persistedShortId: l.short_id,
    title: l.title,
    number: (l.lesson_number ?? i) + 1,
    kind: l.kind === 'test' ? 'test' : 'lesson',
    testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : [],
    videoUrl: l.youtube_url ?? undefined,
    timecodes: Array.isArray(l.timecodes) ? l.timecodes : [],
    chapterVariants: l.chapter_variants ?? undefined,
    description: l.description ?? undefined,
    scheduledDate: l.scheduled_date ?? undefined,
    scheduledTime: l.scheduled_time ?? undefined,
    scheduledDuration: l.scheduled_duration ?? undefined,
    recDate: l.rec_date ?? undefined,
    recTime: l.rec_time ?? undefined,
    recDuration: l.rec_duration ?? undefined,
    lessonSchedManual: l.lesson_sched_manual ?? false,
    deliveryMode: l.delivery_mode ?? 'live',
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
  const numberStart = await readNumberStart(dbCourse.id, signal)
  const metadata: CourseMetadata = {
    serverStamp: courseSnapshotStamp(dbCourse.updated_at, dbLessons.map((lesson: any) => lesson.updated_at)),
    title: dbCourse.title, subject: dbCourse.subject, level: dbCourse.level,
    status: dbCourse.status === 'published' ? 'published' : 'draft',
    description: dbCourse.description ?? '',
    color: dbCourse.color ?? 'var(--color-purple)', bg: dbCourse.bg ?? 'var(--color-purple-soft)',
    seedStamp: dbCourse.seed_stamp ?? undefined,
    numberStart: numberStart.value,
    groupIds, studentIds, modules, lessons,
  }
  return {
    metadata,
    rawCourse: { id: dbCourse.id, title: dbCourse.title, subject: dbCourse.subject, level: dbCourse.level, status: dbCourse.status, description: dbCourse.description, color: dbCourse.color, bg: dbCourse.bg, seed_stamp: dbCourse.seed_stamp, ...(numberStart.value === undefined ? {} : { number_start: numberStart.rawValue }) },
    rawLessons: structuredClone(dbLessons),
    witness: {
      courseId: dbCourse.id, courseShortId: shortId, ownerId: dbCourse.created_by ?? '',
      courseUpdatedAt: dbCourse.updated_at,
      modules: dbModules.map((m: any) => ({ id: m.id, label: m.label, position: m.position })),
      lessons: dbLessons.map((l: any) => ({ id: l.id, shortId: l.short_id, moduleId: l.module_id, updatedAt: l.updated_at })),
    },
    numberStart: numberStart.value === undefined ? { included: false }
      : { included: true, readCourseUpdatedAt: numberStart.updatedAt ?? '' },
  }
}

/**
 * courses.number_start отдельным запросом: миграцию на прод накатывают
 * отдельно, и до неё колонки нет. Тогда — undefined: поле в редакторе
 * скрыто и в сохранение не уходит, курс открывается как раньше.
 */
async function readNumberStart(courseId: string, signal: AbortSignal): Promise<{ value?: number; updatedAt?: string; rawValue?: number | null }> {
  const { data, error } = await supabase
    .from('courses').select('number_start,updated_at').eq('id', courseId).abortSignal(signal).maybeSingle()
  if (error || !data) return {}
  return { value: lessonNumberShift(data.number_start) + 1, updatedAt: data.updated_at, rawValue: data.number_start }
}

export async function loadNumberStart(courseId: string, signal: AbortSignal): Promise<number | undefined> {
  return (await readNumberStart(courseId, signal)).value
}
