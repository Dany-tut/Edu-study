import { lazy, type ComponentType } from 'react'
import { CreditCard, Users, Wallet, AlertCircle, LayoutList, Clock, Bell, CheckCircle2, TrendingUp, Layers, Sparkles } from 'lucide-react'
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
// Individual stat widgets
const WidgetStatStudents      = lazy(() => import('./WidgetStatStudents'))
const WidgetStatHW            = lazy(() => import('./WidgetStatHW'))
const WidgetStatLessons       = lazy(() => import('./WidgetStatLessons'))
const WidgetStatEarnings      = lazy(() => import('./WidgetStatEarnings'))
const WidgetFinanceReceived   = lazy(() => import('./WidgetFinanceReceived'))
const WidgetFinanceExpected   = lazy(() => import('./WidgetFinanceExpected'))
const WidgetFinanceDebt       = lazy(() => import('./WidgetFinanceDebt'))
const WidgetFinanceForecast   = lazy(() => import('./WidgetFinanceForecast'))
const WidgetStudentCount      = lazy(() => import('./WidgetStudentCount'))
const WidgetStudentGroups     = lazy(() => import('./WidgetStudentGroups'))
const WidgetStudentActive     = lazy(() => import('./WidgetStudentActive'))
const WidgetStudentDebtors    = lazy(() => import('./WidgetStudentDebtors'))

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
  /** Widget renders its own card(s); the desk cell must NOT add a frame/shadow
   *  (otherwise a stray backing panel shows behind multi-card row widgets). */
  bare?: boolean
  component: ComponentType
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  // ── Individual stat mini-widgets (maxH:2 — compact, fixed height) ─────────
  { type: 'stat-students', label: 'Студентов', icon: Users, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Кол-во студентов', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStatStudents },
  { type: 'stat-hw', label: 'Проверить ДЗ', icon: CheckCircle2, iconBg: 'var(--color-red-soft)', iconColor: 'var(--color-red-text)', description: 'ДЗ на проверку', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStatHW },
  { type: 'stat-lessons', label: 'Уроков сегодня', icon: Clock, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Уроки на сегодня', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStatLessons },
  { type: 'stat-earnings', label: 'За месяц', icon: TrendingUp, iconBg: 'var(--color-yellow-soft)', iconColor: 'var(--color-yellow-text)', description: 'Доход за месяц', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStatEarnings },
  { type: 'finance-received', label: 'Получено', icon: TrendingUp, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Получено в этом месяце', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetFinanceReceived },
  { type: 'finance-expected', label: 'Ожидается', icon: Clock, iconBg: 'var(--color-peach-soft)', iconColor: '#C07020', description: 'Ожидается оплата', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetFinanceExpected },
  { type: 'finance-debt', label: 'Долг', icon: AlertCircle, iconBg: 'var(--color-red-soft)', iconColor: 'var(--color-red-text)', description: 'Общий долг', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetFinanceDebt },
  { type: 'finance-forecast', label: 'Прогноз', icon: Sparkles, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Прогноз до конца месяца', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetFinanceForecast },
  { type: 'student-count', label: 'Учеников', icon: Users, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Кол-во учеников', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStudentCount },
  { type: 'student-groups', label: 'Групп', icon: Layers, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Кол-во групп', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStudentGroups },
  { type: 'student-active', label: 'Активных', icon: CheckCircle2, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Без задолженностей', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStudentActive },
  { type: 'student-debtors', label: 'Должников', icon: AlertCircle, iconBg: 'var(--color-peach-soft)', iconColor: '#C07020', description: 'Требуют внимания', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxH: 2, component: WidgetStudentDebtors },
  // ── Legacy combined widgets (kept for backward compat) ────────────────────
  {
    type: 'finance-kpi',
    label: 'Финансы: сводка',
    icon: CreditCard,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Получено, ожидается, долг, прогноз',
    defaultW: 12, defaultH: 2,
    minW: 6, minH: 2, maxH: 2,
    bare: true,
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
    bare: true,
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
    bare: true,
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
