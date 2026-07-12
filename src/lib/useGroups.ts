import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { parseStudentLimitError, studentLimitMessage } from './plan'
import { t } from './i18n'
import type { Group, GroupTrack, Student } from '../data/teacherMockData'

// Квота тарифа (0037): триггер students_enforce_limit кидает "STUDENT_LIMIT:<max>" —
// подменяем на человекочитаемое сообщение, остальные ошибки не трогаем.
function friendlyStudentError<T>(error: T): T {
  const e = error as { message?: string } | null
  if (!e) return error
  const max = parseStudentLimitError(e)
  return max == null ? error : ({ ...e, message: studentLimitMessage(max) } as T)
}


// Subject → emoji, mirrored from the modal's SUBJECT_ICONS so each extra
// направление card gets the right icon when the modal only passes its name.
const SUBJECT_ICON: Record<string, string> = {
  'Химия': '🧪', 'Биология': '🧬', 'Физика': '⚡', 'Математика': '📐',
  'Русский': '📝', 'Литература': '📖', 'История': '🏛️', 'Английский': '🇬🇧',
}

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
  tracks?: GroupTrack[] | null
  students: { count: number }[]
}

export type GroupCourseOption = { id: string; title: string; subject: string; lessonCount: number }

/** Teacher's own courses with their lesson counts — for the group→course picker.
 * Owned-only: binding writes courses.group_ids, which owner-scoped RLS restricts
 * to the course owner, so offering shared courses here would silently no-op. */
export async function listTeacherCourses(): Promise<GroupCourseOption[]> {
  const uid = await getOwnerId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, subject, lessons(count)')
    .eq('created_by', uid)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Array<{ id: string; title: string; subject: string; lessons: { count: number }[] }>).map(c => ({
    id: c.id,
    title: c.title || t('Без названия'),
    subject: c.subject ?? '',
    lessonCount: c.lessons?.[0]?.count ?? 0,
  }))
}

/** Attach a group to a course so its students receive that course (courses.group_ids). */
export async function bindGroupToCourse(groupId: string, courseId: string): Promise<void> {
  const { data } = await supabase.from('courses').select('group_ids').eq('id', courseId).single()
  const current: string[] = (data?.group_ids as string[] | null) ?? []
  if (current.includes(groupId)) return
  await supabase.from('courses').update({ group_ids: [...current, groupId] }).eq('id', courseId)
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
        tracks: Array.isArray(g.tracks) ? g.tracks : [],
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
    tracks?: GroupTrack[]
  }) {
    const uid = await getOwnerId()

    // One individual (1:1) group card PER направление: the primary subject/level
    // plus every extra track the teacher added. Each card is a separate group with
    // its own student row for the same person — so the teacher can run schedule,
    // journal and homework independently per subject. The student registers via the
    // primary card's invite link; that's the token/id we hand back.
    const cards: { subject: Group['subject']; level: string; icon: string }[] = [
      { subject: s.subject, level: s.level, icon: s.icon },
      ...(s.tracks ?? [])
        .filter(t => t.subject.trim() || t.level.trim())
        .map(t => ({
          subject: t.subject as Group['subject'],
          level: t.level,
          icon: SUBJECT_ICON[t.subject] ?? '📚',
        })),
    ]

    let firstInvite: string | null = null
    let firstStudentId: string | null = null
    let firstGroupId: string | null = null
    let firstError: unknown = null

    // One person across every направление-card of this new human.
    const personId = crypto.randomUUID()

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const { data: groupData, error: groupError } = await supabase.from('groups').insert({
        name: s.name,
        subject: card.subject,
        icon: card.icon,
        level: card.level,
        color: s.color,
        color_soft: s.colorSoft,
        start_date: null,
        total_lessons: 0,
        is_individual: true,
        created_by: uid,
      }).select().single()
      if (groupError || !groupData) { firstError = firstError ?? groupError; continue }

      const { data: studentData, error: studentError } = await supabase.from('students').insert({
        group_id: groupData.id,
        name: s.name,
        phone: s.phone ?? '',
        telegram_link: s.telegramLink ?? '',
        parent_contact: s.parentContact ?? '',
        desired_score: s.desiredScore ?? 80,
        payment_amount: s.paymentAmount ?? 0,
        person_id: personId,
      }).select('id, invite_token').single()
      if (studentError) { firstError = firstError ?? studentError; continue }
      if (i === 0) {
        firstInvite = studentData?.invite_token as string | null
        firstStudentId = studentData?.id as string | null
        firstGroupId = groupData.id as string
      }
    }

    await load()
    return { error: friendlyStudentError(firstError), inviteToken: firstInvite, studentId: firstStudentId, groupId: firstGroupId }
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
    return {
      error: friendlyStudentError(error),
      inviteToken: data?.invite_token as string | null,
      studentId: data?.id as string | null,
    }
  }

  async function deleteGroup(id: string) {
    await supabase.from('groups').delete().eq('id', id)
    await load()
  }

  // Add ONE more направление (subject/level) to an existing 1:1 student mid-training:
  // creates a separate individual group card + student row for the same person,
  // copying their contacts, target score, payment AND account link (email /
  // temp_password / auth_user_id). Because the account link is copied, the new card
  // is instantly reachable by the student's existing login — no re-registration.
  // The new row also gets a fresh invite_token so an unregistered student can still
  // activate it. Mirrors addIndividualStudent, just seeded from an existing student.
  async function addIndividualCard(opts: {
    student: Pick<Student, 'name' | 'phone' | 'telegramLink' | 'parentContact' | 'desiredScore' | 'paymentAmount' | 'email' | 'tempPassword' | 'authUserId' | 'personId'>
    subject: Group['subject']
    level: string
    color: string
    colorSoft: string
  }) {
    const uid = await getOwnerId()
    const { data: g, error: gErr } = await supabase.from('groups').insert({
      name: opts.student.name,
      subject: opts.subject,
      icon: SUBJECT_ICON[opts.subject] ?? '📚',
      level: opts.level,
      color: opts.color,
      color_soft: opts.colorSoft,
      start_date: null,
      total_lessons: 0,
      is_individual: true,
      created_by: uid,
    }).select('id').single()
    if (gErr || !g) return { error: gErr }

    const { data: srow, error: sErr } = await supabase.from('students').insert({
      group_id: g.id,
      name: opts.student.name,
      phone: opts.student.phone ?? '',
      telegram_link: opts.student.telegramLink ?? '',
      parent_contact: opts.student.parentContact ?? '',
      desired_score: opts.student.desiredScore ?? 80,
      payment_amount: opts.student.paymentAmount ?? 0,
      email: opts.student.email || null,
      temp_password: opts.student.tempPassword || null,
      auth_user_id: opts.student.authUserId || null,
      // Link to the SAME person — omit only if unknown (DB default mints a new one).
      ...(opts.student.personId ? { person_id: opts.student.personId } : {}),
    }).select('id, invite_token').single()
    // Already-registered student → seed their progress for this new card too.
    if (!sErr && srow?.id && opts.student.authUserId) {
      await supabase.rpc('seed_student_progress', { p_student_id: srow.id, p_group_id: g.id })
    }
    await load()
    return {
      error: friendlyStudentError(sErr),
      studentId: (srow?.id as string | undefined) ?? null,
      // Fresh token so an UNregistered existing person can still activate this card.
      inviteToken: (srow?.invite_token as string | undefined) ?? null,
    }
  }

  // Enroll an EXISTING person into a regular group. Unlike addStudentToGroup
  // (brand-new person → new invite), this copies the person's account link
  // (email / temp_password / auth_user_id) and contacts onto the new row, so the
  // student reaches the new group with their existing login — no re-registration.
  // Used when a 1:1 student later buys a group course. Already-registered → seed
  // their progress for this group so lessons/course show up immediately.
  async function addExistingStudentToGroup(
    targetGroupId: string,
    student: Pick<Student, 'name' | 'phone' | 'telegramLink' | 'parentContact' | 'desiredScore' | 'paymentAmount' | 'email' | 'tempPassword' | 'authUserId' | 'personId'>,
  ) {
    const { data, error } = await supabase.from('students').insert({
      group_id: targetGroupId,
      name: student.name,
      phone: student.phone ?? '',
      telegram_link: student.telegramLink ?? '',
      parent_contact: student.parentContact ?? '',
      desired_score: student.desiredScore ?? 80,
      payment_amount: student.paymentAmount ?? 0,
      email: student.email || null,
      temp_password: student.tempPassword || null,
      auth_user_id: student.authUserId || null,
      // Reuse the existing human's person_id so this enrolment is the same person.
      ...(student.personId ? { person_id: student.personId } : {}),
    }).select('id').single()
    if (!error && data?.id && student.authUserId) {
      await supabase.rpc('seed_student_progress', { p_student_id: data.id, p_group_id: targetGroupId })
    }
    await load()
    return { error: friendlyStudentError(error), studentId: data?.id as string | null }
  }

  // Replace the extra направления of a (1:1) group — add/remove mid-training.
  async function updateGroupTracks(groupId: string, tracks: GroupTrack[]) {
    const { error } = await supabase.from('groups').update({ tracks }).eq('id', groupId)
    if (!error) await load()
    return { error }
  }

  return { groups, loading, addGroup, addIndividualStudent, addStudentToGroup, addIndividualCard, addExistingStudentToGroup, deleteGroup, updateGroupTracks, reload: load }
}

export type TeacherCourseOption = { id: string; title: string; subject: string; level: string }

// Published courses owned by the current teacher — used by the new-student
// config step to optionally assign a course on creation.
export async function fetchTeacherCourses(): Promise<TeacherCourseOption[]> {
  const uid = await getOwnerId()
  const sharedIds = await fetchSharedCourseIds(uid)
  let q = supabase
    .from('courses')
    .select('id, title, subject, level, status, created_by')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  // Owned courses plus any shared with this teacher (read-only).
  q = sharedIds.length
    ? q.or(`created_by.eq.${uid},id.in.(${sharedIds.join(',')})`)
    : q.eq('created_by', uid)
  const { data } = await q
  return (data ?? []).map((c: any) => ({ id: c.id, title: c.title, subject: c.subject, level: c.level }))
}

// Course ids shared TO this teacher by another owner (read-only visibility).
export async function fetchSharedCourseIds(uid: string | null): Promise<string[]> {
  if (!uid) return []
  const { data } = await supabase.from('course_shares').select('course_id').eq('teacher_id', uid)
  return (data ?? []).map((r: any) => r.course_id)
}

// Applies the new-student config (widget visibility + optional course) right
// after the student row is created, before the invite link is shown. Both parts
// are optional; each failure is swallowed so a partial config never blocks the
// teacher from handing out the link.
// Resolve every student row that represents the same person as `studentId`.
// A 1:1 student with multiple subjects lives as one row per subject card
// (same name, same owner, each in its own individual group). Returns at least
// [studentId] so callers can always safely update the set.
async function resolveSiblingStudentIds(studentId: string): Promise<string[]> {
  const { data: self } = await supabase
    .from('students')
    .select('id, name, person_id, groups!inner(is_individual, created_by)')
    .eq('id', studentId)
    .single()
  const g = (self as any)?.groups
  if (!self) return [studentId]

  // Preferred: everyone sharing this person_id (robust to renames / same-name people).
  if ((self as any).person_id) {
    const { data: byPerson } = await supabase
      .from('students')
      .select('id')
      .eq('person_id', (self as any).person_id)
    const ids = (byPerson ?? []).map((r: any) => r.id as string)
    if (ids.length) return ids
  }

  // Fallback (un-backfilled rows): same name across this teacher's 1:1 cards.
  if (!g?.is_individual || !g?.created_by || !self.name) return [studentId]
  const { data: siblings } = await supabase
    .from('students')
    .select('id, groups!inner(is_individual, created_by)')
    .eq('name', self.name)
    .eq('groups.is_individual', true)
    .eq('groups.created_by', g.created_by)
  const ids = (siblings ?? []).map((r: any) => r.id as string)
  return ids.length ? ids : [studentId]
}

export async function configureNewStudent(
  studentId: string,
  opts: { hiddenWidgets?: number[]; courseId?: string | null; groupId?: string | null },
): Promise<void> {
  const { hiddenWidgets, courseId, groupId } = opts

  if (hiddenWidgets && hiddenWidgets.length > 0) {
    // A multi-subject 1:1 student is stored as one student row per subject card
    // (see addIndividualStudent). The config step only knows the first row's id,
    // so hide the widgets on EVERY sibling card of the same person — otherwise the
    // student sees all widgets whenever their session resolves to another subject
    // card. Siblings = same name under the same owner (matches the group-tracks
    // sibling model). Falls back to just this row if we can't resolve siblings.
    const ids = await resolveSiblingStudentIds(studentId)
    const { error } = await supabase
      .from('students')
      .update({ hidden_widgets: hiddenWidgets })
      .in('id', ids)
    if (error) console.error('[configureNewStudent] hide widgets failed', error)
  }

  if (courseId) {
    // Append the student to the course's student_ids (idempotent). fetchCourseStructure
    // reads `student_ids.cs.{id}`, so this alone makes the course appear on the
    // student's dashboard; the teacher opens individual lessons afterwards.
    const { data: course } = await supabase
      .from('courses').select('student_ids').eq('id', courseId).single()
    const current = (course?.student_ids as string[] | null) ?? []
    if (!current.includes(studentId)) {
      await supabase.from('courses').update({ student_ids: [...current, studentId] }).eq('id', courseId)
    }
    if (groupId) {
      await supabase.rpc('seed_student_progress', { p_student_id: studentId, p_group_id: groupId })
    }
  }
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
        personId: s.person_id ?? undefined,
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
    return { error: friendlyStudentError(error), inviteToken: data?.invite_token as string | null }
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
      } else {
        // "Все группы": schedule_lessons has no created_by and is anon-readable,
        // so an unfiltered query would return other teachers' lessons. Scope to
        // this teacher's own groups (and their students) explicitly.
        const uid = await getOwnerId()
        if (!uid) { if (!cancelled) setLessons([]); return }
        const { data: ownGroups } = await supabase
          .from('groups').select('id').eq('created_by', uid)
        const groupIds = (ownGroups ?? []).map((g: any) => g.id)
        if (!groupIds.length) { if (!cancelled) setLessons([]); return }
        const { data: studs } = await supabase
          .from('students').select('id').in('group_id', groupIds)
        const studentIds = (studs ?? []).map((s: any) => s.id)
        const scope = [`group_id.in.(${groupIds.join(',')})`]
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
      } else {
        // No group filter (the nav badge): still scope to THIS teacher's own
        // groups / students, otherwise a new teacher sees every teacher's lessons.
        const uid = await getOwnerId()
        const { data: myGroups } = await supabase.from('groups').select('id, students(id)').eq('created_by', uid)
        const groupIds = (myGroups ?? []).map((g: any) => g.id)
        const studentIds = (myGroups ?? []).flatMap((g: any) => (g.students ?? []).map((s: any) => s.id))
        if (!groupIds.length && !studentIds.length) { setPending([]); return }
        const scope: string[] = []
        if (groupIds.length) scope.push(`group_id.in.(${groupIds.join(',')})`)
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
    supabase.from('students').select('*, groups!inner(created_by, subject, is_individual)').eq('groups.created_by', uid).order('name')
      .then(({ data }) => {
        if (data) setStudents(data.map((s: any) => ({
          id: s.id,
          groupId: s.group_id,
          subject: s.groups?.subject ?? '',
          isIndividual: s.groups?.is_individual ?? false,
          authUserId: s.auth_user_id ?? undefined,
          personId: s.person_id ?? undefined,
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
