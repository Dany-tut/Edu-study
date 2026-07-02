import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
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
    const uid = await getOwnerId()
    const { data } = await supabase
      .from('groups')
      .select('*, students(count)')
      .eq('created_by', uid)
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
      created_by: await getOwnerId(),
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
      created_by: await getOwnerId(),
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

  async function addStudentToGroup(targetGroupId: string, s: Partial<Student>) {
    const { data, error } = await supabase.from('students').insert({
      group_id: targetGroupId,
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
    }).select('id, invite_token').single()
    if (!error && data?.id) {
      await supabase.rpc('seed_student_progress', {
        p_student_id: data.id,
        p_group_id: targetGroupId,
      })
    }
    await load()
    return { error, inviteToken: data?.invite_token as string | null }
  }

  async function deleteGroup(id: string) {
    await supabase.from('groups').delete().eq('id', id)
    await load()
  }

  return { groups, loading, addGroup, addIndividualStudent, addStudentToGroup, deleteGroup, reload: load }
}

// Resolve the individual (1:1) group a single-student homework should attach to.
// If the student already lives in an individual group, reuse it. Otherwise
// auto-create a personal individual group named after the student (the student
// stays enrolled in their original group — this group is just the 1:1 container).
export async function resolveIndividualGroup(studentId: string): Promise<string | null> {
  const { data: student } = await supabase
    .from('students')
    .select('id, name, group_id, groups(id, is_individual, subject, icon, level, color, color_soft)')
    .eq('id', studentId)
    .single()
  if (!student) return null

  const home = (student as any).groups
  if (home?.is_individual) return home.id

  // Already created a personal 1:1 group for this student before? Reuse it.
  const { data: existing } = await supabase
    .from('groups')
    .select('id')
    .eq('is_individual', true)
    .eq('name', student.name)
    .eq('created_by', await getOwnerId())
    .limit(1)
  if (existing && existing.length > 0) return existing[0].id

  const { data: created, error } = await supabase.from('groups').insert({
    name: student.name,
    subject: home?.subject ?? 'Химия',
    icon: home?.icon ?? '📚',
    level: home?.level ?? '',
    color: home?.color ?? '#9B6DFF',
    color_soft: home?.color_soft ?? '#E4D9FF',
    start_date: null,
    total_lessons: 0,
    is_individual: true,
    created_by: await getOwnerId(),
  }).select('id').single()
  if (error || !created) return null
  return created.id
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
        authUserId: s.auth_user_id ?? null,
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

  // Patch arbitrary student fields (camelCase keys → snake_case columns).
  // Optimistically updates local state so the panel reflects the edit instantly.
  async function updateStudent(id: string, patch: Partial<Student>) {
    const colMap: Record<string, string> = {
      name: 'name', phone: 'phone', telegramLink: 'telegram_link', parentContact: 'parent_contact',
      desiredScore: 'desired_score', comment: 'comment', paymentDue: 'payment_due',
      paymentAmount: 'payment_amount', lastPayment: 'last_payment', debt: 'debt',
      tempPassword: 'temp_password',
    }
    const row: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (colMap[k]) row[colMap[k]] = v
    }
    if (Object.keys(row).length === 0) return { error: null }
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    const { error } = await supabase.from('students').update(row).eq('id', id)
    return { error }
  }

  return { students, loading, addStudent, deleteStudent, updateStudent, reload: load }
}

export type AttendanceRecord = {
  studentId: string
  lessonDate: string // 'YYYY-MM-DD'
  present: boolean
  grade: number | null
  lessonTitle: string
}

export type GroupLesson = {
  id: string
  date: string // 'YYYY-MM-DD'
  title: string
  lessonNumber: number
  timeStart: string
  groupId: string | null   // lesson scoped to a whole group
  studentId: string | null // …or to a single student (group_id null)
  scopeName: string        // group/student display name for the picker label
}

// Lessons for the grading modal. When a group is selected, list lessons that
// reach it (group_id OR one of its students). When no group is selected
// ("Все группы"), list every scheduled lesson so the teacher can still pick one
// — the chosen lesson then determines whose grades are recorded.
export function useGroupLessons(groupId: string | null) {
  const [lessons, setLessons] = useState<GroupLesson[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      let query = supabase
        .from('schedule_lessons')
        .select('id, date, lesson_title, lesson_number, time_start, group_id, student_id, groups(name), students(name)')

      if (groupId) {
        // Student-scoped lessons reach the group through its members too.
        const { data: studs } = await supabase
          .from('students')
          .select('id')
          .eq('group_id', groupId)
        const studentIds = (studs ?? []).map((s: any) => s.id)
        const scope = [`group_id.eq.${groupId}`]
        if (studentIds.length) scope.push(`student_id.in.(${studentIds.join(',')})`)
        query = query.or(scope.join(','))
      }

      const { data } = await query
        .order('date', { ascending: false })
        .order('time_start', { ascending: false })

      if (cancelled || !data) return
      // Dedup lessons that reach the group via both scopes at once.
      const seen = new Set<string>()
      const rows: GroupLesson[] = []
      for (const r of data as any[]) {
        const key = `${r.date}|${r.time_start}|${r.lesson_title}|${r.lesson_number}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          id: r.id, date: r.date, title: r.lesson_title, lessonNumber: r.lesson_number, timeStart: r.time_start,
          groupId: r.group_id, studentId: r.student_id,
          scopeName: r.groups?.name ?? r.students?.name ?? '',
        })
      }
      setLessons(rows)
    })()

    return () => { cancelled = true }
  }, [groupId])

  return lessons
}

export type RosterStudent = { id: string; name: string }

// The students a given lesson should be graded for: a group-scoped lesson →
// the whole group; a student-scoped lesson → that one student.
export function useLessonRoster(lesson: GroupLesson | null) {
  const [roster, setRoster] = useState<RosterStudent[]>([])

  useEffect(() => {
    let cancelled = false
    if (!lesson) { setRoster([]); return }

    ;(async () => {
      if (lesson.groupId) {
        const { data } = await supabase
          .from('students').select('id, name').eq('group_id', lesson.groupId).order('created_at')
        if (!cancelled) setRoster((data ?? []).map((s: any) => ({ id: s.id, name: s.name })))
      } else if (lesson.studentId) {
        const { data } = await supabase
          .from('students').select('id, name').eq('id', lesson.studentId).single()
        if (!cancelled) setRoster(data ? [{ id: data.id, name: data.name }] : [])
      } else {
        setRoster([])
      }
    })()

    return () => { cancelled = true }
  }, [lesson?.id])

  return roster
}

export function useAttendance(groupId: string | null) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!groupId) { setRecords([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('lesson_attendance')
      .select('student_id, lesson_date, present, grade, lesson_title')
      .eq('group_id', groupId)
      .order('lesson_date')
    if (data) {
      setRecords(data.map((r: any) => ({
        studentId: r.student_id,
        lessonDate: r.lesson_date,
        present: r.present,
        grade: r.grade ?? null,
        lessonTitle: r.lesson_title ?? '',
      })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [groupId])

  async function saveLesson(
    groupId: string | null,
    lessonDate: string,
    entries: { studentId: string; present: boolean; grade?: number | null }[],
    lessonTitle = ''
  ) {
    // A personal lesson given to a group member (student-scoped schedule row,
    // groupId null) still belongs to that student's GROUP journal — just as a
    // single personal entry, not a whole-group one. So resolve each student's own
    // group and file the row under it. Truly group-less students keep group_id
    // null (the column is nullable). The entry is "personal" implicitly: only the
    // graded student gets a row for that date, the rest of the group is untouched.
    const groupByStudent = new Map<string, string>()
    if (!groupId) {
      const ids = [...new Set(entries.map(e => e.studentId))]
      const { data: studs } = await supabase.from('students').select('id, group_id').in('id', ids)
      for (const s of studs ?? []) if (s.group_id) groupByStudent.set(s.id, s.group_id)
    }
    const rows = entries.map(e => ({
      group_id: groupId ?? groupByStudent.get(e.studentId) ?? null,
      student_id: e.studentId,
      lesson_date: lessonDate,
      present: e.present,
      // Absent students keep no grade; present students store whatever was set.
      grade: e.present ? (e.grade ?? null) : null,
      lesson_title: lessonTitle,
    }))
    const { error: upsertError } = await supabase
      .from('lesson_attendance')
      .upsert(rows, { onConflict: 'student_id,lesson_date' })
    if (upsertError) {
      console.error('saveLesson: lesson_attendance upsert failed', upsertError, rows)
      throw upsertError
    }

    // Single source of truth: recompute each affected student's attendance %
    // straight from lesson_attendance and write it back to students.attendance,
    // so the roster / Оценки tab stop reading a stale denormalised snapshot.
    const affected = [...new Set(entries.map(e => e.studentId))]
    if (affected.length) {
      const { data: att } = await supabase
        .from('lesson_attendance')
        .select('student_id, present')
        .in('student_id', affected)
      const tally = new Map<string, { present: number; total: number }>()
      for (const r of att ?? []) {
        const cur = tally.get(r.student_id) ?? { present: 0, total: 0 }
        cur.total++; if (r.present) cur.present++
        tally.set(r.student_id, cur)
      }
      await Promise.all([...tally].map(([id, { present, total }]) =>
        supabase.from('students').update({ attendance: total ? Math.round((present / total) * 100) : 0 }).eq('id', id)
      ))
    }

    await load()
  }

  return { records, loading, saveLesson, reload: load }
}

export type PendingJournal = {
  scheduleId: string
  date: string        // 'YYYY-MM-DD'
  title: string
  timeStart: string
  groupId: string | null
  studentId: string | null
  scopeName: string
}

// "Журнал не заполнен" — a scheduled lesson whose start time + buffer has passed
// but has no lesson_attendance rows yet. Pass a groupId to scope, or null for all
// groups (drives the nav badge). Lessons become eligible HOURS_AFTER hours after
// their start, so the teacher is nudged a bit after the lesson, not during it.
const JOURNAL_GRACE_HOURS = 2
export function useJournalPending(groupId: string | null, reloadKey = 0) {
  const [pending, setPending] = useState<PendingJournal[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const now = Date.now()
      const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local
      const fromStr = new Date(now - 30 * 86_400_000).toLocaleDateString('en-CA')

      let query = supabase
        .from('schedule_lessons')
        .select('id, date, lesson_title, time_start, group_id, student_id, groups(name), students(name, group_id)')
        .gte('date', fromStr)
        .lte('date', todayStr)

      if (groupId) {
        const { data: studs } = await supabase.from('students').select('id').eq('group_id', groupId)
        const studentIds = (studs ?? []).map((s: any) => s.id)
        const scope = [`group_id.eq.${groupId}`]
        if (studentIds.length) scope.push(`student_id.in.(${studentIds.join(',')})`)
        query = query.or(scope.join(','))
      }

      const { data } = await query.order('date', { ascending: false }).order('time_start', { ascending: false })
      if (cancelled || !data) return

      const { data: att } = await supabase
        .from('lesson_attendance')
        .select('group_id, student_id, lesson_date')
        .gte('lesson_date', fromStr)
      const filledByGroupDate = new Set((att ?? []).map((a: any) => `${a.group_id}|${a.lesson_date}`))
      const filledByStudentDate = new Set((att ?? []).map((a: any) => `${a.student_id}|${a.lesson_date}`))

      const seen = new Set<string>()
      const out: PendingJournal[] = []
      for (const r of data as any[]) {
        // Grace gate: only surface once the lesson has had time to finish.
        const start = new Date(`${r.date}T${(r.time_start || '00:00')}:00`).getTime()
        if (Number.isFinite(start) && start + JOURNAL_GRACE_HOURS * 3_600_000 > now) continue

        const gid: string | null = r.group_id ?? r.students?.group_id ?? null
        const filled = r.group_id
          ? filledByGroupDate.has(`${r.group_id}|${r.date}`)
          : r.student_id
            ? filledByStudentDate.has(`${r.student_id}|${r.date}`)
            : false
        if (filled) continue

        // One entry per lesson event (group+date or student+date).
        const key = `${r.group_id ?? r.student_id}|${r.date}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          scheduleId: r.id, date: r.date, title: r.lesson_title ?? '', timeStart: r.time_start ?? '',
          groupId: gid, studentId: r.student_id,
          scopeName: r.groups?.name ?? r.students?.name ?? '',
        })
      }
      setPending(out)
    })()
    return () => { cancelled = true }
  }, [groupId, reloadKey])

  return pending
}

export function useAllStudents() {
  const [students, setStudents] = useState<Student[]>([])
  useEffect(() => {
    ;(async () => {
    const uid = await getOwnerId()
    supabase.from('students').select('*, groups!inner(created_by)').eq('groups.created_by', uid).order('name')
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
          lessonBalance: s.lesson_balance ?? 0,
          inviteToken: s.invite_token ?? null,
          email: s.email ?? '',
          tempPassword: s.temp_password ?? '',
        })))
      })
    })()
  }, [])
  return students
}
