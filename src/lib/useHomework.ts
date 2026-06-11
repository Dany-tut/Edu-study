import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type HwAssignment = {
  id: string
  groupId: string
  groupName: string
  title: string
  dueDate: string
  status: 'active' | 'closed'
  submittedCount: number
  totalCount: number
  createdAt: string
}

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

export function useHomework() {
  const [homework, setHomework] = useState<HwAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('homework')
      .select('*, groups(name), homework_submissions(count)')
      .order('created_at', { ascending: false })
    if (data) {
      setHomework(data.map((h: any) => ({
        id: h.id,
        groupId: h.group_id,
        groupName: h.groups?.name ?? '',
        title: h.title,
        dueDate: h.due_date ?? '',
        status: h.status,
        submittedCount: h.homework_submissions?.[0]?.count ?? 0,
        totalCount: h.total_students ?? 0,
        createdAt: h.created_at,
      })))
    }
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
