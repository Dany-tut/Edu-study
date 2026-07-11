// DEV-ONLY demo data for the mobile teacher home ("Главная").
//
// Mirrors the devStudentDemo.ts pattern: gated behind import.meta.env.DEV and
// used ONLY as a fallback when the real Supabase-backed hooks return nothing
// (no logged-in teacher in local dev). Real data ALWAYS wins in production —
// this never touches the database and never renders when real data exists.
//
// Purpose: let us polish the redesigned home screen locally against a realistic
// tutor (репетитор химии/биологии) with a schedule, money, and students that
// need attention — instead of the empty 0/0/0 state.

import type { ScheduleItem } from './teacherMockData'

const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export type AttentionTagKind = 'danger' | 'warning' | 'neutral' | 'success'
export type AttentionItem = {
  id: string
  name: string
  initials: string
  tag: string
  tagKind: AttentionTagKind
  sub: string
  /** Telegram/VK контакт ученика (для кнопки «Напомнить»); если пусто — открываем карточку. */
  contact?: string
}

export type TeacherHomeMoney = {
  received: number       // получено за текущий месяц, ₽
  debt: number           // суммарный долг учеников, ₽
  debtorCount: number    // сколько учеников должны
  forecast: number       // прогноз до конца месяца по расписанию, ₽
  plannedLessons: number // ещё занятий по расписанию до конца месяца
}

export type TeacherHomeModel = {
  name: string
  totalReview: number
  hardReview: number
  studentTotal: number
  groupCount: number
  journalPending: number
  money: TeacherHomeMoney
  schedule: ScheduleItem[]
  attention: AttentionItem[]
}

const S = (
  id: string,
  time: string,
  endTime: string,
  groupName: string,
  topic: string,
  status: ScheduleItem['status'],
  studentCount: number,
  extra: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  time,
  endTime,
  groupId: extra.groupId ?? null,
  studentId: extra.studentId ?? null,
  groupName,
  subject: extra.subject ?? 'Химия',
  icon: extra.icon ?? '⚗️',
  lessonNumber: extra.lessonNumber ?? 0,
  topic,
  studentCount,
  status,
  color: extra.color ?? 'var(--color-purple)',
  colorSoft: extra.colorSoft ?? 'var(--color-purple-soft)',
})

export const DEMO_TEACHER_HOME: TeacherHomeModel = {
  name: 'Дарья',
  totalReview: 3,
  hardReview: 2,
  studentTotal: 18,
  groupCount: 4,
  journalPending: 2,
  money: {
    received: 24000,
    debt: 4800,
    debtorCount: 2,
    forecast: 18000,
    plannedLessons: 6,
  },
  schedule: [
    S('demo-s1', '14:00', '15:00', '1:1 Артём', 'Гидролиз солей', 'completed', 1, {
      icon: '👤', studentId: 'demo-artem',
    }),
    S('demo-s2', '17:00', '18:30', 'ЕГЭ-группа А', 'Электролиз', 'upcoming', 6, {
      lessonNumber: 12, color: 'var(--color-teal)', colorSoft: 'var(--color-teal-pill-bg)',
    }),
    S('demo-s3', '19:30', '20:30', '1:1 Соня', 'Скорости реакций', 'upcoming', 1, {
      icon: '👤', studentId: 'demo-sonya',
    }),
  ],
  attention: [
    {
      id: 'demo-artem',
      name: 'Артём Р.',
      initials: 'АР',
      tag: 'не сдал ДЗ',
      tagKind: 'danger',
      sub: 'просрочка 2 дня · долг 2 400 ₽',
      contact: 'artem_demo',
    },
    {
      id: 'demo-igor',
      name: 'Игорь Л.',
      initials: 'ИЛ',
      tag: 'отменил урок',
      tagKind: 'neutral',
      sub: 'вторник · перенести?',
      contact: 'igor_demo',
    },
    {
      id: 'demo-sonya',
      name: 'Соня М.',
      initials: 'СМ',
      tag: 'балл 3/5',
      tagKind: 'warning',
      sub: 'оценки падают 2 урока',
      contact: 'sonya_demo',
    },
  ],
}

// Keep the linter aware iso() is intentionally available for future demo dates.
void iso
