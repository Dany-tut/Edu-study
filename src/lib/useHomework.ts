import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { HomeworkItem } from '../data/teacherMockData'

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
  const submittedCount = h.homework_submissions?.[0]?.count ?? 0
  return {
    id: h.id,
    groupId: h.group_id,
    groupName: h.groups?.name ?? '',
    icon: h.groups?.icon ?? '📚',
    color: h.groups?.color ?? '#9B6DFF',
    title: h.title,
    assignedAt: h.assigned_at
      ? new Date(h.assigned_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    dueDate: h.due_date
      ? new Date(h.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    submittedCount,
    totalCount: h.total_students ?? 0,
    reviewedCount: h.reviewed_count ?? 0,
    status: h.status ?? 'active',
  }
}

export function useHomework() {
  const [homework, setHomework] = useState<HwAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('homework')
      .select('*, groups(name, icon, color), homework_submissions(count)')
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
  }) {
    const { data, error } = await supabase.from('homework').insert({
      group_id: hw.groupId,
      title: hw.title,
      assigned_at: new Date().toISOString().slice(0, 10),
      due_date: hw.dueDate || null,
      status: 'active',
      task_ids: hw.taskIds,
      total_students: hw.totalStudents,
    }).select().single()
    if (!error) await load()
    return { data, error }
  }

  async function closeHomework(id: string) {
    await supabase.from('homework').update({ status: 'closed' }).eq('id', id)
    await load()
  }

  return { homework, loading, createHomework, closeHomework, reload: load }
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
