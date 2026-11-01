import type { HomeworkItem, Reminder, Student } from '../data/teacherMockData'

const DAY = 86_400_000
const stamp = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? value : undefined
const dayNumber = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) / DAY : NaN
export const reminderDayDifference = (date: string, today: string) => dayNumber(date) - dayNumber(today)
export const reminderDate = (date: string) => Number.isFinite(dayNumber(date)) ? `${date.slice(8, 10)}.${date.slice(5, 7)}` : ''

type SubmissionClock = { status: string; updated_at?: string | null; homework_attempts?: { number: number; status: string; submitted_at?: string | null }[] | null }
/** Only the latest, currently unreviewed attempt contributes to waiting time. */
export function pendingSubmissionTime(row: SubmissionClock): string | undefined {
  if (row.status !== 'submitted') return undefined
  const latest = row.homework_attempts?.reduce<NonNullable<SubmissionClock['homework_attempts']>[number] | undefined>((a, b) => !a || b.number > a.number ? b : a, undefined)
  return (latest?.status === 'submitted' ? stamp(latest.submitted_at) : undefined) ?? stamp(row.updated_at)
}

export function reminderWait(since: string | undefined, now: number, t: (text: string) => string = text => text): string | undefined {
  const at = stamp(since)
  if (!at) return undefined
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60_000))
  if (minutes < 1) return t('Сдано только что')
  if (minutes < 60) return `${t('Ждёт')} ${minutes} ${t('мин')}`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${t('Ждёт')} ${hours} ${t('ч')}` : `${t('Ждёт')} ${Math.floor(hours / 24)} ${t('дн.')}`
}

type Input = {
  homework: HomeworkItem[]
  hard: { id: string; studentName: string; lessonTitle: string; updatedAt: string; status: string }[]
  students: Pick<Student, 'id' | 'name' | 'paymentDue' | 'paymentAmount'>[]
  journals: { scheduleId: string; scopeName: string; date: string; title: string }[]
  today: string
  now: number
  t: (text: string) => string
}

export function buildTeacherReminders({ homework, hard, students, journals, today, now, t }: Input): Reminder[] {
  const waitState = (since?: string) => ({
    statusLabel: reminderWait(since, now, t),
    urgency: (stamp(since) && now - Date.parse(since!) >= DAY ? 'high' : 'medium') as Reminder['urgency'],
  })
  return [
    ...homework.filter(hw => hw.status === 'active' && hw.submittedCount > 0).map(hw => {
      const pending = Math.max(0, hw.submittedCount - hw.reviewedCount)
      return {
        id: `hw-${hw.id}`, type: 'check-hw' as const,
        text: `${t('Проверить ДЗ')} — ${hw.groupName}`,
        detail: `${t('На проверке')}: ${pending} · ${hw.submittedCount} ${t('из')} ${hw.totalCount} ${t('сдали')} · ${t('Проверено')}: ${hw.reviewedCount}`,
        pendingCount: pending, done: pending === 0,
        ...waitState(hw.oldestSubmittedAt),
      }
    }),
    ...hard.filter(s => s.status === 'submitted').map(s => ({
      id: `hard-${s.id}`, type: 'check-hw' as const,
      text: `${t('Сложное ДЗ')} — ${s.studentName.split(' ')[0]}`,
      detail: s.lessonTitle, pendingCount: 1, ...waitState(s.updatedAt),
    })),
    ...students.filter(s => s.paymentDue && reminderDayDifference(s.paymentDue, today) <= 7).map(s => {
      const days = reminderDayDifference(s.paymentDue!, today)
      return {
        id: `pay-${s.id}`, type: 'payment-debt' as const,
        text: `${t('Оплата')} — ${s.name.split(' ')[0]}`,
        detail: [s.paymentAmount != null ? `${s.paymentAmount.toLocaleString('ru-RU')} ₽` : '', `${t('Срок')}: ${reminderDate(s.paymentDue!)}`].filter(Boolean).join(' · '),
        statusLabel: days < 0 ? `${t('Просрочено на')} ${Math.abs(days)} ${t('дн.')}` : days === 0 ? t('Оплата сегодня') : `${t('Через')} ${days} ${t('дн.')}`,
        urgency: (days < 0 ? 'high' : 'medium') as Reminder['urgency'],
      }
    }),
    ...journals.map(p => ({
      id: `journal-${p.scheduleId}`, type: 'fill-journal' as const,
      text: `${t('Журнал')} — ${p.scopeName}`,
      detail: `${reminderDate(p.date)} · ${p.title}`,
      statusLabel: t('Не заполнен'), urgency: 'medium' as const,
    })),
  ]
}
