import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Group, Student } from '../data/teacherMockData'

type DbGroup = {
  id: string
  name: string
  subject: string
  icon: string
  level: string
  color: string
  color_soft: string
  start_date: string | null
  total_lessons: number
  students: { count: number }[]
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('groups')
      .select('*, students(count)')
      .order('created_at')
    if (data) {
      setGroups(data.map((g: DbGroup) => ({
        id: g.id,
        name: g.name,
        subject: g.subject as Group['subject'],
        icon: g.icon,
        level: g.level,
        color: g.color,
        colorSoft: g.color_soft,
        startDate: g.start_date ?? '',
        studentCount: g.students?.[0]?.count ?? 0,
        lessonsCompleted: 0,
        totalLessons: g.total_lessons,
      })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addGroup(g: Omit<Group, 'id' | 'studentCount' | 'lessonsCompleted'>) {
    const { data, error } = await supabase.from('groups').insert({
      name: g.name,
      subject: g.subject,
      icon: g.icon,
      level: g.level,
      color: g.color,
      color_soft: g.colorSoft,
      start_date: g.startDate || null,
      total_lessons: g.totalLessons,
    }).select().single()
    if (!error && data) await load()
    return { data, error }
  }

  async function deleteGroup(id: string) {
    await supabase.from('groups').delete().eq('id', id)
    await load()
  }

  return { groups, loading, addGroup, deleteGroup, reload: load }
}

export function useStudents(groupId: string | null) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!groupId) { setStudents([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at')
    if (data) {
      setStudents(data.map((s: any) => ({
        id: s.id,
        groupId: s.group_id,
        name: s.name,
        phone: s.phone ?? '',
        telegramLink: s.telegram_link ?? '',
        parentContact: s.parent_contact ?? '',
        startedAt: s.started_at ?? '',
        lastVisit: '',
        hwScore: 0,
        testScore: 0,
        trialScore: null,
        desiredScore: s.desired_score ?? 80,
        attendance: 0,
        comment: s.comment ?? '',
        paymentDue: s.payment_due ?? '',
        paymentAmount: s.payment_amount ?? 0,
        lastPayment: s.last_payment ?? '',
        debt: s.debt ?? 0,
        inviteToken: s.invite_token ?? null,
        email: s.email ?? '',
        tempPassword: s.temp_password ?? '',
      })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [groupId])

  async function addStudent(s: Partial<Student>) {
    const { data, error } = await supabase.from('students').insert({
      group_id: groupId,
      name: s.name ?? '',
      phone: s.phone ?? '',
      telegram_link: s.telegramLink ?? '',
      parent_contact: s.parentContact ?? '',
      started_at: s.startedAt || null,
      desired_score: s.desiredScore ?? 80,
      comment: s.comment ?? '',
      payment_due: s.paymentDue || null,
      payment_amount: s.paymentAmount ?? 0,
      debt: s.debt ?? 0,
      email: s.email ?? null,
      temp_password: s.tempPassword ?? null,
    }).select('invite_token').single()
    if (!error) await load()
    return { error, inviteToken: data?.invite_token as string | null }
  }

  async function deleteStudent(id: string) {
    await supabase.from('students').delete().eq('id', id)
    await load()
  }

  return { students, loading, addStudent, deleteStudent, reload: load }
}
