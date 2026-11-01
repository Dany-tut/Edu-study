import type { TrackLessonStatus } from '../../../../lib/lessonStatus'

export type DiaryCourseId = 'chem' | 'bio' | 'outside'
export type DiaryWork = {
  id: string
  course: DiaryCourseId
  number: number
  title: string
  status: TrackLessonStatus
  dueOffset: number | null
  student: string
  submittedOrder?: number
  score?: number
  comment?: string
}

// Deliberately local fixtures: the design stand never publishes work or reminders.
export const diaryCourses = [
  {
    id: 'chem' as const,
    title: 'Тыквенный спас',
    subject: 'Химия',
    kind: 'Интенсив',
    progress: 46,
    total: 7,
  },
  {
    id: 'bio' as const,
    title: 'ЕГЭ · годовой курс',
    subject: 'Биология',
    kind: 'Курс',
    progress: 32,
    total: 12,
  },
  {
    id: 'outside' as const,
    title: 'Вне курса',
    subject: 'Химия',
    kind: 'Отдельные ДЗ',
    progress: 0,
    total: 1,
  },
]
export const diaryWorks: DiaryWork[] = [
  {
    id: 'chem-4',
    course: 'chem',
    number: 4,
    title: 'Реакции ионного обмена',
    status: 'returned',
    dueOffset: -1,
    student: 'Артём Волков',
    comment: 'Проверь коэффициенты во втором уравнении. Остальное решено верно.',
  },
  {
    id: 'chem-5',
    course: 'chem',
    number: 5,
    title: 'Окислительно-восстановительные реакции',
    status: 'current',
    dueOffset: 0,
    student: 'Артём Волков',
  },
  {
    id: 'bio-9',
    course: 'bio',
    number: 9,
    title: 'Строение клетки',
    status: 'test_low',
    dueOffset: 1,
    student: 'Артём Волков',
    score: 60,
  },
  {
    id: 'bio-10',
    course: 'bio',
    number: 10,
    title: 'Клеточный цикл',
    status: 'submitted',
    dueOffset: -1,
    student: 'Артём Волков',
    submittedOrder: 2,
  },
  {
    id: 'chem-2',
    course: 'chem',
    number: 2,
    title: 'Количество вещества',
    status: 'test_passed',
    dueOffset: -4,
    student: 'Артём Волков',
    score: 94,
  },
  {
    id: 'outside-1',
    course: 'outside',
    number: 1,
    title: 'Практика: расстановка коэффициентов',
    status: 'current',
    dueOffset: null,
    student: 'Артём Волков',
  },
  {
    id: 'masha-2',
    course: 'chem',
    number: 2,
    title: 'Количество вещества',
    status: 'submitted',
    dueOffset: 0,
    student: 'Маша Лебедева',
    submittedOrder: 1,
  },
  {
    id: 'anna-9',
    course: 'bio',
    number: 9,
    title: 'Строение клетки',
    status: 'submitted',
    dueOffset: 1,
    student: 'Аня Смирнова',
    submittedOrder: 3,
  },
]

export const diaryStatusText = (work: DiaryWork) =>
  ({
    completed: 'Зачтено',
    test_passed: 'Зачтено',
    returned: 'На доработку',
    test_low: 'Ниже порога',
    submitted: 'На проверке',
    current: 'К выполнению',
    unviewed: 'Запись доступна',
    locked: 'Закрыто',
    today: 'Сегодня',
    submitted_unknown: 'Работа отправлена',
  })[work.status]
export const isDiaryAction = (work: DiaryWork) =>
  ['returned', 'current', 'test_low', 'unviewed'].includes(work.status)
export const isDiaryOverdue = (work: DiaryWork) =>
  work.dueOffset !== null && work.dueOffset < 0 && isDiaryAction(work)
export function diaryPriority(work: DiaryWork) {
  return isDiaryOverdue(work)
    ? 0
    : work.dueOffset === 0 && isDiaryAction(work)
      ? 1
      : work.status === 'returned'
        ? 2
        : work.status === 'test_low'
          ? 3
          : isDiaryAction(work)
            ? 4
            : 5
}
export function diaryDate(base: string, offset: number) {
  const date = new Date(base + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date
}
