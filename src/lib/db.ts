/**
 * Typed Supabase query functions for the student dashboard.
 * All functions return typed data; errors are swallowed and return null/[].
 */
import { supabase } from './supabase'
import { trackEvent } from './analytics'
import { t } from './i18n'
import type { HardTaskStudentBlock, HardTaskReviewBlock } from './useHomework'

/**
 * Report a real Supabase error (RLS denial, 5xx, timeout) to console + analytics
 * so it surfaces in the admin dashboard instead of vanishing into a silent `[]`.
 * Empty result sets are NOT errors and are not reported.
 */
function reportDbError(ctx: string, error: { message?: string; code?: string } | null) {
  if (!error) return
  console.error(`[db:${ctx}]`, error)
  try { trackEvent('db_error', { ctx, msg: String(error.message ?? '').slice(0, 200), code: error.code ?? null }) } catch { /**/ }
}

// «Похож на UUID». Битая student_session (легаси-формат без id/groupId) даёт
// undefined, который в шаблонной строке/сериализации PostgREST превращается в
// литерал "undefined" → 400 `invalid input syntax for type uuid`. Такие id
// отсекаем ДО сети и возвращаем пустой результат.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}
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

  if (error) reportDbError('fetchScheduleDays', error)
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
  review_comment: string | null
  attachments: { tasks?: HardTaskStudentBlock[] } | null
  review_attachments: { photos?: string[]; board?: string | null; annotation?: { image: string; w: number; h: number } | null; tasks?: HardTaskReviewBlock[] } | null
  hard_submitted: boolean
}

export type ReviewAttachments = { photos: string[]; board: string | null; annotation?: { image: string; w: number; h: number } | null }
export type ProgressMap = Record<string, {
  status: LessonStatus; score: number; comment: string; reviewComment: string;
  reviewAttachments: ReviewAttachments; hardSubmitted: boolean;
  // Per-task сложные задания: ответы ученика и ревью учителя (пусто для legacy).
  hardTaskBlocks: HardTaskStudentBlock[];
  hardReviewBlocks: HardTaskReviewBlock[];
}>

// Resolve every student row + group the logged-in person belongs to (all their
// subject cards AND any regular group they were enrolled into). Lets the student
// track show ALL their courses regardless of which subject session is active.
// Falls back to the single session ids when there's no linked auth account.
export type PersonScope = {
  studentIds: string[]
  groupIds: string[]
  rows: Array<{ id: string; groupId: string }>
}
export async function fetchPersonScope(
  fallback: { id: string; groupId: string },
): Promise<PersonScope> {
  const fb = { studentIds: [fallback.id], groupIds: [fallback.groupId], rows: [{ id: fallback.id, groupId: fallback.groupId }] }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return fb
  const { data, error } = await supabase
    .from('students').select('id, group_id').eq('auth_user_id', auth.user.id)
  if (error) reportDbError('fetchPersonScope', error)
  const raw = (data ?? []) as Array<{ id: string; group_id: string }>
  if (raw.length === 0) return fb
  const rows = raw.map(r => ({ id: r.id, groupId: r.group_id }))
  if (!rows.some(r => r.id === fallback.id)) rows.push({ id: fallback.id, groupId: fallback.groupId })
  return {
    studentIds: [...new Set(rows.map(r => r.id))],
    groupIds: [...new Set(rows.map(r => r.groupId))],
    rows,
  }
}

export async function fetchLessonProgress(studentIds: string | string[]): Promise<ProgressMap> {
  // Guard: битые id (undefined / "undefined" / пустые) не должны уходить в сеть.
  const ids = (Array.isArray(studentIds) ? studentIds : [studentIds]).filter(isUuid)
  if (ids.length === 0) return {}
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_ref, subject, status, score, comment, review_comment, attachments, review_attachments, hard_submitted')
    .in('student_id', ids)

  if (error) reportDbError('fetchLessonProgress', error)
  if (error || !data) return {}

  const map: ProgressMap = {}
  for (const row of data as DbProgress[]) {
    map[row.lesson_ref] = {
      status: row.status, score: row.score, comment: row.comment,
      reviewComment: row.review_comment ?? '',
      reviewAttachments: {
        photos: Array.isArray(row.review_attachments?.photos) ? row.review_attachments!.photos! : [],
        board: row.review_attachments?.board ?? null,
        annotation: row.review_attachments?.annotation ?? null,
      },
      hardTaskBlocks: Array.isArray(row.attachments?.tasks) ? row.attachments!.tasks! : [],
      hardReviewBlocks: Array.isArray(row.review_attachments?.tasks) ? row.review_attachments!.tasks! : [],
      hardSubmitted: row.hard_submitted,
    }
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
  student_ids: string[] | null
  group_ids: string[] | null
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
      homework?: import('../data/lessonContent').AuthoredHomework | null
      scheduled_date?: string | null
      scheduled_time?: string | null
      rec_date?: string | null
      rec_time?: string | null
      lesson_sched_manual?: boolean | null
      description?: string | null
    }>
  }>
}

export async function fetchCourseStructure(rows: Array<{ id: string; groupId: string }>): Promise<Subject[]> {
  // Guard: битые id (undefined / "undefined") в orParts дают 400 invalid uuid.
  const studentIds = [...new Set(rows.map(r => r.id))].filter(isUuid)
  const groupIds = [...new Set(rows.map(r => r.groupId))].filter(isUuid)
  // Any course published to ANY of the person's student rows OR groups. Guard
  // against empty arrays (Postgres `cs.{}` is invalid) so the OR never breaks.
  const orParts = [
    ...studentIds.map(id => `student_ids.cs.{${id}}`),
    ...groupIds.map(g => `group_ids.cs.{${g}}`),
  ]
  if (orParts.length === 0) return []
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, short_id, title, subject, student_ids, group_ids,
      course_modules (
        id, label, position,
        lessons ( id, short_id, title, lesson_number, shape, content, youtube_url, timecodes, kind, test_tasks, homework, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual, description )
      )
    `)
    .eq('status', 'published')
    .or(orParts.join(','))
    .order('created_at', { ascending: true })

  if (error) reportDbError('fetchCourseStructure', error)
  if (error || !data || data.length === 0) return []

  // Per-student access mode (full / custom / by_date). Absent row → 'custom'
  // (only teacher-unlocked lessons open), preserving legacy behaviour.
  const courseIds = (data as unknown as DbCourse[]).map(c => c.id)
  const modeByCourse: Record<string, 'full' | 'custom' | 'by_date'> = {}
  if (courseIds.length > 0 && studentIds.length > 0) {
    const { data: enr, error: enrErr } = await supabase
      .from('course_enrollments')
      .select('course_id, access_mode')
      .in('student_id', studentIds)
      .in('course_id', courseIds)
    if (enrErr) reportDbError('fetchCourseStructure.enrollments', enrErr)
    for (const row of (enr ?? []) as Array<{ course_id: string; access_mode: 'full' | 'custom' | 'by_date' }>) {
      modeByCourse[row.course_id] = row.access_mode
    }
  }

  // Which of the person's rows owns each course's enrollment (the row the teacher
  // grades): first a direct student_ids match, else the row inside the course's
  // group. Progress writes for the course use this id, keeping a multi-row
  // person's submissions under the same row on both sides.
  const ownerFor = (course: DbCourse): string | undefined => {
    const sids = course.student_ids ?? []
    const gids = course.group_ids ?? []
    return rows.find(r => sids.includes(r.id))?.id
      ?? rows.find(r => gids.includes(r.groupId))?.id
  }

  return (data as unknown as DbCourse[]).map(course => ({
    id: course.short_id,
    name: course.title,
    subject: course.subject,
    progress: 0,
    activeModuleId: 1,
    accessMode: modeByCourse[course.id] ?? 'custom',
    ownerStudentId: ownerFor(course),
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
              homework: l.homework && (l.homework.hwTasks?.length || l.homework.recHwTasks?.length)
                ? l.homework
                : undefined,
              description: l.description ?? undefined,
              videoUrl: l.youtube_url ?? undefined,
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
                { ...base, id: l.short_id, shape: (l.shape as LessonShape) ?? 'circle', nodeType: 'lesson' as const, videoUrl: undefined },
              ]
            }
            return [{ ...base, id: l.short_id, shape: (l.shape as LessonShape) ?? 'circle' }]
          }),
      })),
  }))
}

// ─── Subjects merged with progress ───────────────────────────────────────────

// Parse a DD.MM.YYYY date and test whether it is on or before today (date-only).
function scheduledOnOrBeforeToday(ddmmyyyy?: string): boolean {
  if (!ddmmyyyy) return false
  const m = ddmmyyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return false
  const [, d, mo, y] = m
  const when = new Date(Number(y), Number(mo) - 1, Number(d))
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return when.getTime() <= today.getTime()
}

export function mergeSubjectsWithProgress(catalog: Subject[], progress: ProgressMap): Subject[] {
  return catalog.map(subject => {
    // Auto-open lessons that have no explicit (unlocked) progress row, based on
    // the student's enrollment mode: 'full' opens everything, 'by_date' opens a
    // lesson once its scheduled date has passed, 'custom' opens nothing here.
    const mode = subject.accessMode ?? 'custom'
    const autoOpen = (lesson: { scheduledDate?: string }): boolean =>
      mode === 'full' || (mode === 'by_date' && scheduledOnOrBeforeToday(lesson.scheduledDate))

    const modules = subject.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        const p = progress[lesson.id]
        if (!p || p.status === 'locked') {
          const status: LessonStatus = autoOpen(lesson) ? 'current' : 'locked'
          return { ...lesson, status, points: undefined, comment: undefined }
        }
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
          // Always enforce the gate — even if a stale progress row gave the test
          // a non-locked status, re-lock it until all prior lessons are done.
          // Exception: keep completed/submitted/returned (student already acted).
          const done = l.status === 'completed' || l.status === 'submitted' || l.status === 'returned'
          if (!done) l.status = allPrevDone ? 'current' : 'locked'
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
  // Stars are earned for hard-level essays the teacher accepted — each lives in
  // its own `${lessonId}-hard` lesson_progress row with status 'completed'.
  const stars = Object.entries(progress).filter(([ref, p]) => ref.endsWith('-hard') && p.status === 'completed').length

  return {
    performance,
    completedTasks: completed.length,
    totalTasks,
    avgScore,
    streak: 0,
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

  if (error) reportDbError('fetchQuizQuestions', error)
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

  if (error) reportDbError('fetchScienceFacts', error)
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

  if (error) reportDbError('fetchScienceMemes', error)
  if (error || !data || data.length === 0) return []
  return data as ScienceMeme[]
}

export async function fetchCourseReactions(): Promise<CourseReaction[]> {
  const { data, error } = await supabase
    .from('course_reactions')
    .select('id, equation, name, lesson, module, emoji, gradient, paragraph')
    .order('created_at', { ascending: true })

  if (error) reportDbError('fetchCourseReactions', error)
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
    // A diverged recording/lesson pair shares a title AND number, so every match
    // must respect the node kind.
    const kindOk = (l: Lesson) => isRec ? l.nodeType === 'rec' : l.nodeType !== 'rec'
    // Exact title is the strongest signal: schedule_lessons has no stable lesson
    // ref, and its lesson_number has historically drifted from lessons.lesson_number
    // (0- vs 1-based), so trusting the number first misrouted status to the wrong
    // lesson. Order: exact title → number → fuzzy title.
    const byTitleExact = wantTitle
      ? all.find(l => kindOk(l) && l.title.toLowerCase().trim() === wantTitle)
      : undefined
    const byNumber = all.find(l => kindOk(l) && l.number === s.lessonNumber)
    const byTitleFuzzy = wantTitle
      ? all.find(l => {
          const t = l.title.toLowerCase().trim()
          return kindOk(l) && (t.includes(wantTitle) || wantTitle.includes(t))
        })
      : undefined
    const match = byTitleExact ?? byNumber ?? byTitleFuzzy
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
  // Назначенные ДЗ живут в lesson_progress под ключом `hw-<id>` (баллы 0–100).
  // Берём проверенные (принято/возвращено), названия — из homework по id.
  const { data } = await supabase
    .from('lesson_progress')
    .select('updated_at, status, score, lesson_ref')
    .eq('student_id', studentId)
    .like('lesson_ref', 'hw-%')
    .not('lesson_ref', 'like', '%-hard')
    .in('status', ['completed', 'returned'])
    .order('updated_at', { ascending: false })
    .limit(20)

  if (!data || data.length === 0) return []

  const hwIds = [...new Set((data as any[]).map(r => (r.lesson_ref as string).slice(3)))]
  const { data: hws } = await supabase.from('homework').select('id, title').in('id', hwIds)
  const titleById = new Map((hws ?? []).map((h: any) => [h.id, h.title]))

  return (data as any[]).map(row => {
    const hwId = (row.lesson_ref as string).slice(3)
    const dateObj = new Date(row.updated_at)
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
    return {
      title: titleById.get(hwId) ?? `${t('ДЗ')} #${hwId.slice(0, 6)}`,
      date: dateStr,
      score: row.score ?? 0,
      maxScore: 100,
      returned: row.status === 'returned',
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
  // Динамика баллов по назначенным ДЗ (lesson_progress `hw-<id>`, 0–100),
  // только принятые работы, по возрастанию времени.
  const { data } = await supabase
    .from('lesson_progress')
    .select('score, updated_at, lesson_ref')
    .eq('student_id', studentId)
    .like('lesson_ref', 'hw-%')
    .not('lesson_ref', 'like', '%-hard')
    .eq('status', 'completed')
    .order('updated_at', { ascending: true })
    .limit(20)

  if (!data || data.length === 0) return []
  return (data as any[]).map(row => Math.max(0, Math.min(100, row.score ?? 0)))
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
    const key = row.source ?? t('Другое')
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
    topic: row.source ?? row.subject ?? t('Неизвестная тема'),
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
