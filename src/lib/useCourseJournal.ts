import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { useAllStudentsSnapshot, useGroups } from './useGroups'
import type { CourseJournalData, CourseJournalLesson } from './courseJournal'
import { journalLessonDetailIds } from './journalLessonScope'
import { journalPages, journalBatches } from './journalRequests'
import { journalPages as adaptiveJournalPages, journalParallelPages } from './journalPages'
import { createAuthDataChangeGuard } from './authDataChange'

// A bounded pool avoids serial round trips for large rosters and session IDs.
async function byIds<T>(table: string, columns: string, field: string, ids: string[], signal: AbortSignal, lessonPageSize = 50): Promise<T[]> {
  const started = performance.now()
  const rows = await journalBatches(ids, batch => {
    const build = (offset: number, size: number) => supabase.from(table).select(columns)
      .in(field, batch).order(table === 'teacher_lesson_sessions' ? 'schedule_id' : 'id')
      .range(offset, offset + size - 1).abortSignal(signal).retry(false)
    // Rich homework JSON makes small lesson pages necessary. Read those pages
    // concurrently instead of paying one network round trip for every 50 rows.
    if (table === 'lessons') return journalParallelPages<T>(build, signal, lessonPageSize, 4)
    if (table === 'lesson_progress') return journalParallelPages<T>(build, signal, 500, 2)
    return adaptiveJournalPages<T>(build, signal)
  })
  console.debug('[journal-read] ' + JSON.stringify({ table, rows: rows.length, ms: Math.round(performance.now() - started) }))
  return rows
}
export function useCourseJournal(completeWorkList = false) {
  const { groups, loading: groupsLoading } = useGroups()
  const { value: students, loading: studentsLoading } = useAllStudentsSnapshot()
  const rosterReady = !groupsLoading && !studentsLoading
  const lastLoaded = useRef(0)
  const [data, setData] = useState<CourseJournalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick(n => n + 1), [])
  const studentIds = JSON.stringify(students.map(s => s.id).sort())
  const groupIds = JSON.stringify(groups.map(g => g.id).sort())
  useEffect(() => {
    if (!rosterReady) {
      const timeout = setTimeout(() => {
        setError('Не удалось дождаться списка учеников. Проверьте соединение и нажмите «Обновить».')
        setLoading(false)
      }, 20_000)
      return () => clearTimeout(timeout)
    }
    let active = true
    const controller = new AbortController()
    const { signal } = controller
    lastLoaded.current = Date.now()
    const loadStarted = performance.now()
    setLoading(true); setError(null)
    async function load() {
      const owner = await getOwnerId()
      if (!owner && import.meta.env.DEV) {
        const { journalDemo } = await import('../data/courseJournalDemo')
        return journalDemo()
      }
      if (!owner) throw new Error('Нужно войти в кабинет преподавателя')
      const [owned, shares] = await Promise.all([
        journalPages<CourseJournalData['courses'][number]>(offset => supabase.from('courses')
        .select('id, short_id, title, subject, kind, group_ids, student_ids')
        .eq('created_by', owner).order('id').range(offset, offset + 499).abortSignal(signal).retry(false), signal),
        journalPages<{ course_id: string }>(offset => supabase.from('course_shares')
        .select('course_id').eq('teacher_id', owner).order('course_id').range(offset, offset + 499).abortSignal(signal).retry(false), signal),
      ])
      const sharedIds = shares.map(s => s.course_id).filter(id => !owned.some(c => c.id === id))
      const courses = [...owned, ...await byIds<CourseJournalData['courses'][number]>('courses',
        'id, short_id, title, subject, kind, group_ids, student_ids', 'id', sharedIds, signal)]
      const ids: string[] = JSON.parse(studentIds)
      const gids: string[] = JSON.parse(groupIds)
      const scope = [gids.length ? `group_id.in.(${gids.join(',')})` : '', ids.length ? `student_id.in.(${ids.join(',')})` : ''].filter(Boolean).join(',')
      const courseIds = courses.map(c => c.id)
      const warnings: string[] = []
      const [lessonMetadata, modules, work, events, assignments, legacy, attempts] = await Promise.all([
        byIds<Omit<CourseJournalLesson, 'hwTask' | 'recTask' | 'extraHw'>>('lessons', 'id, short_id, course_id, module_id, title, kind, position, lesson_number, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual, delivery_mode, youtube_url, hwDate:homework->>hwDate, recHwDate:homework->>recHwDate', 'course_id', courseIds, signal, 250),
        byIds<CourseJournalData['modules'][number]>('course_modules', 'id, course_id, label, position', 'course_id', courseIds, signal),
        byIds<CourseJournalData['work'][number]>('lesson_progress', 'id, student_id, lesson_ref, status, score, attachments, updated_at, review_comment', 'student_id', ids, signal),
        scope ? journalPages<CourseJournalData['events'][number]>(offset => supabase.from('schedule_lessons')
          .select('id, lesson_id, node_type, group_id, student_id, date, time_start, time_end, lesson_title, subject, status')
          .or(scope).order('id').range(offset, offset + 499).abortSignal(signal).retry(false), signal) : [],
        journalPages<CourseJournalData['assignments'][number]>(offset => supabase.from('homework')
          .select('id, lesson_id, group_id, title, due_date, status, basicTask:basic_tasks->0' + (completeWorkList ? ',assignedAt:assigned_at,basicTasks:basic_tasks' : '')).eq('created_by', owner).order('id').range(offset, offset + 499).abortSignal(signal).retry(false), signal),
        byIds<CourseJournalData['legacy'][number]>('lesson_attendance', 'id, student_id, lesson_date, lesson_title, present, grade', 'student_id', ids, signal),
        byIds<CourseJournalData['attempts'][number]>('homework_attempts', 'id, student_id, lesson_ref, number, status, score, passing_score, submitted_at, review_comment', 'student_id', ids, signal)
          .catch(error => { if (signal.aborted) throw error; warnings.push('История попыток недоступна. Показаны текущие результаты работ.'); return [] }),
      ])
      const detailIds = journalLessonDetailIds({ courses, lessons: lessonMetadata,
        studentIds: ids, groupIds: gids, work, attempts, events, assignments })
      const [details, marks] = await Promise.all([
        byIds<Pick<CourseJournalLesson, 'id' | 'hwTask' | 'recTask' | 'extraHw'>>('lessons',
          'id, hwTask:homework->hwTasks, recTask:homework->recHwTasks' + (completeWorkList ? ',extraHw:homework->extraHw' : ''),
          'id', detailIds, signal),
        byIds<CourseJournalData['marks'][number]>('teacher_lesson_sessions', 'schedule_id, attendance', 'schedule_id', events.map(e => e.id), signal)
          .catch(error => { if (signal.aborted) throw error; warnings.push('Не удалось загрузить отметки занятий. Посещаемость может быть неполной.'); return [] }),
      ])
      const detailById = new Map(details.map(lesson => [lesson.id, lesson]))
      if (detailIds.some(id => !detailById.has(id))) throw new Error('Не удалось загрузить журнал')
      const lessons: CourseJournalLesson[] = lessonMetadata.map(lesson => ({
        ...lesson, hwTask: null, recTask: null, ...detailById.get(lesson.id),
      }))
      return { courses, lessons, modules, work, events, assignments, legacy, marks, attempts, warnings, demo: false, students: [], groups: [] } as CourseJournalData
    }
    const timeout = setTimeout(() => {
      controller.abort()
      if (active) {
        active = false
        setError('Журнал загружается дольше обычного. Проверьте соединение и нажмите «Обновить».')
        setLoading(false)
      }
    }, 20_000)
    void load().then(next => { if (active) { lastLoaded.current = Date.now(); console.debug('[journal-ready] ' + JSON.stringify({ ms: Math.round(performance.now() - loadStarted), lessons: next.lessons.length, work: next.work.length })); setData(next) } }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Не удалось загрузить журнал')
    }).finally(() => { clearTimeout(timeout); controller.abort(); if (active) setLoading(false) })
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [studentIds, groupIds, tick, completeWorkList, rosterReady])
  useEffect(() => {
    const authDataChanged = createAuthDataChangeGuard()
    const focus = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoaded.current > 30_000) reload() }
    window.addEventListener('focus', focus)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (authDataChanged(event, session) && event !== 'INITIAL_SESSION') {
        setData(null)
        reload()
      }
    })
    return () => { window.removeEventListener('focus', focus); subscription.unsubscribe() }
  }, [reload])
  const resolved = useMemo(() => data && !data.demo ? { ...data, students, groups } : data, [data, students, groups])
  return { data: resolved, loading, error, reload, setData }
}
