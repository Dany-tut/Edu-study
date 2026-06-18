import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { HomeworkItem } from '../data/teacherMockData'

export type HardSub = {
  id: string
  lessonRef: string
  baseRef: string
  lessonTitle: string
  studentId: string
  studentName: string
  score: number
  comment: string
  reviewComment: string
  status: 'submitted' | 'returned' | 'completed'
  updatedAt: string
  attachments: { photos: string[]; board: string | null }
}

export type HwAssignment = HomeworkItem

export type HwSubmission = {
  id: string
  hwId: string
  studentId: string
  studentName: string
  submittedAt: string
  verdict: 'pending' | 'accepted' | 'returned'
  score: number
  comment: string
}

function mapRow(h: any): HwAssignment {
  const subs: { verdict: string }[] = h.homework_submissions ?? []
  const submittedCount = subs.length
  const reviewedCount = subs.filter(s => s.verdict !== 'pending').length
  return {
    id: h.id,
    groupId: h.group_id,
    groupName: h.groups?.name ?? '',
    icon: h.groups?.icon ?? '📚',
    color: h.groups?.color ?? 'var(--color-purple)',
    title: h.title,
    assignedAt: h.assigned_at
      ? new Date(h.assigned_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    dueDate: h.due_date
      ? new Date(h.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    submittedCount,
    totalCount: h.total_students ?? 0,
    reviewedCount,
    status: h.status ?? 'active',
    lessonId: h.lesson_id ?? null,
    hardTaskIds: Array.isArray(h.hard_task_ids) ? h.hard_task_ids : [],
    hardTotal: h.hard_total ?? (Array.isArray(h.hard_task_ids) ? h.hard_task_ids.length : 0),
    isIndividual: h.groups?.is_individual ?? false,
  }
}

export function useHomework() {
  const [homework, setHomework] = useState<HwAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('homework')
      .select('*, groups(name, icon, color, is_individual), homework_submissions(verdict)')
      .order('created_at', { ascending: false })
    if (data) setHomework(data.map(mapRow))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createHomework(hw: {
    groupId: string
    title: string
    dueDate: string
    taskIds: number[]
    totalStudents: number
    lessonId?: string | null
    hardTaskIds?: number[]
    hardTotal?: number
  }) {
    const { data, error } = await supabase.from('homework').insert({
      group_id: hw.groupId,
      title: hw.title,
      assigned_at: new Date().toISOString().slice(0, 10),
      due_date: hw.dueDate || null,
      status: 'active',
      task_ids: hw.taskIds,
      total_students: hw.totalStudents,
      lesson_id: hw.lessonId || null,
      hard_task_ids: hw.hardTaskIds ?? [],
      hard_total: hw.hardTotal ?? (hw.hardTaskIds?.length ?? 0),
    }).select().single()
    if (!error) await load()
    return { data, error }
  }

  async function updateHomework(id: string, hw: {
    groupId: string
    title: string
    dueDate: string
    taskIds: number[]
    totalStudents: number
    lessonId?: string | null
    hardTaskIds?: number[]
    hardTotal?: number
  }) {
    const { error } = await supabase.from('homework').update({
      group_id: hw.groupId,
      title: hw.title,
      due_date: hw.dueDate || null,
      task_ids: hw.taskIds,
      total_students: hw.totalStudents,
      lesson_id: hw.lessonId || null,
      hard_task_ids: hw.hardTaskIds ?? [],
      hard_total: hw.hardTotal ?? (hw.hardTaskIds?.length ?? 0),
    }).eq('id', id)
    if (!error) await load()
    return { error }
  }

  async function closeHomework(id: string) {
    await supabase.from('homework').update({ status: 'closed' }).eq('id', id)
    await load()
  }

  return { homework, loading, createHomework, updateHomework, closeHomework, reload: load }
}

let hardChannelSeq = 0

export function useHardSubmissions() {
  const [submissions, setSubmissions] = useState<HardSub[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    // Fetch hard submissions: new format (lesson_ref ends with '-hard')
    // OR old format (comment non-empty, no '-hard' suffix)
    const { data: rows } = await supabase
      .from('lesson_progress')
      .select('*, students(name)')
      .or('lesson_ref.like.%-hard,and(comment.neq.,lesson_ref.not.like.%-hard)')
      .in('status', ['submitted', 'returned', 'completed'])
      .order('updated_at', { ascending: false })

    if (!rows) { setLoading(false); return }

    // Derive base lesson refs (strip '-hard' suffix if present)
    const baseRefs = [...new Set(rows.map(r =>
      r.lesson_ref.endsWith('-hard') ? r.lesson_ref.slice(0, -5) : r.lesson_ref
    ))]

    // Fetch lesson titles
    const { data: lessons } = await supabase
      .from('lessons')
      .select('short_id, title')
      .in('short_id', baseRefs)
    const titleMap: Record<string, string> = Object.fromEntries(
      (lessons ?? []).map(l => [l.short_id, l.title])
    )

    setSubmissions(rows.map(r => {
      const base = r.lesson_ref.endsWith('-hard') ? r.lesson_ref.slice(0, -5) : r.lesson_ref
      return {
        id: r.id,
        lessonRef: r.lesson_ref,
        baseRef: base,
        lessonTitle: titleMap[base] ?? base,
        studentId: r.student_id,
        studentName: (r.students as { name: string } | null)?.name ?? '',
        score: r.score ?? 0,
        comment: r.comment ?? '',
        reviewComment: r.review_comment ?? '',
        status: r.status as HardSub['status'],
        updatedAt: r.updated_at ?? '',
        attachments: {
          photos: Array.isArray(r.attachments?.photos) ? r.attachments.photos : [],
          board: r.attachments?.board ?? null,
        },
      }
    }))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Unique channel name per hook instance — multiple components (e.g. the
    // homework list + the full-screen hard review) can mount this hook at once,
    // and Supabase throws if two subscribers share a channel name.
    const channelName = `hard-submissions-${hardChannelSeq++}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function reviewHard(id: string, verdict: 'completed' | 'returned', comment = '') {
    await supabase.from('lesson_progress').update({ status: verdict, review_comment: comment || null }).eq('id', id)
    await load()
  }

  return { submissions, loading, reviewHard, reload: load }
}

export function useHomeworkSubmissions(hwId: string | null) {
  const [submissions, setSubmissions] = useState<HwSubmission[]>([])

  useEffect(() => {
    if (!hwId) return
    supabase
      .from('homework_submissions')
      .select('*, students(name)')
      .eq('hw_id', hwId)
      .then(({ data }) => {
        if (data) setSubmissions(data.map((s: any) => ({
          id: s.id,
          hwId: s.hw_id,
          studentId: s.student_id,
          studentName: s.students?.name ?? '',
          submittedAt: s.submitted_at ?? '',
          verdict: s.verdict ?? 'pending',
          score: s.score ?? 0,
          comment: s.comment ?? '',
        })))
      })
  }, [hwId])

  return submissions
}
