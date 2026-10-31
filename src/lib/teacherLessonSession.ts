import { supabase } from './supabase'
import { getOwnerId } from './owner'
import type { SchedItem } from './teacherSchedule'
import type { AuthoredHomeworkTask } from '../data/lessonContent'

export type LessonAttendance = Record<string, boolean | null>
export type LessonHomeworkDraft = { title: string; tasks: AuthoredHomeworkTask[]; dueDate?: string }
export type TeacherLessonSession = {
  schedule_id: string; started_at: string | null; completed_at: string | null
  private_note: string; attendance: LessonAttendance; homework_draft: Partial<LessonHomeworkDraft>
  homework_id: string | null; updated_at: string; journalSkipped?: number
}
export type LessonPerson = { id: string; name: string }
export type LessonDetail = {
  session: TeacherLessonSession | null
  roster: LessonPerson[]
  note: string
  attendance: LessonAttendance
  draft: LessonHomeworkDraft
  materials: { description: string; youtube_url: string | null; materials: unknown[] }
  published: { id: string; title: string; due_date: string | null; total_students: number; status: string } | null
}

export async function loadTeacherLesson(item: SchedItem): Promise<LessonDetail> {
  const owner = await getOwnerId()
  if (!owner) throw new Error('Нужно войти в кабинет')
  const rosterQuery = supabase.from('students').select('id, name')
  const [state, people, source] = await Promise.all([
    supabase.from('teacher_lesson_sessions').select('*').eq('schedule_id', item.id).maybeSingle(),
    item.groupId ? rosterQuery.eq('group_id', item.groupId).order('name') : rosterQuery.eq('id', item.studentId ?? '').eq('created_by', owner),
    item.lessonId ? supabase.from('lessons').select('description, youtube_url, materials, homework').eq('id', item.lessonId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  if (state.error) throw state.error
  if (people.error) throw people.error
  if (source.error) throw source.error
  const session = state.data as TeacherLessonSession | null
  const roster = (people.data ?? []) as LessonPerson[]
  const attendance: LessonAttendance = Object.fromEntries(roster.map(p => [p.id, null]))
  // Existing desktop marks are a valid starting point, but another lesson on
  // the same date must never become this event's attendance accidentally.
  if (roster.length) {
    const { data, error } = await supabase.from('lesson_attendance').select('student_id, present, lesson_title')
      .eq('lesson_date', item.date).in('student_id', roster.map(p => p.id))
    if (error) throw error
    for (const r of data ?? []) if ((r.lesson_title ?? '') === item.title) attendance[r.student_id] = r.present
  }
  for (const person of roster) {
    if (session && Object.prototype.hasOwnProperty.call(session.attendance, person.id)) attendance[person.id] = session.attendance[person.id]
  }
  const hw = source.data?.homework ?? {}
  const tasks = (item.rec ? hw.recHwTasks : hw.hwTasks) ?? []
  const draft: LessonHomeworkDraft = {
    title: session?.homework_draft.title ?? (item.rec ? hw.recHwTitle : hw.hwTitle) ?? item.title,
    tasks: session?.homework_draft.tasks ?? (Array.isArray(tasks) ? tasks : []),
    dueDate: session?.homework_draft.dueDate,
  }
  let published: LessonDetail['published'] = null
  if (session?.homework_id || (item.lessonId && item.groupId)) {
    let q = supabase.from('homework').select('id, title, due_date, total_students, status').eq('created_by', owner)
    q = session?.homework_id ? q.eq('id', session.homework_id)
      : q.eq('lesson_id', item.lessonId!).eq('group_id', item.groupId!).eq('status', 'active')
    const result = await q.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (result.error) throw result.error
    published = result.data
  }
  return {
    session, roster, attendance, draft, note: session?.private_note ?? '', published,
    materials: { description: source.data?.description ?? '', youtube_url: source.data?.youtube_url ?? null, materials: source.data?.materials ?? [] },
  }
}

// Serialize writes per event: a slow blur-save cannot overtake «Завершить».
const writes = new Map<string, Promise<unknown>>()
function serialize<T>(id: string, task: () => Promise<T>): Promise<T> {
  const next = (writes.get(id) ?? Promise.resolve()).catch(() => {}).then(task)
  writes.set(id, next)
  void next.finally(() => { if (writes.get(id) === next) writes.delete(id) }).catch(() => {})
  return next
}

export function saveTeacherLesson(id: string, patch: {
  action?: 'save' | 'start' | 'complete'; note?: string; attendance?: LessonAttendance; draft?: LessonHomeworkDraft
}): Promise<TeacherLessonSession> {
  return serialize(id, async () => {
    const { data, error } = await supabase.rpc('teacher_lesson_save', {
      p_schedule: id, p_action: patch.action ?? 'save', p_note: patch.note ?? null,
      p_attendance: patch.attendance ?? null, p_draft: patch.draft ?? null,
    })
    if (error) throw error
    return data as TeacherLessonSession
  })
}

export function publishTeacherLesson(id: string, dueDate: string): Promise<{ homeworkId: string; alreadyPublished: boolean }> {
  return serialize(id, async () => {
    const { data, error } = await supabase.rpc('teacher_lesson_publish', { p_schedule: id, p_due: dueDate })
    if (error) throw error
    return data
  })
}

export function lessonSessionError(e: unknown): string {
  const message = typeof e === 'object' && e && 'message' in e ? String(e.message) : ''
  return /[а-яё]/i.test(message) ? message : 'Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.'
}
