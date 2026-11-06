import type { Student, Group } from '../data/teacherMockData'
import { homeworkResult, homeworkDisplayScore, type HomeworkAttempt } from './homeworkResult'

export interface JournalCourse {
  id: string; short_id: string; title: string; subject: string; kind: string
  group_ids: string[] | null; student_ids: string[] | null
}
export interface CourseJournalLesson {
  id: string; short_id: string; course_id: string; module_id: string | null
  title: string; kind: string | null; position: number; lesson_number: number | null
  scheduled_date: string | null; scheduled_time: string | null
  rec_date: string | null; rec_time: string | null; lesson_sched_manual: boolean | null
  delivery_mode: string | null; youtube_url: string | null
  extraHw?: {id: string; date?: string | null; tasks?: unknown[]}[] | null
  hwTask: unknown; recTask: unknown; hwDate: string | null; recHwDate: string | null
}
export interface JournalModule { id: string; course_id: string; label: string; position: number }
export interface JournalEvent {
  id: string; lesson_id: string | null; node_type: string | null
  group_id: string | null; student_id: string | null
  date: string; time_start: string; time_end: string | null
  lesson_title: string; subject: string; status: string
}
export interface JournalWork {
  id: string; student_id: string; lesson_ref: string; status: string; score: number | null
  attachments: unknown; updated_at: string; review_comment?: string | null
}
export interface JournalAssignment {
  id: string; lesson_id: string | null; group_id: string | null
  title: string; due_date: string | null; status: string; assignedAt?: string | null; basicTasks?: unknown; basicTask?: unknown
}
export interface JournalMark { schedule_id: string; attendance: Record<string, boolean | null> }
export interface JournalLegacyMark {
  student_id: string; lesson_date: string; lesson_title: string; present: boolean; grade: number | null
}
export interface JournalAttempt extends HomeworkAttempt { student_id: string; lesson_ref: string }
export interface CourseJournalData {
  courses: JournalCourse[]; lessons: CourseJournalLesson[]; modules: JournalModule[]
  students: Student[]; groups: Group[]; events: JournalEvent[]; work: JournalWork[]
  assignments: JournalAssignment[]; marks: JournalMark[]; legacy: JournalLegacyMark[]
  attempts: JournalAttempt[]; warnings: string[]; demo: boolean
}
export interface JournalColumn {
  id: string; title: string; lesson: CourseJournalLesson | null
  moduleId: string | null; date: string | null; time: string | null
  recording: boolean; events: JournalEvent[]; required: boolean; due: string | null
  assignment?: JournalAssignment
}
export type JournalWorkState = 'none' | 'available' | 'future' | 'progress' | 'pending' | 'returned' | 'passed' | 'low' | 'submitted' | 'overdue'
export interface JournalCell {
  column: JournalColumn; student: Student; event: JournalEvent | null
  present: boolean | null; grade: number | null; cancelled: boolean; applicable: boolean
  watched: boolean; watchStarted: boolean; studied: boolean
  work: JournalWork | null; related: JournalWork[]; state: JournalWorkState
  score: number | null; latestScore: number | null; passingScore: number; attempts: JournalAttempt[]
  passed: boolean
  due: string | null; required: boolean; attention: boolean
  needsAttendance: boolean
}

export const OUTSIDE_COURSES = '__outside__'
export function journalDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const dot = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const iso = dot ? `${dot[3]}-${dot[2]}-${dot[1]}` : raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
}
export function courseRoster(data: CourseJournalData, courseId: string): Student[] {
  if (courseId === OUTSIDE_COURSES) {
    const lessonIds = new Set(data.lessons.map(l => l.id))
    const events = data.events.filter(e => !e.lesson_id || !lessonIds.has(e.lesson_id))
    const assignments = data.assignments.filter(a => !a.lesson_id)
    return data.students.filter(s => events.some(e => eventReaches(e, s)) || assignments.some(a => a.group_id === s.groupId))
  }
  const course = data.courses.find(c => c.id === courseId)
  return course ? data.students.filter(s => course.student_ids?.includes(s.id) || course.group_ids?.includes(s.groupId)) : []
}
export function eventReaches(event: JournalEvent, student: Student): boolean {
  return event.student_id === student.id || (!!event.group_id && event.group_id === student.groupId)
}
function eventHasEnded(event: JournalEvent, today: string, time: string): boolean {
  if (event.status === 'completed') return true
  const start = Date.parse(`${event.date}T${(event.time_start || '00:00').slice(0, 5).padStart(5, '0')}:00Z`)
  let end = event.time_end ? Date.parse(`${event.date}T${event.time_end.slice(0, 5).padStart(5, '0')}:00Z`) : start + 2 * 3600000
  if (event.time_end && end < start) end += 86400000
  return Number.isFinite(end) && Date.parse(`${today}T${time}:00Z`) >= end
}
export function journalColumns(data: CourseJournalData, courseId: string): JournalColumn[] {
  if (courseId === OUTSIDE_COURSES) {
    const lessonIds = new Set(data.lessons.map(l => l.id))
    const events: JournalColumn[] = data.events.filter(e => !e.lesson_id || !lessonIds.has(e.lesson_id))
      .sort((a, b) => `${a.date}${a.time_start}`.localeCompare(`${b.date}${b.time_start}`))
      .map(e => ({ id: e.id, title: e.lesson_title, lesson: null, moduleId: null, date: e.date, time: e.time_start,
        recording: e.node_type === 'rec', events: [e], required: false, due: null }))
    const assignments: JournalColumn[] = data.assignments.filter(a => !a.lesson_id && !['draft', 'archived'].includes(a.status))
      .map(a => ({ id: `hw-${a.id}`, title: a.title, lesson: null, moduleId: null, date: null, time: null,
        recording: false, events: [], required: true, due: journalDate(a.due_date), assignment: a }))
    return [...events, ...assignments]
  }
  return data.lessons.filter(l => l.course_id === courseId)
    .sort((a, b) => (a.lesson_number ?? a.position) - (b.lesson_number ?? b.position))
    .flatMap(l => {
      const split = l.lesson_sched_manual && l.rec_date && (l.rec_date !== l.scheduled_date || l.rec_time !== l.scheduled_time)
      return (split ? [true, false] : [false]).map(recording => ({
        id: l.short_id + (recording ? '~rec' : ''), title: l.title, lesson: l, moduleId: l.module_id,
        date: journalDate(recording ? l.rec_date : l.scheduled_date), time: recording ? l.rec_time : l.scheduled_time,
        recording, events: data.events.filter(e => e.lesson_id === l.id && (e.node_type === 'rec') === recording),
        required: l.kind === 'test' || hasBasicTask(recording ? l.recTask : l.hwTask),
        due: journalDate(recording ? l.recHwDate : l.hwDate),
      }))
    })
}
function hasBasicTask(tasks: unknown): boolean {
  return Array.isArray(tasks) ? tasks.some(task => task && !(task as { isHard?: boolean }).isHard) : !!tasks
}

/** Build indexes once per response, rather than scanning every student's history for every cell. */
export function buildJournalIndex(data: CourseJournalData) {
  const work = new Map<string, JournalWork>()
  const attempts = new Map<string, JournalAttempt[]>()
  const marks = new Map(data.marks.map(m => [m.schedule_id, m.attendance]))
  const related = new Map<string, JournalWork[]>()
  for (const row of data.work) {
    work.set(`${row.student_id}:${row.lesson_ref}`, row)
    const base = row.lesson_ref.replace(/^video-/, '').replace(/-hard$/, '').split('~')[0]
    const key = `${row.student_id}:${base}`
    related.set(key, [...(related.get(key) ?? []), row])
  }
  for (const row of data.attempts) {
    const key = `${row.student_id}:${row.lesson_ref}`
    attempts.set(key, [...(attempts.get(key) ?? []), row])
  }
  return { work, attempts, marks, related }
}
export function journalCell(data: CourseJournalData, index: ReturnType<typeof buildJournalIndex>, student: Student, column: JournalColumn, today: string, time = '23:59'): JournalCell {
  const events = column.events.filter(e => eventReaches(e, student))
  const event = events.find(e => e.status !== 'cancelled' && e.student_id === student.id)
    ?? events.find(e => e.status !== 'cancelled') ?? events[0] ?? null
  const cancelled = events.length > 0 && events.every(e => e.status === 'cancelled')
  const applicable = !!column.lesson || events.length > 0 || (!!column.assignment && column.assignment.group_id === student.groupId)
  let present: boolean | null = null
  // Exact event marks win, including an explicit null. Legacy marks are used only
  // if all matching events identify the same lesson, node, date and time.
  const exact = [event, ...events].find(e => e && e.status !== 'cancelled' && Object.prototype.hasOwnProperty.call(index.marks.get(e.id) ?? {}, student.id))
  if (exact) present = index.marks.get(exact.id)![student.id]
  const legacy = event ? data.legacy.find(m => m.student_id === student.id && m.lesson_date === event.date && m.lesson_title === event.lesson_title) : undefined
  const sameTitle = event ? data.events.filter(e => e.status !== 'cancelled' && eventReaches(e, student) && e.date === event.date && e.lesson_title === event.lesson_title) : []
  const unambiguous = new Set(sameTitle.map(e => JSON.stringify([e.lesson_id, e.node_type, e.time_start, e.subject]))).size === 1
  if (!exact && unambiguous && legacy) present = legacy.present
  const grade = unambiguous ? legacy?.grade ?? null : null
  const assignments = data.assignments.filter(a => a.status !== 'draft' && a.status !== 'archived' && a.lesson_id === column.lesson?.id && a.group_id === student.groupId)
  const direct = index.work.get(`${student.id}:${column.id}`)
  const assignmentWork = assignments.map(a => index.work.get(`${student.id}:hw-${a.id}`)).find(Boolean)
  const work = direct ?? assignmentWork ?? null
  const attempts = work ? [...(index.attempts.get(`${student.id}:${work.lesson_ref}`) ?? [])].sort((a, b) => a.number - b.number) : []
  const result = work ? homeworkResult(work.attachments, work.score, work.status, attempts) : undefined
  const video = index.work.get(`${student.id}:video-${column.id}`)?.attachments as { video?: { completed?: boolean; ranges?: unknown[] } } | undefined
  const watched = video?.video?.completed === true
  const watchStarted = watched || !!video?.video?.ranges?.length
  const submitted = !!work && ['submitted', 'returned', 'completed'].includes(work.status)
  const required = column.required || assignments.some(a => !!a.basicTask) || submitted || result?.draft === true
  const due = journalDate(assignments.find(a => a.due_date)?.due_date) ?? column.due
  const future = !!(event?.date ?? column.date) && (event?.date ?? column.date)! > today
  let state: JournalWorkState = !required ? 'none' : future ? 'future' : 'available'
  if (work?.status === 'returned') state = 'returned'
  else if (result?.draft) state = 'progress'
  else if (result?.pending) state = 'pending'
  else if (result?.passed) state = 'passed'
  else if (result?.percent !== null && result?.percent !== undefined) state = 'low'
  else if (work?.status === 'submitted' || work?.status === 'completed') state = 'submitted'
  else if (required && work?.status === 'locked') state = 'future'
  else if (required && work?.status === 'current') state = 'progress'
  if (required && due && due < today && ['available', 'progress'].includes(state)) state = 'overdue'
  if (cancelled || !applicable) state = 'none'
  const ended = !!event && eventHasEnded(event, today, time)
  const needsAttendance = !cancelled && applicable && ended && present === null && column.lesson?.kind !== 'test' && !column.recording && column.lesson?.delivery_mode !== 'recording'
  return { column, student, event, present, grade, cancelled, applicable, watched, watchStarted,
    studied: !cancelled && (watched || (column.lesson?.delivery_mode !== 'recording' && present === true)),
    work, related: index.related.get(`${student.id}:${column.lesson?.short_id ?? column.id}`) ?? [],
    state, score: homeworkDisplayScore(result), latestScore: result?.percent ?? null,
    passingScore: result?.passingScore ?? 80, passed: result?.passed === true, attempts, due, required: required && !cancelled && applicable,
    needsAttendance, attention: !cancelled && applicable && (['pending', 'returned', 'low', 'overdue'].includes(state) || needsAttendance) }
}
export function journalSummary(cells: JournalCell[], today: string) {
  const relevant = cells.filter(c => c.applicable && !c.cancelled)
  const available = relevant.filter(c => !c.column.assignment && c.column.lesson?.kind !== 'test' && (!(c.event?.date ?? c.column.date) || (c.event?.date ?? c.column.date)! <= today))
  const required = relevant.filter(c => c.required && c.state !== 'future')
  const scores = required.flatMap(c => c.score === null || ['pending', 'returned'].includes(c.state) ? [] : [c.score])
  return { studied: available.filter(c => c.studied).length, studyTotal: available.length,
    passed: required.filter(c => c.passed).length, required: required.length,
    score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    attention: relevant.filter(c => c.attention).length,
    present: relevant.filter(c => c.present === true).length, marked: relevant.filter(c => c.present !== null).length }
}

/** Spreadsheet-safe CSV: names and authored titles must never be interpreted as formulas. */
export function journalCsv(rows: (string | number | null)[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const raw = String(value ?? '')
    const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw
    return `"${safe.replace(/"/g, '""')}"`
  }).join(';')).join('\r\n')
}

/**
 * Ячейки посещаемости одного занятия — для перехода из уведомления «Журнал не
 * заполнен»: та же колонка и те же ячейки, что открывает клик по названию урока,
 * но без фильтров журнала (курс, модуль, поиск).
 */
export function scheduleAttendanceCells(data: CourseJournalData, scheduleId: string, today: string): JournalCell[] {
  const event = data.events.find(e => e.id === scheduleId)
  if (!event) return []
  const index = buildJournalIndex(data)
  for (const course of [...data.courses.map(c => c.id), OUTSIDE_COURSES]) {
    const column = journalColumns(data, course).find(col => col.events.some(e => e.id === scheduleId))
    if (!column) continue
    return data.students.filter(s => eventReaches(event, s))
      .map(s => journalCell(data, index, s, column, today))
      .filter(cell => !!cell.event && !cell.cancelled)
  }
  return []
}
