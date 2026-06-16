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
  is_individual: boolean
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
        isIndividual: g.is_individual,
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
      is_individual: g.isIndividual ?? false,
    }).select().single()
    if (!error && data) await load()
    return { data, error }
  }

  async function addIndividualStudent(s: {
    name: string
    subject: Group['subject']
    icon: string
    level: string
    color: string
    colorSoft: string
    phone?: string
    telegramLink?: string
    parentContact?: string
    desiredScore?: number
    paymentAmount?: number
  }) {
    const { data: groupData, error: groupError } = await supabase.from('groups').insert({
      name: s.name,
      subject: s.subject,
      icon: s.icon,
      level: s.level,
      color: s.color,
      color_soft: s.colorSoft,
      start_date: null,
      total_lessons: 0,
      is_individual: true,
    }).select().single()
    if (groupError || !groupData) return { error: groupError, inviteToken: null }

    const { data: studentData, error: studentError } = await supabase.from('students').insert({
      group_id: groupData.id,
      name: s.name,
      phone: s.phone ?? '',
      telegram_link: s.telegramLink ?? '',
      parent_contact: s.parentContact ?? '',
      desired_score: s.desiredScore ?? 80,
      payment_amount: s.paymentAmount ?? 0,
    }).select('invite_token').single()

    await load()
    return { error: studentError, inviteToken: studentData?.invite_token as string | null }
  }

  async function deleteGroup(id: string) {
    await supabase.from('groups').delete().eq('id', id)
    await load()
  }

  return { groups, loading, addGroup, addIndividualStudent, deleteGroup, reload: load }
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
        lastVisit: s.last_visit
          ? new Date(s.last_visit).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '—',
        hwScore: s.hw_score ?? 0,
        testScore: s.test_score ?? 0,
        trialScore: s.trial_score ?? null,
        desiredScore: s.desired_score ?? 80,
        attendance: s.attendance ?? 0,
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

export type AttendanceRecord = {
  studentId: string
  lessonDate: string // 'YYYY-MM-DD'
  present: boolean
}

export function useAttendance(groupId: string | null) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!groupId) { setRecords([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('lesson_attendance')
      .select('student_id, lesson_date, present')
      .eq('group_id', groupId)
      .order('lesson_date')
    if (data) {
      setRecords(data.map((r: any) => ({
        studentId: r.student_id,
        lessonDate: r.lesson_date,
        present: r.present,
      })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [groupId])

  async function saveLesson(
    groupId: string,
    lessonDate: string,
    entries: { studentId: string; present: boolean }[]
  ) {
    const rows = entries.map(e => ({
      group_id: groupId,
      student_id: e.studentId,
      lesson_date: lessonDate,
      present: e.present,
    }))
    await supabase
      .from('lesson_attendance')
      .upsert(rows, { onConflict: 'student_id,lesson_date' })
    await load()
  }

  return { records, loading, saveLesson, reload: load }
}

export function useAllStudents() {
  const [students, setStudents] = useState<Student[]>([])
  useEffect(() => {
    supabase.from('students').select('*').order('name')
      .then(({ data }) => {
        if (data) setStudents(data.map((s: any) => ({
          id: s.id,
          groupId: s.group_id,
          name: s.name,
          phone: s.phone ?? '',
          telegramLink: s.telegram_link ?? '',
          parentContact: s.parent_contact ?? '',
          startedAt: s.started_at ?? '',
          lastVisit: s.last_visit ?? '',
          hwScore: s.hw_score ?? 0,
          testScore: s.test_score ?? 0,
          trialScore: s.trial_score ?? null,
          desiredScore: s.desired_score ?? 80,
          attendance: s.attendance ?? 0,
          comment: s.comment ?? '',
          paymentDue: s.payment_due ?? '',
          paymentAmount: s.payment_amount ?? 0,
          lastPayment: s.last_payment ?? '',
          debt: s.debt ?? 0,
          inviteToken: s.invite_token ?? null,
          email: s.email ?? '',
          tempPassword: s.temp_password ?? '',
        })))
      })
  }, [])
  return students
}
