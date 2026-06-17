/**
 * Typed Supabase query functions for the student dashboard.
 * All functions return typed data; errors are swallowed and return null/[].
 */
import { supabase } from './supabase'
import {
  type Subject,
  type Lesson,
  type LessonStatus,
  type LessonShape,
  type ScheduleDay,
  type ScheduleLesson,
  type QuizQuestion,
  type QuizAnswer,
  type ScienceFact,
  type ScienceMeme,
  type CourseReaction,
} from '../data/mockData'

// ─── Schedule ────────────────────────────────────────────────────────────────

interface DbScheduleLesson {
  id: string
  group_id: string
  date: string
  time_start: string
  subject: string
  lesson_title: string
  lesson_number: number
}

export async function fetchScheduleDays(groupId: string): Promise<ScheduleDay[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today); from.setDate(from.getDate() - 3)
  const to   = new Date(today); to.setDate(to.getDate() + 7)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const fmt  = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`

  const { data, error } = await supabase
    .from('schedule_lessons')
    .select('*')
    .eq('group_id', groupId)
    .gte('date', fmt(from))
    .lte('date', fmt(to))
    .order('date', { ascending: true })
    .order('time_start', { ascending: true })

  if (error || !data) return []

  // Build ScheduleDay[] grouped by date
  const byDate = new Map<string, DbScheduleLesson[]>()
  for (const row of data as DbScheduleLesson[]) {
    if (!byDate.has(row.date)) byDate.set(row.date, [])
    byDate.get(row.date)!.push(row)
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
  const days: ScheduleDay[] = []

  // Span -3..+7 days from today
  for (let offset = -3; offset <= 7; offset++) {
    const d = new Date(today); d.setDate(d.getDate() + offset)
    const dateStr = fmt(d)
    const rows = byDate.get(dateStr) ?? []
    const lessons: ScheduleLesson[] = rows.map(row => {
      const [hh, mm] = row.time_start.split(':').map(Number)
      const lessonTime = new Date(d); lessonTime.setHours(hh, mm, 0, 0)
      const nowMs = Date.now()
      const passed = lessonTime.getTime() < nowMs
      const minutesUntil = Math.round((lessonTime.getTime() - nowMs) / 60000)
      const upcoming = minutesUntil >= 0 && minutesUntil <= 60
      return {
        id: row.id,
        subject: row.subject,
        lessonTitle: row.lesson_title,
        lessonNumber: row.lesson_number,
        time: row.time_start,
        passed: passed && !upcoming,
        upcoming: upcoming || undefined,
        minutesUntil: minutesUntil > 0 ? minutesUntil : undefined,
      }
    })
    days.push({
      date: dateStr,
      label: formatter.format(d),
      isToday: offset === 0,
      lessons,
    })
  }

  return days
}

// ─── Lesson progress ─────────────────────────────────────────────────────────

interface DbProgress {
  lesson_ref: string
  subject: string
  status: LessonStatus
  score: number
  comment: string
  hard_submitted: boolean
}

export type ProgressMap = Record<string, { status: LessonStatus; score: number; comment: string; hardSubmitted: boolean }>

export async function fetchLessonProgress(studentId: string): Promise<ProgressMap> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_ref, subject, status, score, comment, hard_submitted')
    .eq('student_id', studentId)

  if (error || !data) return {}

  const map: ProgressMap = {}
  for (const row of data as DbProgress[]) {
    map[row.lesson_ref] = { status: row.status, score: row.score, comment: row.comment, hardSubmitted: row.hard_submitted }
  }
  return map
}

export async function upsertLessonProgress(
  studentId: string,
  lessonRef: string,
  subject: string,
  patch: Partial<{ status: LessonStatus; score: number; comment: string }>,
): Promise<void> {
  await supabase.from('lesson_progress').upsert({
    student_id: studentId,
    lesson_ref: lessonRef,
    subject,
    ...patch,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id,lesson_ref' })
}

// ─── Course structure from Supabase ──────────────────────────────────────────

interface DbCourse {
  id: string
  short_id: string
  title: string
  subject: string
  course_modules: Array<{
    id: string
    label: string
    position: number
    lessons: Array<{
      id: string
      short_id: string
      title: string
      lesson_number: number
      shape: string
      content?: import('../data/lessonContent').LessonContentData | Record<string, never>
      youtube_url?: string | null
      timecodes?: import('../data/lessonContent').LessonTimecode[]
    }>
  }>
}

/** Extract a RuTube embed id from a pasted video URL (the student player embeds
 *  rutube.ru/play/embed/<id>). Accepts /video/<id>/, /play/embed/<id>, or a bare id. */
function rutubeEmbedId(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([0-9a-f]+)/i)
  if (m) return m[1]
  if (/^[0-9a-f]{16,}$/i.test(url.trim())) return url.trim()
  return undefined
}

export async function fetchCourseStructure(studentId: string, groupId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, short_id, title, subject,
      course_modules (
        id, label, position,
        lessons ( id, short_id, title, lesson_number, shape, content, youtube_url, timecodes )
      )
    `)
    .eq('status', 'published')
    .or(`student_ids.cs.{${studentId}},group_ids.cs.{${groupId}}`)
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []

  return (data as unknown as DbCourse[]).map(course => ({
    id: course.short_id,
    name: course.subject,
    progress: 0,
    activeModuleId: 1,
    modules: [...course.course_modules]
      .sort((a, b) => a.position - b.position)
      .map(mod => ({
        id: mod.position,
        label: mod.label,
        lessons: [...mod.lessons]
          .sort((a, b) => a.lesson_number - b.lesson_number)
          .map(l => ({
            id: l.short_id,
            title: l.title,
            number: l.lesson_number,
            status: 'locked' as LessonStatus,
            shape: (l.shape as LessonShape) ?? 'circle',
            subject: course.short_id,
            content: l.content && (l.content as { paragraphs?: unknown[] }).paragraphs?.length
              ? (l.content as import('../data/lessonContent').LessonContentData)
              : undefined,
            videoId: rutubeEmbedId(l.youtube_url),
            timecodes: Array.isArray(l.timecodes) && l.timecodes.length ? l.timecodes : undefined,
          })),
      })),
  }))
}

// ─── Subjects merged with progress ───────────────────────────────────────────

export function mergeSubjectsWithProgress(catalog: Subject[], progress: ProgressMap): Subject[] {
  return catalog.map(subject => {
    const modules = subject.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        const p = progress[lesson.id]
        if (!p) return { ...lesson, status: 'locked' as LessonStatus, points: undefined, comment: undefined }
        return { ...lesson, status: p.status, points: p.score > 0 ? p.score : undefined, comment: p.comment || undefined }
      }),
    }))

    // Compute activeModuleId: first module with an active lesson, otherwise module 1
    const allLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })))
    const currentLesson = allLessons.find(l => l.status === 'current' || l.status === 'submitted' || l.status === 'returned')
    const activeModuleId = currentLesson ? currentLesson.moduleId : (modules[0]?.id ?? 1)

    // Compute progress %
    const total = allLessons.length
    const completed = allLessons.filter(l => l.status === 'completed').length
    const progress_pct = total > 0 ? Math.round((completed / total) * 100) : 0

    return { ...subject, modules, activeModuleId, progress: progress_pct }
  }).filter(subject =>
    subject.modules.some(m => m.lessons.some(l => l.status !== 'locked'))
  )
}

// ─── Student stats (computed from progress) ──────────────────────────────────

export interface StudentStats {
  performance: number
  completedTasks: number
  totalTasks: number
  avgScore: number
  streak: number
  totalPoints: number
  stars: number
}

export function computeStats(progress: ProgressMap): StudentStats {
  const entries = Object.values(progress)
  const completed = entries.filter(p => p.status === 'completed')
  // Include submitted lessons in score stats — the student earned the score
  // even before the teacher finalises the review.
  const scored = entries.filter(p => p.status === 'completed' || p.status === 'submitted')
  const withScore = scored.filter(p => p.score > 0)
  const totalPoints = scored.reduce((s, p) => s + (p.score ?? 0), 0)
  const avgScore = withScore.length > 0
    ? Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length)
    : 0
  const totalTasks = entries.length
  const performance = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0
  // Stars are earned only for hard-level tasks (essay), not basic auto-graded tests.
  const stars = entries.filter(p => p.hardSubmitted && (p.status === 'completed' || p.status === 'submitted')).length

  return {
    performance,
    completedTasks: completed.length,
    totalTasks,
    avgScore,
    streak: 5,
    totalPoints,
    stars,
  }
}

// ─── Content tables (quiz, facts, memes, reactions) ──────────────────────────

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, title, subject, answers')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []
  return (data as Array<{ id: string; title: string; subject: string; answers: QuizAnswer[] }>).map(r => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    answers: r.answers,
  }))
}

export async function fetchScienceFacts(): Promise<ScienceFact[]> {
  const { data, error } = await supabase
    .from('science_facts')
    .select('id, subject, emoji, body, gradient, image')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []
  return (data as Array<{ id: string; subject: string; emoji: string; body: string; gradient: string; image: string }>).map(r => ({
    id: r.id,
    subject: r.subject as 'Химия' | 'Биология',
    emoji: r.emoji,
    text: r.body,
    gradient: r.gradient,
    image: r.image,
  }))
}

export async function fetchScienceMemes(): Promise<ScienceMeme[]> {
  const { data, error } = await supabase
    .from('science_memes')
    .select('id, subject, emoji, setup, punchline, gradient')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []
  return data as ScienceMeme[]
}

export async function fetchCourseReactions(): Promise<CourseReaction[]> {
  const { data, error } = await supabase
    .from('course_reactions')
    .select('id, equation, name, lesson, module, emoji, gradient, paragraph')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []
  return data as CourseReaction[]
}

// ─── Catalog utilities (pure, work with live subjects) ───────────────────────

const subjectNameToId = (subjects: Subject[]) =>
  Object.fromEntries(subjects.map(s => [s.name.toLowerCase(), s.id]))

export function resolveScheduleLesson(
  s: ScheduleLesson,
  subjects: Subject[],
): { subjectId: string | null; lesson: Lesson | null } {
  const nameMap = subjectNameToId(subjects)
  const subjectId = nameMap[s.subject.toLowerCase()] ?? null
  const subject = subjects.find(su => su.id === subjectId)
  if (!subject) return { subjectId, lesson: null }

  const want = s.lessonTitle.toLowerCase()
  const all = subject.modules.flatMap(m => m.lessons)
  const match = all.find(l => {
    const t = l.title.toLowerCase()
    return want.includes(t) || t.includes(want)
  })
  return { subjectId, lesson: match ?? null }
}

export function findChemistryLessonByTitle(
  title: string,
  subjects: Subject[],
): { lesson: Lesson; moduleId: number } | null {
  const subject = subjects.find(s => s.id === 'chemistry')
  if (!subject) return null
  const want = title.trim().toLowerCase()
  for (const m of subject.modules) {
    const lesson = m.lessons.find(l => l.title.toLowerCase() === want)
    if (lesson) return { lesson, moduleId: m.id }
  }
  for (const m of subject.modules) {
    const lesson = m.lessons.find(l => {
      const t = l.title.toLowerCase()
      return t.includes(want) || want.includes(t)
    })
    if (lesson) return { lesson, moduleId: m.id }
  }
  return null
}

// ─── Teacher: student active courses ─────────────────────────────────────────
export interface StudentCourseInfo {
  id: string
  title: string
  subject: string
  totalLessons: number
  completedLessons: number
}

export async function fetchStudentActiveCourses(
  authUserId: string,
  groupId: string,
): Promise<StudentCourseInfo[]> {
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, subject')
    .or(`student_ids.cs.{${authUserId}},group_ids.cs.{${groupId}}`)

  if (!courses || courses.length === 0) return []

  const results: StudentCourseInfo[] = []
  for (const course of courses) {
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course.id)

    const { data: lessonRefs } = await supabase
      .from('lessons')
      .select('short_id')
      .eq('course_id', course.id)
      .not('short_id', 'is', null)

    const shortIds = (lessonRefs ?? []).map((l: any) => l.short_id as string)

    let completedLessons = 0
    if (shortIds.length > 0) {
      const { count } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', authUserId)
        .eq('status', 'done')
        .in('lesson_ref', shortIds)
      completedLessons = count ?? 0
    }

    results.push({
      id: course.id,
      title: course.title,
      subject: course.subject ?? '',
      totalLessons: totalLessons ?? 0,
      completedLessons,
    })
  }

  return results
}
