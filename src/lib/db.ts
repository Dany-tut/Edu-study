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
  node_type?: 'lesson' | 'rec'
}

export async function fetchScheduleDays(groupId: string, studentId?: string): Promise<ScheduleDay[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today); from.setDate(from.getDate() - 3)
  const to   = new Date(today); to.setDate(to.getDate() + 7)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const fmt  = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`

  // A lesson reaches the student either through their group OR a direct
  // (student-scoped) assignment. Match both.
  const scope: string[] = []
  if (groupId) scope.push(`group_id.eq.${groupId}`)
  if (studentId) scope.push(`student_id.eq.${studentId}`)
  if (scope.length === 0) return []

  const { data, error } = await supabase
    .from('schedule_lessons')
    .select('*')
    .or(scope.join(','))
    .gte('date', fmt(from))
    .lte('date', fmt(to))
    .order('date', { ascending: true })
    .order('time_start', { ascending: true })

  if (error || !data) return []

  // Build ScheduleDay[] grouped by date. A student targeted via both their
  // group and a direct assignment gets two rows for one lesson — dedup them.
  const byDate = new Map<string, DbScheduleLesson[]>()
  const seen = new Set<string>()
  for (const row of data as DbScheduleLesson[]) {
    const key = `${row.date}|${row.time_start}|${row.lesson_title}|${row.lesson_number}|${row.subject}`
    if (seen.has(key)) continue
    seen.add(key)
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
        kind: row.node_type === 'rec' ? 'rec' as const : 'lesson' as const,
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
      kind?: string | null
      test_tasks?: import('../data/mockData').TestTask[] | null
      scheduled_date?: string | null
      scheduled_time?: string | null
      rec_date?: string | null
      rec_time?: string | null
      lesson_sched_manual?: boolean | null
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
        lessons ( id, short_id, title, lesson_number, shape, content, youtube_url, timecodes, kind, test_tasks, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual )
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
          .flatMap(l => {
            const base = {
              title: l.title,
              number: l.lesson_number,
              status: 'locked' as LessonStatus,
              kind: l.kind === 'test' ? 'test' as const : 'lesson' as const,
              testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : undefined,
              subject: course.short_id,
              content: l.content && (l.content as { paragraphs?: unknown[] }).paragraphs?.length
                ? (l.content as import('../data/lessonContent').LessonContentData)
                : undefined,
              videoId: rutubeEmbedId(l.youtube_url),
              timecodes: Array.isArray(l.timecodes) && l.timecodes.length ? l.timecodes : undefined,
              scheduledDate: l.scheduled_date ?? undefined,
            }
            // Recording date diverged from the lesson date → split into two nodes:
            // a 🎥 «Запись» node (live session) and a 📖 «Урок» node, each tracked
            // independently (progress keyed by the synthetic `~rec` ref).
            const diverged = !!l.lesson_sched_manual && !!l.rec_date
              && (l.rec_date !== l.scheduled_date || l.rec_time !== l.scheduled_time)
            if (diverged) {
              return [
                { ...base, id: `${l.short_id}~rec`, shape: 'square' as LessonShape, nodeType: 'rec' as const, content: undefined, scheduledDate: l.rec_date ?? undefined },
                { ...base, id: l.short_id, shape: (l.shape as LessonShape) ?? 'circle', nodeType: 'lesson' as const, videoId: undefined },
              ]
            }
            return [{ ...base, id: l.short_id, shape: (l.shape as LessonShape) ?? 'circle' }]
          }),
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

    // Gate test nodes: a final test auto-unlocks once every non-test lesson
    // before it is completed. Already-taken tests keep their progress status.
    {
      const flat = modules.flatMap(m => m.lessons)
      let allPrevDone = true
      for (const l of flat) {
        if (l.kind === 'test') {
          if (l.status === 'locked') l.status = allPrevDone ? 'current' : 'locked'
        } else if (l.status !== 'completed') {
          allPrevDone = false
        }
      }
    }

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
    // Show the whole track as soon as the course has any lessons — locked nodes
    // included. The teacher unlocks individual lessons over time.
    subject.modules.some(m => m.lessons.length > 0)
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

export function resolveScheduleLesson(
  s: ScheduleLesson,
  subjects: Subject[],
): { subjectId: string | null; lesson: Lesson | null } {
  // Several courses can share the same subject name (e.g. two "Химия"
  // courses), so a name→id map would collapse them and resolve to the wrong
  // course. Search every course whose name matches instead.
  const wantSubject = s.subject.toLowerCase().trim()
  const candidates = subjects.filter(su => su.name.toLowerCase().trim() === wantSubject)
  const pool = candidates.length > 0 ? candidates : subjects
  const fallbackSubjectId = candidates[0]?.id ?? null

  const wantTitle = s.lessonTitle.toLowerCase().trim()
  const isRec = s.kind === 'rec'

  for (const subject of pool) {
    const all = subject.modules.flatMap(m => m.lessons)
    // Prefer the authoritative lesson_number the teacher scheduled (a diverged
    // recording/lesson pair shares a number, so also match the node kind).
    const byNumber = all.find(l =>
      l.number === s.lessonNumber && (isRec ? l.nodeType === 'rec' : l.nodeType !== 'rec'))
    const byTitle = wantTitle
      ? all.find(l => {
          const t = l.title.toLowerCase().trim()
          return t === wantTitle || t.includes(wantTitle) || wantTitle.includes(t)
        })
      : undefined
    const match = byNumber ?? byTitle
    if (match) return { subjectId: subject.id, lesson: match }
  }
  return { subjectId: fallbackSubjectId, lesson: null }
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
  studentId: string,
  groupId: string,
): Promise<StudentCourseInfo[]> {
  const orClause = groupId
    ? `student_ids.cs.{${studentId}},group_ids.cs.{${groupId}}`
    : `student_ids.cs.{${studentId}}`

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, subject')
    .or(orClause)

  if (!courses || courses.length === 0) return []

  const results: StudentCourseInfo[] = []
  for (const course of courses) {
    const { data: lessonRefs } = await supabase
      .from('lessons')
      .select('short_id')
      .eq('course_id', course.id)
      .not('short_id', 'is', null)

    const shortIds = (lessonRefs ?? []).map((l: any) => l.short_id as string)
    const totalLessons = shortIds.length

    let completedLessons = 0
    if (shortIds.length > 0) {
      const { count } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('status', ['done', 'submitted'])
        .in('lesson_ref', shortIds)
      completedLessons = count ?? 0
    }

    results.push({
      id: course.id,
      title: course.title,
      subject: course.subject ?? '',
      totalLessons,
      completedLessons,
    })
  }

  return results
}

// ─── Teacher: student HW history ─────────────────────────────────────────────
export interface StudentHwItem {
  title: string
  date: string
  score: number
  maxScore: number
  returned: boolean
}

export async function fetchStudentHwHistory(studentId: string): Promise<StudentHwItem[]> {
  const { data } = await supabase
    .from('homework_submissions')
    .select('submitted_at, verdict, score, hw_id, homework(title)')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  if (!data || data.length === 0) return []

  return (data as any[]).map(row => {
    const hwTitle = row.homework?.title ?? `ДЗ #${row.hw_id?.slice(0, 6)}`
    const dateObj = new Date(row.submitted_at)
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
    return {
      title: hwTitle,
      date: dateStr,
      score: row.score ?? 0,
      maxScore: 10,
      returned: row.verdict === 'returned',
    }
  })
}

// ─── Teacher: student lesson attendance history ───────────────────────────────
export interface StudentLessonItem {
  date: string
  topic: string
  attended: boolean
}

export async function fetchStudentLessonHistory(studentId: string, groupId: string): Promise<StudentLessonItem[]> {
  const { data: attendance } = await supabase
    .from('lesson_attendance')
    .select('lesson_date, present, group_id')
    .eq('student_id', studentId)
    .order('lesson_date', { ascending: false })
    .limit(20)

  if (!attendance || attendance.length === 0) return []

  const dates = attendance.map((a: any) => a.lesson_date as string)
  const { data: scheduled } = await supabase
    .from('schedule_lessons')
    .select('date, lesson_title')
    .eq('group_id', groupId)
    .in('date', dates)

  const topicByDate = new Map<string, string>()
  for (const s of (scheduled ?? []) as any[]) {
    topicByDate.set(s.date, s.lesson_title)
  }

  return (attendance as any[]).map(a => {
    const dateObj = new Date(a.lesson_date)
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
    return {
      date: dateStr,
      topic: topicByDate.get(a.lesson_date) ?? a.lesson_date,
      attended: a.present ?? false,
    }
  })
}

// ─── Teacher: score dynamics (avg HW score per submission) ───────────────────
export async function fetchStudentScoreDynamics(studentId: string): Promise<number[]> {
  const { data } = await supabase
    .from('homework_submissions')
    .select('score, submitted_at')
    .eq('student_id', studentId)
    .not('verdict', 'eq', 'returned')
    .order('submitted_at', { ascending: true })
    .limit(20)

  if (!data || data.length === 0) return []
  return (data as any[]).map(row => Math.round(((row.score ?? 0) / 10) * 100))
}

// ─── Teacher: trainer topic sections from confidence_log ─────────────────────
export interface TrainerSection {
  section: string
  correct: number
  total: number
}

export interface WrongTask {
  id: number
  topic: string
  line: number
}

export async function fetchStudentTrainerSections(
  studentId: string,
  authUserId?: string | null,
): Promise<TrainerSection[]> {
  // confidence_log.student_id is TEXT — may be auth_user_id or student UUID
  const ids = [studentId]
  if (authUserId && authUserId !== studentId) ids.push(authUserId)

  const { data } = await supabase
    .from('confidence_log')
    .select('source, correct')
    .in('student_id', ids)

  if (!data || data.length === 0) return []

  const bySource = new Map<string, { correct: number; total: number }>()
  for (const row of data as any[]) {
    const key = row.source ?? 'Другое'
    if (!bySource.has(key)) bySource.set(key, { correct: 0, total: 0 })
    const s = bySource.get(key)!
    s.total++
    if (row.correct) s.correct++
  }

  return Array.from(bySource.entries()).map(([section, { correct, total }]) => ({ section, correct, total }))
}

export async function fetchStudentWrongTasks(
  studentId: string,
  authUserId?: string | null,
): Promise<WrongTask[]> {
  const ids = [studentId]
  if (authUserId && authUserId !== studentId) ids.push(authUserId)

  const { data } = await supabase
    .from('confidence_log')
    .select('id, subject, source')
    .in('student_id', ids)
    .eq('correct', false)
    .limit(10)

  if (!data || data.length === 0) return []

  return (data as any[]).map((row, i) => ({
    id: typeof row.id === 'number' ? row.id : i + 1000,
    topic: row.source ?? row.subject ?? 'Неизвестная тема',
    line: 0,
  }))
}

// ─── Teacher: trainer activity heatmap (last 28 days) ────────────────────────
export async function fetchStudentActivity(
  studentId: string,
  authUserId?: string | null,
): Promise<number[]> {
  const ids = [studentId]
  if (authUserId && authUserId !== studentId) ids.push(authUserId)

  const since = new Date()
  since.setDate(since.getDate() - 27)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('confidence_log')
    .select('created_at')
    .in('student_id', ids)
    .gte('created_at', since.toISOString())

  // Build a map: YYYY-MM-DD → count
  const counts = new Map<string, number>()
  for (const row of (data ?? []) as any[]) {
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  // Return array of 28 heat levels (0–3), index 0 = oldest day
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const n = counts.get(key) ?? 0
    if (n === 0) return 0
    if (n <= 5) return 1
    if (n <= 15) return 2
    return 3
  })
}

// ─── Teacher: unique trainer session days (activity days count) ───────────────
export async function fetchStudentSessionDays(
  studentId: string,
  authUserId?: string | null,
): Promise<number> {
  const ids = [studentId]
  if (authUserId && authUserId !== studentId) ids.push(authUserId)

  const { data } = await supabase
    .from('confidence_log')
    .select('created_at')
    .in('student_id', ids)

  const days = new Set(
    (data ?? []).map((row: any) => new Date(row.created_at).toISOString().slice(0, 10))
  )
  return days.size
}
