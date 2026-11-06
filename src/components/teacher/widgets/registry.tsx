import { lazy, type ComponentType } from 'react'
import { WIDGET_LAYOUTS, type WidgetCellSize } from '../../../lib/widgetLayouts'
import { CreditCard, Users, Wallet, AlertCircle, LayoutList, Clock, Bell, CheckCircle2, TrendingUp, Layers, Sparkles, Send, FileText } from '../../icons/appIcons'
import type { FeatureKey } from '../../../lib/teacherFeatures'
import type { LucideIcon } from '../../icons/appIcons'
import { retryImport } from '../../../lib/chunkError'

const WidgetFinanceKpi        = lazy(() => retryImport(() => import('./WidgetFinanceKpi')))
const WidgetFinanceOverdue    = lazy(() => retryImport(() => import('./WidgetFinanceOverdue')))
const WidgetFinanceActivity   = lazy(() => retryImport(() => import('./WidgetFinanceActivity')))
const WidgetStudentStats      = lazy(() => retryImport(() => import('./WidgetStudentStats')))
const WidgetGroupsList        = lazy(() => retryImport(() => import('./WidgetGroupsList')))
const WidgetAttentionStudents = lazy(() => retryImport(() => import('./WidgetAttentionStudents')))
const WidgetTodayStats        = lazy(() => retryImport(() => import('./WidgetTodayStats')))
const WidgetTodaySchedule     = lazy(() => retryImport(() => import('./WidgetTodaySchedule')))
const WidgetTodayReminders    = lazy(() => retryImport(() => import('./WidgetTodayReminders')))
const WidgetTodayTasks        = lazy(() => retryImport(() => import('./WidgetTodayTasks')))
// Individual stat widgets
const WidgetStatStudents      = lazy(() => retryImport(() => import('./WidgetStatStudents')))
const WidgetStatHW            = lazy(() => retryImport(() => import('./WidgetStatHW')))
const WidgetStatLessons       = lazy(() => retryImport(() => import('./WidgetStatLessons')))
const WidgetStatEarnings      = lazy(() => retryImport(() => import('./WidgetStatEarnings')))
const WidgetFinanceReceived   = lazy(() => retryImport(() => import('./WidgetFinanceReceived')))
const WidgetFinanceExpected   = lazy(() => retryImport(() => import('./WidgetFinanceExpected')))
const WidgetFinanceDebt       = lazy(() => retryImport(() => import('./WidgetFinanceDebt')))
const WidgetFinanceForecast   = lazy(() => retryImport(() => import('./WidgetFinanceForecast')))
const WidgetStudentCount      = lazy(() => retryImport(() => import('./WidgetStudentCount')))
const WidgetStudentGroups     = lazy(() => retryImport(() => import('./WidgetStudentGroups')))
const WidgetStudentActive     = lazy(() => retryImport(() => import('./WidgetStudentActive')))
const WidgetStudentDebtors    = lazy(() => retryImport(() => import('./WidgetStudentDebtors')))
const WidgetPaymentsInbox     = lazy(() => retryImport(() => import('./WidgetPaymentsInbox')))
const WidgetCommsToday        = lazy(() => retryImport(() => import('./WidgetCommsToday')))
const WidgetParentReports     = lazy(() => retryImport(() => import('./WidgetParentReports')))

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
  allowedSizes?: readonly WidgetCellSize[]
  unavailable?: boolean
  minWidthPx?: number
  minHeightPx?: number
  maxH?: number
  /** Independent metric with compact, horizontal and full layouts. */
  stat?: boolean
  /** Widget renders its own card(s); the desk cell must NOT add a frame/shadow
   *  (otherwise a stray backing panel shows behind multi-card row widgets). */
  bare?: boolean
  /** Existing saved desks still render this type; new desks use individual cards. */
  legacy?: boolean
  /** Виджет функции-автоматизации: виден на столе и в «Добавить виджет»,
   *  только пока функция выдана и включена (teacherFeatures). */
  feature?: FeatureKey
  component: ComponentType
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  // ── Independent adaptive metrics ─────────
  { type: 'stat-students', label: 'Студентов', icon: Users, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Кол-во студентов', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStatStudents },
  { type: 'stat-hw', label: 'Проверить ДЗ', icon: CheckCircle2, iconBg: 'var(--color-red-soft)', iconColor: 'var(--color-red-text)', description: 'ДЗ на проверку', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStatHW },
  { type: 'stat-lessons', label: 'Уроков сегодня', icon: Clock, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Уроки на сегодня', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStatLessons },
  { unavailable: true, type: 'stat-earnings', label: 'За месяц', icon: TrendingUp, iconBg: 'var(--color-yellow-soft)', iconColor: 'var(--color-yellow-text)', description: 'Доход за месяц', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStatEarnings },
  { type: 'finance-received', label: 'Получено', icon: TrendingUp, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Получено в этом месяце', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetFinanceReceived },
  { type: 'finance-expected', label: 'Ожидается', icon: Clock, iconBg: 'var(--color-peach-soft)', iconColor: '#C07020', description: 'Ожидается оплата', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetFinanceExpected },
  { type: 'finance-debt', label: 'Долг', icon: AlertCircle, iconBg: 'var(--color-red-soft)', iconColor: 'var(--color-red-text)', description: 'Общий долг', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetFinanceDebt },
  { type: 'finance-forecast', label: 'Прогноз', icon: Sparkles, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Прогноз до конца месяца', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetFinanceForecast },
  { type: 'student-count', label: 'Карточек учеников', icon: Users, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Кол-во учеников', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStudentCount },
  { type: 'student-groups', label: 'Групп', icon: Layers, iconBg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', description: 'Кол-во групп', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStudentGroups },
  { type: 'student-active', label: 'Без долга по занятиям', icon: CheckCircle2, iconBg: 'var(--color-green-soft)', iconColor: 'var(--color-green-text)', description: 'Без задолженностей', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStudentActive },
  { type: 'student-debtors', label: 'Минус по занятиям', icon: AlertCircle, iconBg: 'var(--color-peach-soft)', iconColor: '#C07020', description: 'Требуют внимания', defaultW: 1, defaultH: 1, minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88, maxH: 6, stat: true, component: WidgetStudentDebtors },
  // ── Legacy combined widgets (kept for backward compat) ────────────────────
  {
    type: 'finance-kpi',
    label: 'Финансы: сводка',
    icon: CreditCard,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Получено, ожидается, долг, прогноз',
    defaultW: 12, defaultH: 2,
    minW: 1, minH: 1, minWidthPx: 606, minHeightPx: 88, maxH: 6,
    bare: true,
    legacy: true,
    component: WidgetFinanceKpi,
  },
  {
    type: 'finance-overdue',
    label: 'Должники',
    icon: AlertCircle,
    iconBg: 'var(--color-red-soft)',
    iconColor: 'var(--color-red-text)',
    description: 'Список учеников с задолженностью',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 280, minHeightPx: 240,
    component: WidgetFinanceOverdue,
  },
  {
    type: 'finance-activity',
    label: 'История платежей',
    icon: Wallet,
    iconBg: 'var(--color-green-soft)',
    iconColor: 'var(--color-green-text)',
    description: 'Последние поступления от учеников',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 280, minHeightPx: 240,
    component: WidgetFinanceActivity,
  },
  {
    type: 'payments-inbox',
    label: 'Оплаты: ждут вас',
    icon: Wallet,
    iconBg: 'var(--color-peach-soft)',
    iconColor: '#C07020',
    description: '«Оплатили» на подтверждение и закрытие месяца',
    defaultW: 3, defaultH: 3,
    minW: 2, minH: 2, minWidthPx: 280, minHeightPx: 240,
    feature: 'payment_reminders' as FeatureKey,
    component: WidgetPaymentsInbox,
  },
  {
    type: 'student-stats',
    label: 'Ученики: сводка',
    icon: Users,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Количество учеников, групп, активных',
    defaultW: 12, defaultH: 2,
    minW: 1, minH: 1, minWidthPx: 606, minHeightPx: 88, maxH: 6,
    bare: true,
    legacy: true,
    component: WidgetStudentStats,
  },
  {
    type: 'groups-list',
    label: 'Список групп',
    icon: LayoutList,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Все группы с количеством учеников',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 280, minHeightPx: 240,
    component: WidgetGroupsList,
  },
  {
    type: 'attention-students',
    label: 'Требуют внимания',
    icon: AlertCircle,
    iconBg: 'var(--color-peach-soft)',
    iconColor: '#C07020',
    description: 'Ученики с долгом или просрочкой оплаты',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 144, minHeightPx: 88,
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
    minW: 1, minH: 1, minWidthPx: 606, minHeightPx: 88, maxH: 6,
    bare: true,
    legacy: true,
    component: WidgetTodayStats,
  },
  {
    type: 'today-schedule',
    label: 'Расписание',
    icon: Clock,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Расписание уроков на сегодня',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 320, minHeightPx: 240,
    component: WidgetTodaySchedule,
  },
  {
    type: 'today-reminders',
    label: 'Напоминания',
    icon: Bell,
    iconBg: 'var(--color-peach-soft)',
    iconColor: '#C07020',
    description: 'Задачи, требующие внимания сегодня',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 280, minHeightPx: 240,
    component: WidgetTodayReminders,
  },
  {
    type: 'today-tasks',
    label: 'Мои задачи',
    icon: CheckCircle2,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Личный список задач учителя',
    defaultW: 3, defaultH: 3,
    minW: 1, minH: 1, minWidthPx: 280, minHeightPx: 240,
    component: WidgetTodayTasks,
  },
  {
    type: 'comms-today',
    label: 'Связь с учениками',
    icon: Send,
    iconBg: 'var(--color-blue-pill-bg)',
    iconColor: 'var(--color-blue-pill-text)',
    description: 'Что уйдёт сегодня, что не дошло, кто подключил Telegram',
    defaultW: 3, defaultH: 4,
    minW: 2, minH: 2, minWidthPx: 280, minHeightPx: 240,
    feature: 'reminders' as FeatureKey,
    component: WidgetCommsToday,
  },
  {
    type: 'parent-reports',
    label: 'Отчёты родителям',
    icon: FileText,
    iconBg: 'var(--color-purple-soft)',
    iconColor: 'var(--color-accent)',
    description: 'Сколько отчётов готово и какие требуют решения',
    defaultW: 3, defaultH: 4,
    minW: 2, minH: 2, minWidthPx: 280, minHeightPx: 240,
    feature: 'parent_report' as FeatureKey,
    component: WidgetParentReports,
  },
].map(def => ({...def, allowedSizes:WIDGET_LAYOUTS[def.type]}))

export function getWidgetDef(type: string): WidgetDef | undefined {
  return WIDGET_REGISTRY.find(w => w.type === type)
}
