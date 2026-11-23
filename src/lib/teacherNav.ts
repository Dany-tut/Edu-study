import { supabase } from './supabase'
import { beginCourseNavigation } from './courseNavigationIntent'
import { baseLessonRef } from './extraHomework'

// Load the course that owns a lesson, then open it in the course editor so the
// teacher can re-review / tweak that lesson. Mirrors the constructor's
// goToCourseEditor edData shape.
export async function openLessonInCourseEditor(lessonId: string, openCourseEditor: (json: string) => void): Promise<boolean | 'superseded'> {
  const current = beginCourseNavigation()
  const { data: lessonRow } = await supabase
    .from('lessons').select('course_id, short_id').eq('id', lessonId).single()
  if (!current()) return 'superseded'
  if (!lessonRow?.course_id || !lessonRow.short_id) return false
  return loadCourseTarget('id', lessonRow.course_id, lessonRow.short_id, openCourseEditor, current)
}

/** Где в Конструкторе живёт занятие расписания: курс и (если нашёлся) его урок. */
export type ScheduleCourseTarget = { courseId: string; courseTitle: string; lessonShortId: string | null; lessonTitle: string | null }

/**
 * Занятие расписания без `lesson_id` (заведено прямо в расписании или до
 * привязки) ищет свой урок в курсах, назначенных его группе или ученику:
 * точный заголовок → номер (оба 0-based, см. resolveScheduleLesson в db.ts).
 * Курс без подходящего урока возвращается без lessonShortId — откроем курс.
 */
export async function findScheduleCourseTarget(row: {
  groupId: string | null; studentId: string | null; title: string; lessonNumber: number | null
}): Promise<ScheduleCourseTarget | null> {
  if (!row.groupId && !row.studentId) return null
  let q = supabase
    .from('courses')
    .select('id, title, lessons(short_id, title, lesson_number, position)')
  q = row.groupId ? q.contains('group_ids', [row.groupId]) : q.contains('student_ids', [row.studentId!])
  const { data } = await q
  const courses = (data ?? []) as Array<{ id: string; title: string; lessons: Array<{ short_id: string; title: string | null; lesson_number: number | null; position: number | null }> | null }>
  if (courses.length === 0) return null
  const want = row.title.toLowerCase().trim()
  const lessons = courses.flatMap(course => (course.lessons ?? []).map(lesson => ({ course, lesson })))
  const titles = lessons.filter(({ lesson }) => want && (lesson.title ?? '').toLowerCase().trim() === want)
  const byNumber = ({ lesson }: typeof lessons[number]) =>
    row.lessonNumber != null && (lesson.lesson_number ?? lesson.position) === row.lessonNumber
  const numbered = (titles.length ? titles : lessons).filter(byNumber)
  const candidates = titles.length === 1 ? titles : numbered.length ? numbered : titles
  if (candidates.length === 1) {
    const { course, lesson } = candidates[0]
    return { courseId: course.id, courseTitle: course.title, lessonShortId: lesson.short_id, lessonTitle: lesson.title }
  }
  const course = candidates.length ? candidates[0].course : courses.length === 1 ? courses[0] : null
  if (!course || candidates.some(candidate => candidate.course.id !== course.id)) return null
  return { courseId: course.id, courseTitle: course.title, lessonShortId: null, lessonTitle: null }
}

/** Открыть курс в Конструкторе; с lessonShortId — сразу на этом уроке. */
export function openCourseInEditor(courseId: string, lessonShortId: string | null, openCourseEditor: (json: string) => void) {
  return loadCourseTarget('id', courseId, lessonShortId, openCourseEditor, beginCourseNavigation())
}

export function openCourseByShortRefs(courseRef: string, lessonRef: string, openCourseEditor: (json: string) => void) {
  return loadCourseTarget('short_id', courseRef, lessonRef, openCourseEditor, beginCourseNavigation())
}

async function loadCourseTarget(column: 'id' | 'short_id', courseId: string, lessonShortId: string | null,
  openCourseEditor: (json: string) => void, current: () => boolean): Promise<boolean | 'superseded'> {
  const { data: course } = await supabase
    .from('courses')
    .select('short_id, title, subject, level, status, color, bg, description, group_ids, student_ids, lessons(short_id, title)')
    .eq(column, courseId)
    .single()
  if (!current()) return 'superseded'
  if (!course?.short_id) return false
  const lessons = (course.lessons ?? []).map(lesson => ({
    id: lesson.short_id, title: lesson.title,
  }))
  // Keep the intended selection while the editor reads the authoritative course.
  if (lessonShortId && !lessons.some(lesson => lesson.id === lessonShortId)) return false
  if (lessonShortId) {
    try { sessionStorage.setItem(`ce-pos:${course.short_id}`, JSON.stringify({ lessonId: lessonShortId, mode: 'lesson' })) } catch { /* non-fatal */ }
  } else {
    try { sessionStorage.removeItem(`ce-pos:${course.short_id}`) } catch { /* non-fatal */ }
  }
  openCourseEditor(JSON.stringify({
    id: course.short_id, dbCourseId: course.short_id,
    title: course.title, subject: course.subject, level: course.level,
    status: course.status, color: course.color, bg: course.bg, description: course.description ?? '',
    groupIds: course.group_ids ?? [], studentIds: course.student_ids ?? [],
    modules: [], lessons, metadataPending: true, heavyPending: true,
  }))
  return true
}

// A hard submission ("хард домашка") belongs to the homework whose hard layer it
// came from. We link them through the lesson: the submission's baseRef is a
// lesson short_id, and the homework carries that lesson_id. Open that homework in
// the editor (the teacher reaches the lesson from there, course→lesson style).
export async function openHardSubHomework(baseRef: string, openHomeworkEdit: (id: string) => void): Promise<boolean> {
  const { data: lesson } = await supabase.from('lessons').select('id').eq('short_id', baseLessonRef(baseRef)).single()
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
