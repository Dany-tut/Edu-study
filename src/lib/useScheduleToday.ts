import { useMemo } from 'react'
import { useTeacherTodaySchedule } from './teacherToday'

export interface ScheduleTodayItem {
  id: string; time: string; endTime?: string; groupName: string; groupId: string; topic?: string
  status: 'upcoming' | 'active' | 'completed'; color?: string; colorSoft?: string; lessonNumber?: number
}

export function useScheduleToday(): { schedule: ScheduleTodayItem[] } {
  const { schedule } = useTeacherTodaySchedule()
  return { schedule: useMemo(()=>schedule.map(row=>({ ...row, groupId: row.groupId ?? '',
    status: (row.status === 'live' ? 'active' : row.status) as ScheduleTodayItem['status'] })),[schedule]) }
}
