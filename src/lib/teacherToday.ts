import { useEffect, useMemo } from 'react'
import { withLoadFixture, fixtureToday } from './loadFixture'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { readTeacherRoster, useGroups, useAllStudentsSnapshot } from './useGroups'
import { createSharedQuery, useSharedQuery } from './sharedQuery'
import { todayMsk } from './teacherSchedule'
import type { ScheduleItem, Group, Student } from '../data/teacherMockData'

type TodayRow = { id: string; time_start: string | null; time_end: string | null; lesson_title: string | null;
  lesson_number: number | null; group_id: string | null; student_id: string | null; subject: string | null; status: string | null }

const todayQuery = createSharedQuery<TodayRow[]>(withLoadFixture(k => fixtureToday(k) as TodayRow[], async () => {
  const owner = await getOwnerId()
  if (!owner) return []
  const { groups, students } = await readTeacherRoster()
  if (await getOwnerId() !== owner) throw new Error('Сессия изменилась')
  const scope = [groups.length ? `group_id.in.(${groups.map(g=>g.id).join(',')})` : '',
    students.length ? `student_id.in.(${students.map(s=>s.id).join(',')})` : ''].filter(Boolean).join(',')
  if (!scope) return []
  const { data, error } = await supabase.from('schedule_lessons')
    .select('id,time_start,time_end,lesson_title,lesson_number,group_id,student_id,subject,status')
    .eq('date', todayMsk()).or(scope).order('time_start')
  if (error) throw error
  if (await getOwnerId() !== owner) throw new Error('Сессия изменилась')
  return (data ?? []) as TodayRow[]
}), [], { watch: reload => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let day = todayMsk()
  const channel = supabase.channel(`teacher-today-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_lessons' }, () => {
      clearTimeout(timer); timer = setTimeout(reload, 100)
    }).subscribe()
  const clock = setInterval(() => { const next = todayMsk(); if(next !== day) {day=next;reload()} },60_000)
  return () => { clearTimeout(timer); clearInterval(clock); void supabase.removeChannel(channel) }
} })

export function mapTeacherToday(rows: TodayRow[], groups: Group[], students: Student[]): ScheduleItem[] {
  const byGroup = new Map(groups.map(g=>[g.id,g])), byStudent = new Map(students.map(s=>[s.id,s]))
  return rows.filter(row => (row.group_id && byGroup.has(row.group_id)) || (row.student_id && byStudent.has(row.student_id))).map(row => {
    const group = row.group_id ? byGroup.get(row.group_id) : undefined
    const student = row.student_id ? byStudent.get(row.student_id) : undefined
    return { id: row.id, groupId: row.group_id, studentId: row.student_id,
      groupName: group?.name ?? student?.name ?? '', icon: group?.icon ?? '👤', subject: row.subject ?? '',
      time: (row.time_start ?? '').slice(0,5), endTime: (row.time_end ?? '').slice(0,5),
      topic: row.lesson_title ?? '', lessonNumber: row.lesson_number ?? 0,
      status: (row.status ?? 'upcoming') as ScheduleItem['status'],
      studentCount: group?.studentCount ?? (student ? 1 : 0),
      color: group?.color ?? 'var(--color-purple)', colorSoft: group?.colorSoft ?? 'var(--color-purple-soft)' }
  })
}

let rosterScope = ''
export function useTeacherTodaySchedule() {
  const { groups, loading: groupsLoading } = useGroups()
  const { value: students, loading: studentsLoading } = useAllStudentsSnapshot()
  const { value: rows, loading } = useSharedQuery(todayQuery)
  const scope = JSON.stringify([groups.map(g=>g.id).sort(),students.map(s=>s.id).sort()])
  useEffect(() => {
    if(groupsLoading || studentsLoading) return
    if(rosterScope && rosterScope !== scope) void todayQuery.reload()
    rosterScope = scope
  },[scope,groupsLoading,studentsLoading])
  const schedule = useMemo(()=>mapTeacherToday(rows,groups,students),[rows,groups,students])
  return { schedule, loading }
}
