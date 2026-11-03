import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { useAllStudents, useGroups } from './useGroups'
import type { CourseJournalData } from './courseJournal'
import { journalPages } from './journalPages'

// Explicit pagination avoids PostgREST's default row cap. All calls below are
// constrained to the owner, their students, or their course/event identifiers.
export function useCourseJournal(completeWorkList = false) {
  const { groups } = useGroups()
  const students = useAllStudents()
  const [data, setData] = useState<CourseJournalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick(n => n + 1), [])
  const studentIds = JSON.stringify(students.map(s => s.id).sort())
  const groupIds = JSON.stringify(groups.map(g => g.id).sort())
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const deadline = setTimeout(() => {
      controller.abort()
      if (active) {
        setError('Загрузка работ заняла слишком много времени. Попробуйте ещё раз.')
        setLoading(false)
      }
    }, 45_000)
    const pages = <T,>(build: (offset: number, size: number) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>, size = 500) =>
      journalPages<T>(build, controller.signal, size)
    async function byIds<T>(table: string, columns: string, field: string, ids: string[]): Promise<T[]> {
      const all: T[] = []
      for (let start = 0; start < ids.length; start += 100) {
        all.push(...await pages<T>((offset, size) => supabase.from(table).select(columns)
          .in(field, ids.slice(start, start + 100)).order(table === 'teacher_lesson_sessions' ? 'schedule_id' : 'id')
          .range(offset, offset + size - 1).abortSignal(controller.signal).retry(false), table === 'lessons' ? 50 : 500))
      }
      return all
    }
    setLoading(true); setError(null)
    async function load() {
      const owner = await getOwnerId()
      if (!owner && import.meta.env.DEV) {
        const { journalDemo } = await import('../data/courseJournalDemo')
        return journalDemo()
      }
      if (!owner) throw new Error('Нужно войти в кабинет преподавателя')
      const owned = await pages<CourseJournalData['courses'][number]>((offset, size) => supabase.from('courses')
        .select('id, short_id, title, subject, kind, group_ids, student_ids')
        .eq('created_by', owner).order('id').range(offset, offset + size - 1).abortSignal(controller.signal).retry(false))
      const shares = await pages<{ course_id: string }>((offset, size) => supabase.from('course_shares')
        .select('course_id').eq('teacher_id', owner).order('course_id').range(offset, offset + size - 1).abortSignal(controller.signal).retry(false))
      const sharedIds = shares.map(s => s.course_id).filter(id => !owned.some(c => c.id === id))
      const courses = [...owned, ...await byIds<CourseJournalData['courses'][number]>('courses',
        'id, short_id, title, subject, kind, group_ids, student_ids', 'id', sharedIds)]
      const ids: string[] = JSON.parse(studentIds)
      const gids: string[] = JSON.parse(groupIds)
      const scope = [gids.length ? `group_id.in.(${gids.join(',')})` : '', ids.length ? `student_id.in.(${ids.join(',')})` : ''].filter(Boolean).join(',')
      const courseIds = courses.map(c => c.id)
      const [lessons, modules, work, events, assignments, legacy] = await Promise.all([
        byIds<CourseJournalData['lessons'][number]>('lessons', 'id, short_id, course_id, module_id, title, kind, position, lesson_number, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual, delivery_mode, youtube_url, hwTask:homework->hwTasks, recTask:homework->recHwTasks, hwDate:homework->>hwDate, recHwDate:homework->>recHwDate' + (completeWorkList ? ',extraHw:homework->extraHw' : ''), 'course_id', courseIds),
        byIds<CourseJournalData['modules'][number]>('course_modules', 'id, course_id, label, position', 'course_id', courseIds),
        byIds<CourseJournalData['work'][number]>('lesson_progress', 'id, student_id, lesson_ref, status, score, attachments, updated_at, review_comment', 'student_id', ids),
        scope ? pages<CourseJournalData['events'][number]>((offset, size) => supabase.from('schedule_lessons')
          .select('id, lesson_id, node_type, group_id, student_id, date, time_start, time_end, lesson_title, subject, status')
          .or(scope).order('id').range(offset, offset + size - 1).abortSignal(controller.signal).retry(false)) : [],
        pages<CourseJournalData['assignments'][number]>((offset, size) => supabase.from('homework')
          .select('id, lesson_id, group_id, title, due_date, status, basicTask:basic_tasks->0' + (completeWorkList ? ',assignedAt:assigned_at,basicTasks:basic_tasks' : '')).eq('created_by', owner).order('id').range(offset, offset + size - 1).abortSignal(controller.signal).retry(false)),
        byIds<CourseJournalData['legacy'][number]>('lesson_attendance', 'id, student_id, lesson_date, lesson_title, present, grade', 'student_id', ids),
      ])
      const warnings: string[] = []
      const [marks, attempts] = await Promise.all([
        byIds<CourseJournalData['marks'][number]>('teacher_lesson_sessions', 'schedule_id, attendance', 'schedule_id', events.map(e => e.id))
          .catch(() => { warnings.push('Не удалось загрузить отметки занятий. Посещаемость может быть неполной.'); return [] }),
        byIds<CourseJournalData['attempts'][number]>('homework_attempts', 'id, student_id, lesson_ref, number, status, score, passing_score, submitted_at, review_comment', 'student_id', ids)
          .catch(() => { warnings.push('История попыток недоступна. Показаны текущие результаты работ.'); return [] }),
      ])
      return { courses, lessons, modules, work, events, assignments, legacy, marks, attempts, warnings, demo: false, students: [], groups: [] } as CourseJournalData
    }
    void load().then(next => { if (active && !controller.signal.aborted) setData(next) }).catch(e => {
      if (active && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить журнал')
      controller.abort()
    }).finally(() => { clearTimeout(deadline); if (active) setLoading(false) })
    return () => { active = false; clearTimeout(deadline); controller.abort() }
  }, [studentIds, groupIds, tick, completeWorkList])
  useEffect(() => {
    let sessionUser: string | null | undefined
    const focus = () => { if (document.visibilityState === 'visible') reload() }
    window.addEventListener('focus', focus)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id ?? null
      const changed = sessionUser !== undefined && sessionUser !== nextUser
      sessionUser = nextUser
      // SIGNED_IN can repeat for the same session. Refocusing must not unmount
      // the open homework card or discard its unsaved teacher comment.
      if (changed || event === 'SIGNED_OUT') {
        setData(null)
        reload()
      } else if (event === 'USER_UPDATED') {
        reload()
      }
    })
    return () => { window.removeEventListener('focus', focus); subscription.unsubscribe() }
  }, [reload])
  const resolved = useMemo(() => data && !data.demo ? { ...data, students, groups } : data, [data, students, groups])
  return { data: resolved, loading, error, reload, setData }
}
