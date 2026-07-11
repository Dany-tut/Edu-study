// DEV-ONLY demo data for the mobile teacher cabinet (Ученики / Проверка / Журнал).
//
// Sibling of teacherHomeDemo.ts — same rules:
//   • gated behind import.meta.env.DEV,
//   • used ONLY as a fallback when the real Supabase-backed hooks return nothing
//     (no logged-in teacher in local dev),
//   • never touches the database (demo ids are prefixed `demo-`; every write path
//     that would hit Supabase is short-circuited when it sees such an id),
//   • real data ALWAYS wins in production.
//
// Purpose: let us browse a populated cabinet locally (rosters, review inbox,
// journal lessons) instead of the empty 0/0/0 state — покрывает те же данные,
// что и DEMO_TEACHER_HOME (репетитор Дарья, химия/биология).

import type { Group, Student } from './teacherMockData'
import type { HardSub, HwAssignment } from '../lib/useHomework'
import type { GroupLesson, RosterStudent } from '../lib/useGroups'

// A demo id is anything we minted here — used to short-circuit DB writes.
export const isDemoId = (id: string | null | undefined) => !!id && id.startsWith('demo-')

const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const fmt = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

// ─── Groups ────────────────────────────────────────────────────────────────
const G = (
  id: string,
  name: string,
  subject: Group['subject'],
  icon: string,
  studentCount: number,
  extra: Partial<Group> = {},
): Group => ({
  id,
  name,
  subject,
  icon,
  level: extra.level ?? (subject === 'Химия' ? 'ЕГЭ' : 'ОГЭ'),
  color: extra.color ?? 'var(--color-purple)',
  colorSoft: extra.colorSoft ?? 'var(--color-purple-soft)',
  startDate: extra.startDate ?? iso(-120),
  studentCount,
  lessonsCompleted: extra.lessonsCompleted ?? 12,
  totalLessons: extra.totalLessons ?? 32,
  isIndividual: extra.isIndividual,
})

export const DEMO_GROUPS: Group[] = [
  G('demo-g-egeA', 'ЕГЭ-группа А', 'Химия', '⚗️', 6, {
    color: 'var(--color-teal)', colorSoft: 'var(--color-teal-pill-bg)', level: 'ЕГЭ',
  }),
  G('demo-g-ogeB', 'ОГЭ-группа Б', 'Химия', '🧪', 4, { level: 'ОГЭ' }),
  G('demo-g-bio', 'Биология · профиль', 'Биология', '🧬', 3, {
    color: 'var(--color-green)', colorSoft: 'var(--color-green-soft)', level: 'ЕГЭ',
  }),
  G('demo-g-artem', '1:1 Артём', 'Химия', '👤', 1, { isIndividual: true, level: 'ЕГЭ' }),
  G('demo-g-sonya', '1:1 Соня', 'Химия', '👤', 1, { isIndividual: true, level: 'ЕГЭ' }),
  G('demo-g-igor', '1:1 Игорь', 'Биология', '👤', 1, { isIndividual: true, level: 'ОГЭ' }),
]

// ─── Students (per group) ────────────────────────────────────────────────────
const St = (
  id: string,
  groupId: string,
  name: string,
  hwScore: number,
  testScore: number,
  attendance: number,
  extra: Partial<Student> = {},
): Student => ({
  id,
  groupId,
  name,
  phone: extra.phone ?? '+7 900 000-00-00',
  telegramLink: extra.telegramLink,
  startedAt: extra.startedAt ?? iso(-120),
  lastVisit: extra.lastVisit ?? fmt(-2),
  hwScore,
  testScore,
  trialScore: extra.trialScore ?? null,
  desiredScore: extra.desiredScore ?? 80,
  attendance,
  debt: extra.debt,
  isIndividual: extra.isIndividual,
  subject: extra.subject,
})

export const DEMO_STUDENTS_BY_GROUP: Record<string, Student[]> = {
  'demo-g-egeA': [
    St('demo-st-1', 'demo-g-egeA', 'Мария Ковалёва', 92, 88, 96, { telegramLink: 'https://t.me/masha', lastVisit: fmt(-1) }),
    St('demo-st-2', 'demo-g-egeA', 'Данил Орлов', 74, 71, 88),
    St('demo-st-3', 'demo-g-egeA', 'Полина Ершова', 85, 90, 100, { lastVisit: fmt(0) }),
    St('demo-st-4', 'demo-g-egeA', 'Кирилл Наумов', 61, 58, 72, { debt: 2400, lastVisit: fmt(-6) }),
    St('demo-st-5', 'demo-g-egeA', 'Вера Соловьёва', 79, 82, 91),
    St('demo-st-6', 'demo-g-egeA', 'Тимур Хайдаров', 88, 85, 95),
  ],
  'demo-g-ogeB': [
    St('demo-st-7', 'demo-g-ogeB', 'Аня Белова', 90, 84, 98, { telegramLink: 'https://vk.com/anya' }),
    St('demo-st-8', 'demo-g-ogeB', 'Егор Пантелеев', 66, 70, 80),
    St('demo-st-9', 'demo-g-ogeB', 'Лиза Громова', 81, 77, 93, { lastVisit: fmt(0) }),
    St('demo-st-10', 'demo-g-ogeB', 'Матвей Зуев', 55, 60, 68, { debt: 2400, lastVisit: fmt(-9) }),
  ],
  'demo-g-bio': [
    St('demo-st-11', 'demo-g-bio', 'Дарина Шах', 94, 91, 100, { subject: 'Биология' }),
    St('demo-st-12', 'demo-g-bio', 'Рома Титов', 72, 68, 84, { subject: 'Биология' }),
    St('demo-st-13', 'demo-g-bio', 'Ника Артемьева', 86, 89, 92, { subject: 'Биология', lastVisit: fmt(-1) }),
  ],
  'demo-g-artem': [
    St('demo-artem', 'demo-g-artem', 'Артём Романов', 48, 55, 70, {
      isIndividual: true, debt: 2400, lastVisit: fmt(-2), telegramLink: 'https://t.me/artem',
    }),
  ],
  'demo-g-sonya': [
    St('demo-sonya', 'demo-g-sonya', 'Соня Морозова', 63, 60, 88, {
      isIndividual: true, lastVisit: fmt(-1), telegramLink: 'https://t.me/sonya',
    }),
  ],
  'demo-g-igor': [
    St('demo-igor', 'demo-g-igor', 'Игорь Лебедев', 70, 66, 74, {
      isIndividual: true, subject: 'Биология', lastVisit: fmt(-5),
    }),
  ],
}

export const demoStudentsFor = (groupId: string): Student[] => DEMO_STUDENTS_BY_GROUP[groupId] ?? []

// ─── Review inbox ────────────────────────────────────────────────────────────
const HS = (
  id: string,
  studentId: string,
  studentName: string,
  lessonTitle: string,
  comment: string,
): HardSub => ({
  id,
  lessonRef: `${id}-hard`,
  baseRef: id,
  lessonTitle,
  studentId,
  studentName,
  score: 0,
  comment,
  reviewComment: '',
  status: 'submitted',
  updatedAt: new Date().toISOString(),
  attachments: { photos: [], board: null },
  reviewAttachments: { photos: [], board: null, annotation: null },
  isMultiTask: false,
  taskBlocks: [],
  reviewBlocks: [],
})

export const DEMO_HARD_SUBS: HardSub[] = [
  HS('demo-hs-1', 'demo-artem', 'Артём Романов', 'Электролиз растворов', 'Задание 34: рассчитал массу выделившегося металла — приложил решение на фото.'),
  HS('demo-hs-2', 'demo-sonya', 'Соня Морозова', 'Скорость реакции', 'Задание 32: цепочка превращений, три уравнения. Проверьте, пожалуйста.'),
]

export const DEMO_HW: HwAssignment[] = [
  {
    id: 'demo-hw-1',
    groupId: 'demo-g-egeA',
    groupName: 'ЕГЭ-группа А',
    icon: '⚗️',
    title: 'Электролиз · вариант 12',
    assignedAt: fmt(-3),
    dueDate: fmt(-1),
    submittedCount: 4,
    totalCount: 6,
    reviewedCount: 1,
    color: 'var(--color-teal)',
    status: 'active',
    isIndividual: false,
  },
]

// ─── Journal (group lessons + rosters) ───────────────────────────────────────
const GL = (
  id: string,
  groupId: string,
  scopeName: string,
  title: string,
  dayOffset: number,
  timeStart: string,
  lessonNumber: number,
): GroupLesson => ({
  id,
  date: iso(dayOffset),
  title,
  lessonNumber,
  timeStart,
  groupId,
  studentId: null,
  scopeName,
})

export const DEMO_GROUP_LESSONS_BY_GROUP: Record<string, GroupLesson[]> = {
  'demo-g-egeA': [
    GL('demo-l-e1', 'demo-g-egeA', 'ЕГЭ-группа А', 'Электролиз', 0, '17:00', 12),
    GL('demo-l-e2', 'demo-g-egeA', 'ЕГЭ-группа А', 'Гидролиз солей', -3, '17:00', 11),
    GL('demo-l-e3', 'demo-g-egeA', 'ЕГЭ-группа А', 'ОВР в органике', -7, '17:00', 10),
    GL('demo-l-e4', 'demo-g-egeA', 'ЕГЭ-группа А', 'Скорость реакции', 4, '17:00', 13),
  ],
  'demo-g-ogeB': [
    GL('demo-l-o1', 'demo-g-ogeB', 'ОГЭ-группа Б', 'Растворы и концентрация', 1, '15:00', 8),
    GL('demo-l-o2', 'demo-g-ogeB', 'ОГЭ-группа Б', 'Кислоты и основания', -4, '15:00', 7),
  ],
  'demo-g-bio': [
    GL('demo-l-b1', 'demo-g-bio', 'Биология · профиль', 'Фотосинтез', 2, '12:00', 9),
    GL('demo-l-b2', 'demo-g-bio', 'Биология · профиль', 'Клеточное дыхание', -5, '12:00', 8),
  ],
  'demo-g-artem': [
    GL('demo-l-a1', 'demo-g-artem', '1:1 Артём', 'Гидролиз солей', 0, '14:00', 12),
    GL('demo-l-a2', 'demo-g-artem', '1:1 Артём', 'Электролиз', -3, '14:00', 11),
  ],
  'demo-g-sonya': [
    GL('demo-l-s1', 'demo-g-sonya', '1:1 Соня', 'Скорости реакций', 0, '19:30', 10),
  ],
  'demo-g-igor': [
    GL('demo-l-i1', 'demo-g-igor', '1:1 Игорь', 'Строение клетки', 1, '16:00', 6),
  ],
}

export const demoLessonsFor = (groupId: string | null): GroupLesson[] =>
  groupId ? DEMO_GROUP_LESSONS_BY_GROUP[groupId] ?? [] : []

// Roster for a demo lesson = the demo students of its group.
export const demoRosterFor = (lesson: GroupLesson | null): RosterStudent[] => {
  if (!lesson || !isDemoId(lesson.id)) return []
  const students = lesson.groupId ? demoStudentsFor(lesson.groupId) : []
  return students.map(s => ({ id: s.id, name: s.name }))
}
