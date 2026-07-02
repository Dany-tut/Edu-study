import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useGroups, useAllStudents } from './useGroups'

export interface ScheduleTodayItem {
  id: string
  time: string
  groupName: string
  groupId: string
  topic?: string
  status: 'upcoming' | 'active' | 'completed'
  color?: string
  colorSoft?: string
  lessonNumber?: number
}

export function useScheduleToday(): { schedule: ScheduleTodayItem[] } {
  const { groups } = useGroups()
  const allStudents = useAllStudents()
  const [schedule, setSchedule] = useState<ScheduleTodayItem[]>([])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('schedule_lessons')
      .select('*, groups(name, icon, color, color_soft, students(count))')
      .eq('date', today)
      .order('time_start')
      .then(({ data }) => {
        if (!data) return
        const ownedGroups = new Set(groups.map(g => g.id))
        const ownedStudents = new Set(allStudents.map(a => a.id))
        const owned = data.filter((s: any) =>
          (s.group_id && ownedGroups.has(s.group_id)) ||
          (s.student_id && ownedStudents.has(s.student_id)))
        setSchedule(owned.map((s: any) => {
          // Rows scoped to a single student (group_id null) have no group join.
          const stu = s.student_id ? allStudents.find(a => a.id === s.student_id) : null
          // DB stores 'live'; this widget's type uses 'active' for the in-progress state.
          const dbStatus = s.status ?? 'upcoming'
          const status: ScheduleTodayItem['status'] = dbStatus === 'live' ? 'active' : dbStatus
          return {
            id: String(s.id),
            groupId: s.group_id ?? '',
            groupName: s.groups?.name ?? stu?.name ?? '',
            time: (s.time_start ?? '').slice(0, 5),
            topic: s.lesson_title ?? '',
            lessonNumber: s.lesson_number ?? 0,
            status,
            color: s.groups?.color ?? 'var(--color-purple)',
            colorSoft: s.groups?.color_soft ?? 'var(--color-bg-3)',
          }
        }))
      })
  }, [groups, allStudents])

  return { schedule }
}
