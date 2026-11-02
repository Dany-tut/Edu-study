import type { Desk, LayoutItem } from './useDeskLayouts'

/** The agreed reset composition. All coordinates are whole cells. */
export function defaultDeskItems(id: string, columns = 8): LayoutItem[] {
  const item = (type: string, x: number, y: number, w: number, h: number): LayoutItem =>
    ({ i: type, type, x, y, w, h, gridVersion: 2 })
  const stats = id === 'today' ? ['stat-students', 'stat-hw', 'stat-lessons', 'finance-received']
    : id === 'finances' ? ['finance-received', 'finance-expected', 'finance-debt', 'finance-forecast']
    : ['student-count', 'student-groups', 'student-active', 'student-debtors']
  if (id === 'today' && columns >= 8) return [
    ...stats.map((type, x) => item(type, x*2, 0, 2, 1)),
    item('today-schedule', 0, 1, 4, 5),
    item('today-reminders', 4, 1, 4, 3),
    item('today-tasks', 4, 4, 4, 2),
  ]
  if(id==='students'&&columns>=8) return [
    ...stats.map((type,x)=>item(type,x,0,1,1)),
    item('groups-list',0,1,4,3),item('attention-students',4,0,4,4),
  ]
  const statW = Math.max(1, Math.floor(columns / 4))
  const indicators = stats.map((type, n) => item(type, (n * statW) % columns, Math.floor(n * statW / columns), (id==='students'&&type!=='student-count')?1:statW, 1))
  const top = Math.ceil(4 * statW / columns)
  if (id === 'today') return [...indicators,
    item('today-schedule', 0, top, columns, 3),
    item('today-reminders', 0, top + 3, columns, columns>=4?3:2),
    item('today-tasks', 0, top + (columns>=4?6:5), columns, 2),
  ]
  const left = id === 'finances' ? 'finance-overdue' : 'groups-list'
  const right = id === 'finances' ? 'finance-activity' : 'attention-students'
  if (columns <= 4) {const h=columns>=3?3:2;return [...indicators,item(left,0,top,columns,h),item(right,0,top+h,columns,h)]}
  return [...indicators, item(left, 0, top, Math.min(4,columns / 2), 4), item(right, columns / 2, top, Math.min(4,columns / 2), 4)]
}

export const DEFAULT_DESKS: Desk[] = [
  { id: 'today', name: 'Сегодня', icon: 'layout-dashboard', columns: 8, preset: 'balanced', items: defaultDeskItems('today') },
  { id: 'finances', name: 'Финансы', icon: 'wallet', columns: 8, preset: 'balanced', items: defaultDeskItems('finances') },
  { id: 'students', name: 'Ученики', icon: 'users', columns: 8, preset: 'balanced', items: defaultDeskItems('students') },
]
