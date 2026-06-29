import { lazy, type ComponentType } from 'react'
import { CreditCard, Users, Wallet, AlertCircle, LayoutList, Clock, Bell, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const WidgetFinanceKpi        = lazy(() => import('./WidgetFinanceKpi'))
const WidgetFinanceOverdue    = lazy(() => import('./WidgetFinanceOverdue'))
const WidgetFinanceActivity   = lazy(() => import('./WidgetFinanceActivity'))
const WidgetStudentStats      = lazy(() => import('./WidgetStudentStats'))
const WidgetGroupsList        = lazy(() => import('./WidgetGroupsList'))
const WidgetAttentionStudents = lazy(() => import('./WidgetAttentionStudents'))
const WidgetTodayStats        = lazy(() => import('./WidgetTodayStats'))
const WidgetTodaySchedule     = lazy(() => import('./WidgetTodaySchedule'))
const WidgetTodayReminders    = lazy(() => import('./WidgetTodayReminders'))
const WidgetTodayTasks        = lazy(() => import('./WidgetTodayTasks'))

export type WidgetDef = {
  type: string
  label: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  description: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  maxH?: number
  component: ComponentType
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    type: 'finance-kpi',
    label: 'Финансы: сводка',
    icon: CreditCard,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Получено, ожидается, долг, прогноз',
    defaultW: 12, defaultH: 2,
    minW: 6, minH: 2, maxH: 2,
    component: WidgetFinanceKpi,
  },
  {
    type: 'finance-overdue',
    label: 'Должники',
    icon: AlertCircle,
    iconBg: 'var(--color-red-soft)',
    iconColor: 'var(--color-red-text)',
    description: 'Список учеников с задолженностью',
    defaultW: 6, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetFinanceOverdue,
  },
  {
    type: 'finance-activity',
    label: 'История платежей',
    icon: Wallet,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Последние поступления от учеников',
    defaultW: 6, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetFinanceActivity,
  },
  {
    type: 'student-stats',
    label: 'Ученики: сводка',
    icon: Users,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Количество учеников, групп, активных',
    defaultW: 12, defaultH: 2,
    minW: 6, minH: 2, maxH: 2,
    component: WidgetStudentStats,
  },
  {
    type: 'groups-list',
    label: 'Список групп',
    icon: LayoutList,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Все группы с количеством учеников',
    defaultW: 6, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetGroupsList,
  },
  {
    type: 'attention-students',
    label: 'Требуют внимания',
    icon: AlertCircle,
    iconBg: 'var(--color-peach-soft)',
    iconColor: '#C07020',
    description: 'Ученики с долгом или просрочкой оплаты',
    defaultW: 6, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetAttentionStudents,
  },
  {
    type: 'today-stats',
    label: 'Статистика',
    icon: Users,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Студенты, ДЗ на проверку, уроков сегодня, доход',
    defaultW: 12, defaultH: 2,
    minW: 6, minH: 2, maxH: 2,
    component: WidgetTodayStats,
  },
  {
    type: 'today-schedule',
    label: 'Расписание',
    icon: Clock,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Расписание уроков на сегодня',
    defaultW: 7, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetTodaySchedule,
  },
  {
    type: 'today-reminders',
    label: 'Напоминания',
    icon: Bell,
    iconBg: 'var(--color-peach-soft)',
    iconColor: '#C07020',
    description: 'Задачи, требующие внимания сегодня',
    defaultW: 5, defaultH: 5,
    minW: 3, minH: 3,
    component: WidgetTodayReminders,
  },
  {
    type: 'today-tasks',
    label: 'Мои задачи',
    icon: CheckCircle2,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Личный список задач учителя',
    defaultW: 7, defaultH: 5,
    minW: 4, minH: 3,
    component: WidgetTodayTasks,
  },
]

export function getWidgetDef(type: string): WidgetDef | undefined {
  return WIDGET_REGISTRY.find(w => w.type === type)
}
