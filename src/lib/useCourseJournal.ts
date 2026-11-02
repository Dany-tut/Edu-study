import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { useAllStudentsSnapshot, useGroups } from './useGroups'
import type { CourseJournalData } from './courseJournal'
import { journalPages, journalBatches, journalRowsById } from './journalRequests'
import { journalPages as adaptiveJournalPages, journalParallelPages } from './journalPages'
import { createAuthDataChangeGuard } from './authDataChange'
import { journalPaintTiming } from './platformPerformance'
import { journalSnapshotResult } from './journalSnapshot'

// A bounded pool avoids serial round trips for large rosters and session IDs.
async function byIds<T>(table: string, columns: string, field: string, ids: string[], signal: AbortSignal): Promise<T[]> {
  const started = performance.now()
  if (table === 'lessons' && field === 'id') {
    const rows = await journalRowsById<T>(ids, signal, batch => supabase.from(table).select(columns)
      .in('id', batch).order('id').range(0, batch.length - 1).abortSignal(signal).retry(false))
    console.debug('[journal-read] ' + JSON.stringify({ table, rows: rows.length, ms: Math.round(performance.now() - started), exactIds: true }))
    return rows
  }
  const rows = await journalBatches(ids, batch => {
    const build = (offset: number, size: number) => supabase.from(table).select(columns)
      .in(field, batch).order(table === 'teacher_lesson_sessions' ? 'schedule_id' : 'id')
      .range(offset, offset + size - 1).abortSignal(signal).retry(false)
    // The invoker view returns task summaries, never rich lesson bodies.
    if (table === 'teacher_journal_lessons_v1') return journalParallelPages<T>(build, signal, 1000, 2)
    if (table === 'lesson_progress') return journalParallelPages<T>(build, signal, 1000, 2)
    return adaptiveJournalPages<T>(build, signal)
  })
  console.debug('[journal-read] ' + JSON.stringify({ table, rows: rows.length, ms: Math.round(performance.now() - started) }))
  return rows
}
const idsCount = (ids: string) => (JSON.parse(ids) as string[]).length

export function useCourseJournal(completeWorkList = false, enabled = true) {
  const { groups, loading: groupsLoading } = useGroups()
  const { value: students, loading: studentsLoading } = useAllStudentsSnapshot()
  const rosterReady = !groupsLoading && !studentsLoading
  const lastLoaded = useRef(0)
  const loadedScope = useRef('')
  const traceStart = useRef(0)
  const traceReady = useRef(0)
  const [data, setData] = useState<CourseJournalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick(n => n + 1), [])
  const studentIds = JSON.stringify(students.map(s => s.id).sort())
  const groupIds = JSON.stringify(groups.map(g => g.id).sort())
  useEffect(() => {
    if (!enabled) return
    const loadKey = JSON.stringify([studentIds, groupIds, completeWorkList, tick])
    if (data && loadedScope.current === loadKey && Date.now() - lastLoaded.current < 30_000) {
      setLoading(false)
      return
    }
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
    traceStart.current = loadStarted
    setLoading(true); setError(null)
    async function load() {
      const owner = await getOwnerId()
      if (!owner && import.meta.env.DEV) {
        const { journalDemo } = await import('../data/courseJournalDemo')
        return journalDemo()
      }
      if (!owner) throw new Error('Нужно войти в кабинет преподавателя')
      // The compact snapshot keeps complete grades/answers/attempts, but sends
      // task-source presence once instead of thousands of repeated task types.
      // Required failures never become a partial journal. Only a missing RPC
      // falls back to the complete paginated reader during migration rollout.
      const snapshot = journalSnapshotResult(await supabase.rpc('teacher_journal_snapshot_v3', {
        p_owner: owner, p_complete: completeWorkList,
      }).abortSignal(signal).retry(false))
      if (snapshot) return snapshot
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
      const eventsAndMarks = (scope ? journalPages<CourseJournalData['events'][number]>(offset => supabase.from('schedule_lessons')
          .select('id, lesson_id, node_type, group_id, student_id, date, time_start, time_end, lesson_title, subject, status')
          .or(scope).order('id').range(offset, offset + 499).abortSignal(signal).retry(false), signal) : Promise.resolve([])).then(async events => {
        const marks = await byIds<CourseJournalData['marks'][number]>('teacher_lesson_sessions', 'schedule_id, attendance', 'schedule_id', events.map(e => e.id), signal)
          .catch(error => { if (signal.aborted) throw error; warnings.push('Не удалось загрузить отметки занятий. Посещаемость может быть неполной.'); return [] })
        return { events, marks }
      })
      const [lessons, modules, work, { events, marks }, assignments, legacy, attempts] = await Promise.all([
        byIds<CourseJournalData['lessons'][number]>('teacher_journal_lessons_v1', 'id, short_id, course_id, module_id, title, kind, position, lesson_number, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual, delivery_mode, youtube_url, hwTask:hw_tasks, recTask:rec_tasks, hwDate:hw_date, recHwDate:rec_hw_date' + (completeWorkList ? ',extraHw:extra_hw' : ''), 'course_id', courseIds, signal),
        byIds<CourseJournalData['modules'][number]>('course_modules', 'id, course_id, label, position', 'course_id', courseIds, signal),
        byIds<CourseJournalData['work'][number]>('lesson_progress', 'id, student_id, lesson_ref, status, score, attachments, updated_at, review_comment', 'student_id', ids, signal),
        eventsAndMarks,
        journalPages<CourseJournalData['assignments'][number]>(offset => supabase.from('homework')
          .select('id, lesson_id, group_id, title, due_date, status, basicTask:basic_tasks->0' + (completeWorkList ? ',assignedAt:assigned_at,basicTasks:basic_tasks' : '')).eq('created_by', owner).order('id').range(offset, offset + 499).abortSignal(signal).retry(false), signal),
        byIds<CourseJournalData['legacy'][number]>('lesson_attendance', 'id, student_id, lesson_date, lesson_title, present, grade', 'student_id', ids, signal),
        byIds<CourseJournalData['attempts'][number]>('homework_attempts', 'id, student_id, lesson_ref, number, status, score, passing_score, submitted_at, review_comment', 'student_id', ids, signal)
          .catch(error => { if (signal.aborted) throw error; warnings.push('История попыток недоступна. Показаны текущие результаты работ.'); return [] }),
      ])
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
    void load().then(next => { if (active) { loadedScope.current = loadKey; lastLoaded.current = Date.now(); traceReady.current = performance.now(); console.debug('[journal-ready] ' + JSON.stringify({ ms: Math.round(performance.now() - loadStarted), lessons: next.lessons.length, work: next.work.length, modules: next.modules.length, assignments: next.assignments.length, attempts: next.attempts.length, events: next.events.length, marks: next.marks.length, students: idsCount(studentIds), groups: idsCount(groupIds) })); setData(next) } }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Не удалось загрузить журнал')
    }).finally(() => { clearTimeout(timeout); controller.abort(); if (active) setLoading(false) })
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [studentIds, groupIds, tick, completeWorkList, rosterReady, enabled])
  useEffect(() => {
    if (!data || !enabled) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => journalPaintTiming(traceStart.current, traceReady.current))
    })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [data, enabled])
  useEffect(() => {
    const authDataChanged = createAuthDataChangeGuard()
    const focus = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoaded.current > 30_000) reload() }
    window.addEventListener('focus', focus)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (authDataChanged(event, session) && event !== 'INITIAL_SESSION') {
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
