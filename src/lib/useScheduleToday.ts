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
  return { schedule: [] }
}
