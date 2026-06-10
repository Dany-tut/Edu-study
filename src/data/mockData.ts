export const student = {
  name: 'Сидни Суини',
  avatarUrl: null,
  stats: {
    performance: 70,
    completedTasks: 8,
    totalTasks: 12,
    avgScore: 64,
    streak: 5,
    // lessons (1199) + homework + quizzes + daily questions
    totalPoints: 1840,
  },
}

export type LessonStatus = 'completed' | 'returned' | 'unviewed' | 'submitted' | 'current' | 'locked'
export type LessonShape = 'circle' | 'square' | 'diamond'

export interface Lesson {
  id: string
  title: string
  number: number
  status: LessonStatus
  shape: LessonShape
  points?: number
  comment?: string
  subject: string
}

export interface Module {
  id: number
  label: string
  lessons: Lesson[]
}

export interface Subject {
  id: string
  name: string
  progress: number
  modules: Module[]
  activeModuleId: number
}

export const subjects: Subject[] = [
  {
    id: 'chemistry',
    name: 'Химия',
    progress: 34,
    activeModuleId: 3,
    modules: [
      {
        id: 1,
        label: 'Модуль 1',
        lessons: [
          { id: 'c1-1', title: 'Введение в химию', number: 1, status: 'completed', shape: 'circle', points: 90, subject: 'chemistry' },
          { id: 'c1-2', title: 'Периодическая таблица', number: 2, status: 'completed', shape: 'circle', points: 85, subject: 'chemistry' },
          { id: 'c1-3', title: 'Химические связи', number: 3, status: 'completed', shape: 'square', points: 78, subject: 'chemistry' },
          { id: 'c1-4', title: 'Атомы и молекулы', number: 4, status: 'completed', shape: 'circle', points: 88, subject: 'chemistry' },
          { id: 'c1-5', title: 'Изотопы', number: 5, status: 'completed', shape: 'circle', points: 82, subject: 'chemistry' },
          { id: 'c1-6', title: 'Валентность', number: 6, status: 'completed', shape: 'circle', points: 91, subject: 'chemistry' },
          { id: 'c1-7', title: 'Моль и молярная масса', number: 7, status: 'completed', shape: 'square', points: 76, subject: 'chemistry' },
          { id: 'c1-8', title: 'Закон Авогадро', number: 8, status: 'completed', shape: 'circle', points: 84, subject: 'chemistry' },
          { id: 'c1-9', title: 'Практикум', number: 9, status: 'completed', shape: 'square', points: 80, subject: 'chemistry' },
          { id: 'c1-10', title: 'Итоговый тест', number: 10, status: 'completed', shape: 'diamond', points: 95, subject: 'chemistry' },
        ],
      },
      {
        id: 2,
        label: 'Модуль 2',
        lessons: [
          { id: 'c2-1', title: 'Растворы и смеси', number: 4, status: 'completed', shape: 'circle', points: 92, subject: 'chemistry' },
          { id: 'c2-2', title: 'Реакции окисления', number: 5, status: 'completed', shape: 'circle', points: 78, subject: 'chemistry' },
          { id: 'c2-3', title: 'Контрольная работа', number: 6, status: 'completed', shape: 'square', points: 83, subject: 'chemistry' },
          { id: 'c2-4', title: 'Скорость реакций', number: 7, status: 'completed', shape: 'circle', points: 87, subject: 'chemistry' },
          { id: 'c2-5', title: 'Химическое равновесие', number: 8, status: 'completed', shape: 'circle', points: 85, subject: 'chemistry' },
          { id: 'c2-6', title: 'Катализаторы', number: 9, status: 'completed', shape: 'circle', points: 81, subject: 'chemistry' },
          { id: 'c2-7', title: 'Практикум', number: 10, status: 'completed', shape: 'square', points: 89, subject: 'chemistry' },
          { id: 'c2-8', title: 'Итоговый тест модуля', number: 11, status: 'completed', shape: 'diamond', points: 94, subject: 'chemistry' },
        ],
      },
      {
        id: 3,
        label: 'Модуль 3',
        lessons: [
          { id: 'c3-1', title: 'Строение атома', number: 7, status: 'completed', shape: 'circle', points: 82, subject: 'chemistry' },
          { id: 'c3-2', title: 'Электронные оболочки', number: 8, status: 'completed', shape: 'circle', points: 74, subject: 'chemistry' },
          { id: 'c3-3', title: 'Электролиты', number: 9, status: 'completed', shape: 'circle', points: 88, subject: 'chemistry' },
          { id: 'c3-4', title: 'Самостоятельная работа', number: 10, status: 'completed', shape: 'square', points: 79, subject: 'chemistry' },
          { id: 'c3-5', title: 'Кислоты и основания', number: 11, status: 'completed', shape: 'circle', points: 91, subject: 'chemistry' },
          { id: 'c3-5b', title: 'Реакции нейтрализации', number: 12, status: 'submitted', shape: 'circle', points: 60, subject: 'chemistry' },
          { id: 'c3-6', title: 'Соли', number: 13, status: 'current', shape: 'circle', subject: 'chemistry' },
          { id: 'c3-7', title: 'Гидролиз', number: 14, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c3-8', title: 'Практикум', number: 15, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c3-9', title: 'Итоговый тест', number: 16, status: 'locked', shape: 'diamond', subject: 'chemistry' },
        ],
      },
      {
        id: 4,
        label: 'Модуль 4',
        lessons: [
          { id: 'c4-1', title: 'Органическая химия', number: 17, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-2', title: 'Углеводороды', number: 18, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-3', title: 'Алканы', number: 19, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-4', title: 'Алкены', number: 20, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-5', title: 'Алкины', number: 21, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-6', title: 'Самостоятельная работа', number: 22, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c4-7', title: 'Спирты', number: 23, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-8', title: 'Альдегиды', number: 24, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-9', title: 'Карбоновые кислоты', number: 25, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-10', title: 'Сложные эфиры', number: 26, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-11', title: 'Практикум', number: 27, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c4-12', title: 'Углеводы', number: 28, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-13', title: 'Белки', number: 29, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-14', title: 'Полимеры', number: 30, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c4-15', title: 'Итоговый тест', number: 31, status: 'locked', shape: 'diamond', subject: 'chemistry' },
        ],
      },
      {
        id: 5,
        label: 'Модуль 5',
        lessons: [
          { id: 'c5-1', title: 'Скорость реакции', number: 32, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-2', title: 'Химическое равновесие', number: 33, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-3', title: 'Катализаторы', number: 34, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-4', title: 'Окисление и восстановление', number: 35, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-5', title: 'Электролиз', number: 36, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-6', title: 'Самостоятельная работа', number: 37, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c5-7', title: 'Металлы', number: 38, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-8', title: 'Щелочные металлы', number: 39, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-9', title: 'Щелочноземельные металлы', number: 40, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-10', title: 'Алюминий', number: 41, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-11', title: 'Железо', number: 42, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-12', title: 'Практикум', number: 43, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c5-13', title: 'Неметаллы', number: 44, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-14', title: 'Галогены', number: 45, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-15', title: 'Сера', number: 46, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-16', title: 'Азот и фосфор', number: 47, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-17', title: 'Углерод и кремний', number: 48, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-18', title: 'Самостоятельная работа', number: 49, status: 'locked', shape: 'square', subject: 'chemistry' },
          { id: 'c5-19', title: 'Газовые законы', number: 50, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-20', title: 'Растворы', number: 51, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-21', title: 'Коллоидные системы', number: 52, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-22', title: 'Обобщение курса', number: 53, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'c5-23', title: 'Итоговый экзамен', number: 54, status: 'locked', shape: 'diamond', subject: 'chemistry' },
        ],
      },
    ],
  },
  {
    id: 'biology',
    name: 'Биология',
    progress: 21,
    activeModuleId: 2,
    modules: [
      {
        id: 1,
        label: 'Модуль 1',
        lessons: [
          { id: 'b1-1', title: 'Введение в биологию', number: 1, status: 'completed', shape: 'circle', points: 92, subject: 'biology' },
          { id: 'b1-2', title: 'Методы изучения живой природы', number: 2, status: 'completed', shape: 'circle', points: 85, subject: 'biology' },
          { id: 'b1-3', title: 'Клетка — основа жизни', number: 3, status: 'completed', shape: 'circle', points: 88, subject: 'biology' },
          { id: 'b1-4', title: 'Строение клетки', number: 4, status: 'completed', shape: 'circle', points: 80, subject: 'biology' },
          { id: 'b1-5', title: 'Органоиды клетки', number: 5, status: 'completed', shape: 'circle', points: 83, subject: 'biology' },
          { id: 'b1-6', title: 'Митоз и мейоз', number: 6, status: 'completed', shape: 'square', points: 78, subject: 'biology' },
          { id: 'b1-7', title: 'Обмен веществ', number: 7, status: 'completed', shape: 'circle', points: 86, subject: 'biology' },
          { id: 'b1-8', title: 'Фотосинтез', number: 8, status: 'completed', shape: 'circle', points: 75, subject: 'biology' },
          { id: 'b1-9', title: 'Клеточное дыхание', number: 9, status: 'completed', shape: 'circle', points: 81, subject: 'biology' },
          { id: 'b1-10', title: 'Практикум: микроскопия', number: 10, status: 'completed', shape: 'square', points: 90, subject: 'biology' },
          { id: 'b1-11', title: 'Ткани и органы растений', number: 11, status: 'completed', shape: 'circle', points: 84, subject: 'biology' },
          { id: 'b1-12', title: 'Итоговый тест', number: 12, status: 'completed', shape: 'diamond', points: 87, subject: 'biology' },
        ],
      },
      {
        id: 2,
        label: 'Модуль 2',
        lessons: [
          { id: 'b2-1', title: 'Корень и побег', number: 13, status: 'completed', shape: 'circle', points: 79, subject: 'biology' },
          { id: 'b2-2', title: 'Лист — строение и функции', number: 14, status: 'completed', shape: 'circle', points: 82, subject: 'biology' },
          { id: 'b2-3', title: 'Цветок и плод', number: 15, status: 'returned', shape: 'circle', points: 42, comment: 'Перепроверь схему опыления', subject: 'biology' },
          { id: 'b2-4', title: 'Размножение растений', number: 16, status: 'submitted', shape: 'circle', points: 58, subject: 'biology' },
          { id: 'b2-5', title: 'Двудольные растения', number: 17, status: 'unviewed', shape: 'square', subject: 'biology' },
          { id: 'b2-6', title: 'Экология', number: 18, status: 'current', shape: 'circle', subject: 'biology' },
          { id: 'b2-7', title: 'Биогеоценозы', number: 19, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b2-8', title: 'Пищевые цепи', number: 20, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b2-9', title: 'Контрольная', number: 21, status: 'locked', shape: 'square', subject: 'biology' },
          { id: 'b2-10', title: 'Итоговый тест модуля', number: 22, status: 'locked', shape: 'diamond', subject: 'biology' },
        ],
      },
      {
        id: 3,
        label: 'Модуль 3',
        lessons: [
          { id: 'b3-1', title: 'Введение в генетику', number: 23, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-2', title: 'Законы Менделя', number: 24, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-3', title: 'Хромосомная теория', number: 25, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-4', title: 'ДНК и РНК', number: 26, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-5', title: 'Биосинтез белка', number: 27, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-6', title: 'Мутации', number: 28, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-7', title: 'Самостоятельная работа', number: 29, status: 'locked', shape: 'square', subject: 'biology' },
          { id: 'b3-8', title: 'Селекция растений и животных', number: 30, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-9', title: 'Генетика человека', number: 31, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b3-10', title: 'Практикум: задачи по генетике', number: 32, status: 'locked', shape: 'square', subject: 'biology' },
          { id: 'b3-11', title: 'Итоговый тест', number: 33, status: 'locked', shape: 'diamond', subject: 'biology' },
        ],
      },
      {
        id: 4,
        label: 'Модуль 4',
        lessons: [
          { id: 'b4-1', title: 'Эволюционная теория Дарвина', number: 34, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-2', title: 'Движущие силы эволюции', number: 35, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-3', title: 'Естественный отбор', number: 36, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-4', title: 'Видообразование', number: 37, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-5', title: 'Происхождение жизни', number: 38, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-6', title: 'Происхождение человека', number: 39, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-7', title: 'Антропогенез', number: 40, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-8', title: 'Биосфера', number: 41, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-9', title: 'Учение Вернадского', number: 42, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b4-10', title: 'Самостоятельная работа', number: 43, status: 'locked', shape: 'square', subject: 'biology' },
          { id: 'b4-11', title: 'Итоговый тест', number: 44, status: 'locked', shape: 'diamond', subject: 'biology' },
        ],
      },
      {
        id: 5,
        label: 'Модуль 5',
        lessons: [
          { id: 'b5-1', title: 'Анатомия человека: введение', number: 45, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-2', title: 'Опорно-двигательная система', number: 46, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-3', title: 'Кровь и кровообращение', number: 47, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-4', title: 'Дыхательная система', number: 48, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-5', title: 'Пищеварение', number: 49, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-6', title: 'Выделительная система', number: 50, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-7', title: 'Нервная система', number: 51, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-8', title: 'Органы чувств', number: 52, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-9', title: 'Эндокринная система', number: 53, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-10', title: 'Иммунитет', number: 54, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-11', title: 'Размножение и развитие человека', number: 55, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-12', title: 'Практикум', number: 56, status: 'locked', shape: 'square', subject: 'biology' },
          { id: 'b5-13', title: 'Обобщение курса', number: 57, status: 'locked', shape: 'circle', subject: 'biology' },
          { id: 'b5-14', title: 'Итоговый экзамен', number: 58, status: 'locked', shape: 'diamond', subject: 'biology' },
        ],
      },
    ],
  },
]

export type ScheduleLesson = {
  id: string
  subject: string
  lessonTitle: string
  lessonNumber: number
  time: string
  upcoming?: boolean
  minutesUntil?: number
  passed?: boolean
}

export type ScheduleDay = {
  date: string
  label: string
  isToday: boolean
  lessons: ScheduleLesson[]
}

// Lesson numbers and titles here mirror the catalogue so the schedule, track,
// and Courses page agree on what's already done vs. still ahead.
const scheduleLessonsByOffset: Record<number, ScheduleLesson[]> = {
  [-3]: [
    { id: 'sm3-1', subject: 'Биология', lessonTitle: 'Клеточное дыхание', lessonNumber: 9, time: '11:00', passed: true },
  ],
  [-2]: [
    { id: 'sm2-1', subject: 'Биология', lessonTitle: 'Практикум: микроскопия', lessonNumber: 10, time: '11:00', passed: true },
    { id: 'sm2-2', subject: 'Химия', lessonTitle: 'Электронные оболочки', lessonNumber: 8, time: '15:00', passed: true },
  ],
  [-1]: [
    { id: 'sm1-1', subject: 'Биология', lessonTitle: 'Ткани и органы растений', lessonNumber: 11, time: '12:30', passed: true },
    { id: 'sm1-2', subject: 'Химия', lessonTitle: 'Электролиты', lessonNumber: 9, time: '15:00', passed: true },
  ],
  0: [
    { id: 's0-1', subject: 'Биология', lessonTitle: 'Экология', lessonNumber: 18, time: '12:30', upcoming: true, minutesUntil: 30 },
    { id: 's0-2', subject: 'Химия', lessonTitle: 'Соли', lessonNumber: 13, time: '15:00', minutesUntil: 180 },
  ],
  1: [
    { id: 's1-1', subject: 'Биология', lessonTitle: 'Биогеоценозы', lessonNumber: 19, time: '12:30' },
    { id: 's1-2', subject: 'Химия', lessonTitle: 'Гидролиз', lessonNumber: 14, time: '15:00' },
  ],
  3: [
    { id: 's3-1', subject: 'Химия', lessonTitle: 'Практикум', lessonNumber: 15, time: '16:00' },
  ],
}

const scheduleLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
})

const pad2 = (n: number) => String(n).padStart(2, '0')

const buildScheduleDay = (offset: number): ScheduleDay => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)

  return {
    // Local YYYY-MM-DD — toISOString() shifts to UTC and breaks downstream
    // time math in non-UTC zones.
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    label: scheduleLabelFormatter.format(date),
    isToday: offset === 0,
    lessons: scheduleLessonsByOffset[offset] ?? [],
  }
}

export const scheduleDays: ScheduleDay[] = Array.from({ length: 10 }, (_, i) => buildScheduleDay(i - 3))
export const scheduleTodayIndex = scheduleDays.findIndex(day => day.isToday)

// Map a Russian subject name (as used in the schedule) to a catalogue subject id.
const subjectNameToId: Record<string, string> = Object.fromEntries(
  subjects.map(s => [s.name.toLowerCase(), s.id]),
)

/**
 * Resolve a scheduled lesson to the catalogue lesson it represents, so the
 * schedule card can open the right lesson. Matches by subject + a loose title
 * overlap (schedule titles are often longer than the catalogue title). Returns
 * the lesson plus its subject id; the lesson is null when nothing matches but
 * the subject is still useful for opening the catalogue on the right tab.
 */
export function resolveScheduleLesson(s: ScheduleLesson): { subjectId: string | null; lesson: Lesson | null } {
  const subjectId = subjectNameToId[s.subject.toLowerCase()] ?? null
  const subject = subjects.find(su => su.id === subjectId)
  if (!subject) return { subjectId, lesson: null }

  const want = s.lessonTitle.toLowerCase()
  const all = subject.modules.flatMap(m => m.lessons)
  const match = all.find(l => {
    const t = l.title.toLowerCase()
    return want.includes(t) || t.includes(want)
  })
  return { subjectId, lesson: match ?? null }
}

/**
 * Locate a chemistry lesson by its title (case-insensitive). Used by the
 * reactions widget to jump the student to the lesson where the reaction is
 * studied. Returns the lesson plus the module that owns it, or null when the
 * title doesn't match anything in the catalogue.
 */
export function findChemistryLessonByTitle(title: string): { lesson: Lesson; moduleId: number } | null {
  const subject = subjects.find(s => s.id === 'chemistry')
  if (!subject) return null
  const want = title.trim().toLowerCase()
  for (const m of subject.modules) {
    const lesson = m.lessons.find(l => l.title.toLowerCase() === want)
    if (lesson) return { lesson, moduleId: m.id }
  }
  // Fall back to loose match (e.g. "Органические молекулы" vs "Органическая химия").
  for (const m of subject.modules) {
    const lesson = m.lessons.find(l => {
      const t = l.title.toLowerCase()
      return t.includes(want) || want.includes(t)
    })
    if (lesson) return { lesson, moduleId: m.id }
  }
  return null
}

export interface ScienceFact {
  id: string
  subject: 'Химия' | 'Биология'
  emoji: string
  text: string
  /** background gradient for the photo tile (fallback + tint) */
  gradient: string
  /** topical photo, layered over the gradient; gradient shows if it fails */
  image: string
}

export const scienceFacts: ScienceFact[] = [
  {
    id: 'f1',
    subject: 'Химия',
    emoji: '💧',
    text: 'В одной капле воды около 1,7 триллиона молекул — больше, чем секунд прошло с момента образования Земли.',
    gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)',
    image: 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f2',
    subject: 'Биология',
    emoji: '🧬',
    text: 'Если растянуть всю ДНК из одной клетки, получится нить около 2 метров. А вся ДНК тела протянулась бы до Солнца сотни раз.',
    gradient: 'linear-gradient(135deg, #B98BFF, #6B3FD6)',
    image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f3',
    subject: 'Химия',
    emoji: '🎈',
    text: 'Гелий — единственный элемент, который нельзя превратить в твёрдое тело при обычном давлении, даже охладив почти до абсолютного нуля.',
    gradient: 'linear-gradient(135deg, #FFB36E, #E8602D)',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f4',
    subject: 'Биология',
    emoji: '🐻',
    text: 'Тихоходки выживают в открытом космосе: при −272 °C, в вакууме и под радиацией, смертельной для человека.',
    gradient: 'linear-gradient(135deg, #6EE7A0, #1E9E63)',
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f5',
    subject: 'Химия',
    emoji: '✨',
    text: 'В теле человека примерно 0,2 мг золота — в основном в крови. А почти все атомы тяжелее железа родились во взрывах звёзд.',
    gradient: 'linear-gradient(135deg, #FFD86E, #E0A52D)',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f6',
    subject: 'Химия',
    emoji: '💎',
    text: 'Алмаз и графит состоят из одного и того же — чистого углерода. Разница лишь в том, как соединены атомы.',
    gradient: 'linear-gradient(135deg, #7FE3F0, #2D9AB8)',
    image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f7',
    subject: 'Биология',
    emoji: '🐙',
    text: 'У осьминога три сердца и голубая кровь: кислород в ней переносит медь, а не железо, как у нас.',
    gradient: 'linear-gradient(135deg, #8FA8FF, #4B5BD6)',
    image: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f8',
    subject: 'Химия',
    emoji: '🔥',
    text: 'Чистый кислород сам по себе не горит — он лишь поддерживает горение. Пламя даёт то, что в нём окисляется.',
    gradient: 'linear-gradient(135deg, #FF9A6E, #E0452D)',
    image: 'https://images.unsplash.com/photo-1486889399713-4b2cf9c08c8a?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f9',
    subject: 'Биология',
    emoji: '🍄',
    text: 'Самый большой живой организм на Земле — грибница опёнка в штате Орегон: она тянется почти на 10 км².',
    gradient: 'linear-gradient(135deg, #8FE06E, #2D9A45)',
    image: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=480&q=70&auto=format&fit=crop',
  },
  {
    id: 'f10',
    subject: 'Химия',
    emoji: '🪟',
    text: 'Стекло — аморфное вещество без кристаллической решётки: у него нет точной температуры плавления, при нагреве оно плавно размягчается.',
    gradient: 'linear-gradient(135deg, #FFC76E, #E0852D)',
    image: 'https://images.unsplash.com/photo-1547239013-0d2b6c6a1c6e?w=480&q=70&auto=format&fit=crop',
  },
]

/** seconds each science fact is shown before auto-advancing */
export const scienceFactInterval = 20

export interface ScienceMeme {
  id: string
  subject: 'Химия' | 'Биология'
  emoji: string
  /** the lead-in line, shown small and muted above the punchline */
  setup: string
  /** the punchline, shown large and bold */
  punchline: string
  /** background gradient for the emoji tile */
  gradient: string
}

export const scienceMemes: ScienceMeme[] = [
  {
    id: 'm1',
    subject: 'Химия',
    emoji: '🧂',
    setup: 'Хочешь анекдот про натрий?',
    punchline: 'Na.',
    gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)',
  },
  {
    id: 'm2',
    subject: 'Биология',
    emoji: '⚡',
    setup: 'Откуда клетка берёт столько энергии?',
    punchline: 'Митохондрия — электростанция клетки!',
    gradient: 'linear-gradient(135deg, #B98BFF, #6B3FD6)',
  },
  {
    id: 'm3',
    subject: 'Химия',
    emoji: '😍',
    setup: 'Что сказал кислород, влюбившись в магний?',
    punchline: 'OMg!',
    gradient: 'linear-gradient(135deg, #FFB36E, #E8602D)',
  },
  {
    id: 'm4',
    subject: 'Биология',
    emoji: '🔬',
    setup: 'Почему клетке было одиноко на вечеринке?',
    punchline: 'Не с кем поделиться — пришлось делиться надвое.',
    gradient: 'linear-gradient(135deg, #6EE7A0, #1E9E63)',
  },
  {
    id: 'm5',
    subject: 'Химия',
    emoji: '✨',
    setup: 'Спросил у золота, как настроение. Молчит.',
    punchline: 'Ну и Au с ним.',
    gradient: 'linear-gradient(135deg, #FFD86E, #E0A52D)',
  },
  {
    id: 'm6',
    subject: 'Химия',
    emoji: '😶',
    setup: 'Можно пошутить про инертные газы?',
    punchline: 'Бесполезно — они не реагируют.',
    gradient: 'linear-gradient(135deg, #FF8FB1, #E0457B)',
  },
  {
    id: 'm7',
    subject: 'Биология',
    emoji: '🧫',
    setup: 'Почему из бактерий плохие рассказчики?',
    punchline: 'Только начнут — и сразу делятся.',
    gradient: 'linear-gradient(135deg, #6EE7D8, #1E9E8E)',
  },
  {
    id: 'm8',
    subject: 'Химия',
    emoji: '🥲',
    setup: 'Хотел рассказать шутку про газы…',
    punchline: 'Но она слишком летучая.',
    gradient: 'linear-gradient(135deg, #9AA6FF, #4B5BD6)',
  },
  {
    id: 'm9',
    subject: 'Биология',
    emoji: '🌿',
    setup: 'Что растение сказало солнцу?',
    punchline: 'Без тебя я просто зачахну.',
    gradient: 'linear-gradient(135deg, #B6E86E, #6FA52D)',
  },
  {
    id: 'm10',
    subject: 'Химия',
    emoji: '🔗',
    setup: 'Почему углерод такой популярный?',
    punchline: 'Он со всеми связывается.',
    gradient: 'linear-gradient(135deg, #6ED9FF, #2D9AE0)',
  },
]

/** seconds each meme is shown before auto-advancing */
export const scienceMemeInterval = 16

export interface CourseReaction {
  id: string
  /** balanced equation, using unicode subscripts and arrows */
  equation: string
  /** human-friendly name of the reaction type */
  name: string
  /** the course lesson where this reaction is studied */
  lesson: string
  /** module number on the course track */
  module: number
  emoji: string
  /** background gradient for the emoji tile */
  gradient: string
  /** the actual paragraph from the lesson text that introduces this reaction.
     Shown highlighted in the lesson reader when the student opens the reaction
     from the dashboard widget. */
  paragraph: string
}

/** Reactions students will work through over the chemistry course, ordered
   roughly by when they appear on the track. */
export const courseReactions: CourseReaction[] = [
  {
    id: 'r1',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    name: 'Металл + кислота',
    lesson: 'Электролиты',
    module: 3,
    emoji: '🫧',
    gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)',
    paragraph: 'Классический пример реакции металла с кислотой — взаимодействие цинка с соляной кислотой: Zn + 2HCl → ZnCl₂ + H₂↑. Пузырьки на поверхности гранулы — это водород, а в растворе остаётся хорошо растворимый сильный электролит, хлорид цинка.',
  },
  {
    id: 'r2',
    equation: 'HCl + NaOH → NaCl + H₂O',
    name: 'Нейтрализация',
    lesson: 'Кислоты и основания',
    module: 3,
    emoji: '⚗️',
    gradient: 'linear-gradient(135deg, #B98BFF, #6B3FD6)',
    paragraph: 'Реакция нейтрализации сильной кислоты сильным основанием идёт практически до конца: HCl + NaOH → NaCl + H₂O. Среда раствора становится нейтральной (pH ≈ 7), а единственный продукт помимо воды — обычная поваренная соль.',
  },
  {
    id: 'r3',
    equation: 'CaO + H₂O → Ca(OH)₂',
    name: 'Гашение извести',
    lesson: 'Соли',
    module: 3,
    emoji: '🌋',
    gradient: 'linear-gradient(135deg, #FFB36E, #E8602D)',
    paragraph: 'Гашение извести — экзотермическая реакция оксида кальция с водой: CaO + H₂O → Ca(OH)₂. На стройке её используют для приготовления известкового раствора, а выделяющееся тепло обязательно учитывают в технике безопасности.',
  },
  {
    id: 'r4',
    equation: '4Fe + 3O₂ → 2Fe₂O₃',
    name: 'Окисление (ржавление)',
    lesson: 'Реакции окисления',
    module: 2,
    emoji: '🔩',
    gradient: 'linear-gradient(135deg, #E8A06E, #B5532D)',
    paragraph: 'Окисление железа кислородом воздуха — наглядный пример медленной реакции окисления: 4Fe + 3O₂ → 2Fe₂O₃. Именно так в природе образуется ржавчина, постепенно разрушающая металлические конструкции.',
  },
  {
    id: 'r5',
    equation: '2H₂O₂ → 2H₂O + O₂↑',
    name: 'Разложение с катализатором',
    lesson: 'Катализаторы',
    module: 5,
    emoji: '🧪',
    gradient: 'linear-gradient(135deg, #6EE7A0, #1E9E63)',
    paragraph: 'Разложение пероксида водорода легко наблюдать в школьной лаборатории: 2H₂O₂ → 2H₂O + O₂↑. Без катализатора реакция идёт медленно, но капля раствора MnO₂ или фермента каталазы резко ускоряет выделение кислорода — сам катализатор при этом не расходуется.',
  },
  {
    id: 'r6',
    equation: 'N₂ + 3H₂ ⇌ 2NH₃',
    name: 'Синтез аммиака (равновесие)',
    lesson: 'Химическое равновесие',
    module: 5,
    emoji: '⚖️',
    gradient: 'linear-gradient(135deg, #8FA8FF, #4B5BD6)',
    paragraph: 'Промышленный синтез аммиака — обратимая реакция, протекающая с установлением химического равновесия: N₂ + 3H₂ ⇌ 2NH₃. Высокое давление и катализатор смещают равновесие в сторону продукта, а температуру подбирают как компромисс между скоростью реакции и выходом.',
  },
  {
    id: 'r7',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    name: 'Горение метана',
    lesson: 'Углеводороды',
    module: 4,
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #FF9A6E, #E0452D)',
    paragraph: 'Горение метана — типичная реакция полного окисления углеводорода: CH₄ + 2O₂ → CO₂ + 2H₂O. Именно она протекает в газовой плите и в бытовом котле, а её тепловой эффект используют как меру теплоты сгорания топлива.',
  },
  {
    id: 'r8',
    equation: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O',
    name: 'Этерификация',
    lesson: 'Сложные эфиры',
    module: 4,
    emoji: '🍏',
    gradient: 'linear-gradient(135deg, #8FE06E, #2D9A45)',
    paragraph: 'Этерификация — обратимое взаимодействие карбоновой кислоты со спиртом в присутствии концентрированной серной кислоты: CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O. Полученный этилацетат — приятно пахнущий эфир, широко используемый как растворитель и пищевая ароматическая добавка.',
  },
  {
    id: 'r9',
    equation: '2H₂O →(эл. ток) 2H₂↑ + O₂↑',
    name: 'Электролиз воды',
    lesson: 'Электролиз',
    module: 5,
    emoji: '⚡',
    gradient: 'linear-gradient(135deg, #FFD86E, #E0A52D)',
    paragraph: 'Электролиз воды — наглядный способ разложить молекулу под действием постоянного тока: 2H₂O →(эл. ток) 2H₂↑ + O₂↑. На катоде выделяется вдвое больший объём водорода, чем кислорода на аноде, что прямо следует из стехиометрии уравнения.',
  },
  {
    id: 'r10',
    equation: '6CO₂ + 6H₂O →(свет) C₆H₁₂O₆ + 6O₂',
    name: 'Фотосинтез',
    lesson: 'Органическая химия',
    module: 4,
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #7FE3F0, #2D9AB8)',
    paragraph: 'Фотосинтез — главная биохимическая реакция, благодаря которой растения создают органические вещества: 6CO₂ + 6H₂O →(свет) C₆H₁₂O₆ + 6O₂. Энергию для неё поставляет солнечный свет, поглощённый хлорофиллом, а побочный продукт — кислород, которым мы дышим.',
  },
  {
    id: 'r11',
    equation: 'CH₃COONa + H₂O ⇌ CH₃COOH + NaOH',
    name: 'Гидролиз соли',
    lesson: 'Гидролиз',
    module: 3,
    emoji: '💦',
    gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)',
    paragraph: 'Соль, образованная сильным основанием и слабой кислотой, в водном растворе подвергается гидролизу: CH₃COONa + H₂O ⇌ CH₃COOH + NaOH. Среда становится слабощелочной — это легко проверить индикатором.',
  },
  {
    id: 'r12',
    equation: 'C₂H₄ + H₂ → C₂H₆',
    name: 'Гидрирование этилена',
    lesson: 'Алкены',
    module: 4,
    emoji: '🌱',
    gradient: 'linear-gradient(135deg, #8FE06E, #2D9A45)',
    paragraph: 'Алкены легко присоединяют водород по двойной связи в присутствии никелевого катализатора: C₂H₄ + H₂ → C₂H₆. Так из этилена получают этан — классический пример реакции гидрирования непредельных углеводородов.',
  },
  {
    id: 'r13',
    equation: '2C₂H₂ + 5O₂ → 4CO₂ + 2H₂O',
    name: 'Горение ацетилена',
    lesson: 'Алкины',
    module: 4,
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #FF9A6E, #E0452D)',
    paragraph: 'Горение ацетилена сопровождается ярким пламенем с очень высокой температурой: 2C₂H₂ + 5O₂ → 4CO₂ + 2H₂O. Именно благодаря этой реакции ацетилен используют в кислородной сварке металлов.',
  },
  {
    id: 'r14',
    equation: 'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O',
    name: 'Горение этанола',
    lesson: 'Спирты',
    module: 4,
    emoji: '🍷',
    gradient: 'linear-gradient(135deg, #B98BFF, #6B3FD6)',
    paragraph: 'Этиловый спирт полностью сгорает в кислороде с образованием углекислого газа и воды: C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O. Высокая теплота сгорания делает этанол перспективным компонентом топлива для двигателей внутреннего сгорания.',
  },
  {
    id: 'r15',
    equation: '2CH₃CHO + O₂ → 2CH₃COOH',
    name: 'Окисление альдегида',
    lesson: 'Альдегиды',
    module: 4,
    emoji: '⚗️',
    gradient: 'linear-gradient(135deg, #7FE3F0, #2D9AB8)',
    paragraph: 'Альдегиды легко окисляются кислородом воздуха в соответствующие карбоновые кислоты: 2CH₃CHO + O₂ → 2CH₃COOH. Это превращение лежит в основе промышленного получения уксусной кислоты.',
  },
  {
    id: 'r16',
    equation: '2CH₃COOH + Mg → (CH₃COO)₂Mg + H₂↑',
    name: 'Кислота + металл',
    lesson: 'Карбоновые кислоты',
    module: 4,
    emoji: '🫧',
    gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)',
    paragraph: 'Уксусная кислота, как и неорганические кислоты, реагирует с активными металлами с выделением водорода: 2CH₃COOH + Mg → (CH₃COO)₂Mg + H₂↑. Образуется растворимая соль — ацетат магния.',
  },
  {
    id: 'r17',
    equation: 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂↑',
    name: 'Спиртовое брожение',
    lesson: 'Углеводы',
    module: 4,
    emoji: '🍞',
    gradient: 'linear-gradient(135deg, #FFC76E, #E0852D)',
    paragraph: 'Под действием ферментов дрожжей глюкоза превращается в этанол и углекислый газ: C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂↑. Эту реакцию — спиртовое брожение — человечество использует тысячелетиями в пищевой промышленности.',
  },
  {
    id: 'r18',
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu',
    name: 'Вытеснение меди',
    lesson: 'Металлы',
    module: 5,
    emoji: '🔩',
    gradient: 'linear-gradient(135deg, #E8A06E, #B5532D)',
    paragraph: 'Более активный металл вытесняет менее активный из раствора его соли: Fe + CuSO₄ → FeSO₄ + Cu. На железном гвозде, опущенном в раствор медного купороса, быстро появляется красноватый налёт восстановленной меди.',
  },
  {
    id: 'r19',
    equation: '2Na + 2H₂O → 2NaOH + H₂↑',
    name: 'Натрий + вода',
    lesson: 'Щелочные металлы',
    module: 5,
    emoji: '💥',
    gradient: 'linear-gradient(135deg, #FFD86E, #E0A52D)',
    paragraph: 'Щелочные металлы крайне активно реагируют с водой: 2Na + 2H₂O → 2NaOH + H₂↑. Кусочек натрия плавится от выделяющегося тепла и бегает по поверхности воды, оставляя щёлочь — поэтому хранят его под слоем керосина.',
  },
  {
    id: 'r20',
    equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
    name: 'Качественная реакция на хлорид',
    lesson: 'Растворы и смеси',
    module: 2,
    emoji: '🧫',
    gradient: 'linear-gradient(135deg, #8FA8FF, #4B5BD6)',
    paragraph: 'Качественная реакция на хлорид-ион — добавление нитрата серебра, в результате выпадает белый творожистый осадок: AgNO₃ + NaCl → AgCl↓ + NaNO₃. Так в лаборатории быстро отличают раствор поваренной соли от других смесей.',
  },
]

/** seconds each reaction is shown before auto-advancing */
export const courseReactionInterval = 14

/** seconds the player has to answer each quiz question */
export const quizTimeLimit = 20

export type QuizAnswer = { id: string; text: string; correct?: boolean }
export type QuizQuestion = { id: string; title: string; subject: string; answers: QuizAnswer[] }

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    title: 'Почему электролиты такие электрические?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Они содержат ионы, способные переносить заряд', correct: true },
      { id: 'a2', text: 'Они притягивают молнии во время грозы' },
      { id: 'a3', text: 'В их молекулах есть встроенные батарейки' },
      { id: 'a4', text: 'Из-за высокого содержания металлов' },
    ],
  },
  {
    id: 'q2',
    title: 'Что показывает pH раствора?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Кислотность или щёлочность', correct: true },
      { id: 'a2', text: 'Температуру кипения' },
      { id: 'a3', text: 'Плотность вещества' },
      { id: 'a4', text: 'Скорость реакции' },
    ],
  },
  {
    id: 'q3',
    title: 'Какой газ выделяется при реакции металла с кислотой?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Водород', correct: true },
      { id: 'a2', text: 'Кислород' },
      { id: 'a3', text: 'Углекислый газ' },
      { id: 'a4', text: 'Азот' },
    ],
  },
  {
    id: 'q4',
    title: 'Сколько электронов на внешнем уровне у инертных газов (кроме гелия)?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Восемь', correct: true },
      { id: 'a2', text: 'Два' },
      { id: 'a3', text: 'Четыре' },
      { id: 'a4', text: 'Восемнадцать' },
    ],
  },
  {
    id: 'q5',
    title: 'Что делает катализатор?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Ускоряет реакцию, не расходуясь', correct: true },
      { id: 'a2', text: 'Всегда вызывает взрыв' },
      { id: 'a3', text: 'Это вид химической посуды' },
      { id: 'a4', text: 'Единица измерения массы' },
    ],
  },
  {
    id: 'q6',
    title: 'Какая формула у поваренной соли?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'NaCl', correct: true },
      { id: 'a2', text: 'KCl' },
      { id: 'a3', text: 'CaCO₃' },
      { id: 'a4', text: 'H₂O' },
    ],
  },
  {
    id: 'q7',
    title: 'Что происходит с веществом при окислении?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Оно отдаёт электроны', correct: true },
      { id: 'a2', text: 'Оно принимает электроны' },
      { id: 'a3', text: 'Оно полностью теряет массу' },
      { id: 'a4', text: 'Оно всегда превращается в газ' },
    ],
  },
  {
    id: 'q8',
    title: 'Самый лёгкий химический элемент — это…',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Водород', correct: true },
      { id: 'a2', text: 'Гелий' },
      { id: 'a3', text: 'Литий' },
      { id: 'a4', text: 'Углерод' },
    ],
  },
  {
    id: 'q9',
    title: 'Как называется горизонтальный ряд в таблице Менделеева?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Период', correct: true },
      { id: 'a2', text: 'Группа' },
      { id: 'a3', text: 'Семейство' },
      { id: 'a4', text: 'Колонка' },
    ],
  },
  {
    id: 'q10',
    title: 'Что измеряют в молях?',
    subject: 'Химия',
    answers: [
      { id: 'a1', text: 'Количество вещества', correct: true },
      { id: 'a2', text: 'Температуру' },
      { id: 'a3', text: 'Объём газа' },
      { id: 'a4', text: 'Электрический заряд' },
    ],
  },
  {
    id: 'qb1',
    title: 'Что является структурной единицей всего живого?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Клетка', correct: true },
      { id: 'a2', text: 'Молекула' },
      { id: 'a3', text: 'Атом' },
      { id: 'a4', text: 'Орган' },
    ],
  },
  {
    id: 'qb2',
    title: 'В каком органоиде клетки происходит фотосинтез?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'В хлоропластах', correct: true },
      { id: 'a2', text: 'В митохондриях' },
      { id: 'a3', text: 'В рибосомах' },
      { id: 'a4', text: 'В ядре' },
    ],
  },
  {
    id: 'qb3',
    title: 'Какой газ растения поглощают при фотосинтезе?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Углекислый газ', correct: true },
      { id: 'a2', text: 'Кислород' },
      { id: 'a3', text: 'Азот' },
      { id: 'a4', text: 'Водород' },
    ],
  },
  {
    id: 'qb4',
    title: 'Кто сформулировал основные законы наследственности?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Грегор Мендель', correct: true },
      { id: 'a2', text: 'Чарлз Дарвин' },
      { id: 'a3', text: 'Луи Пастер' },
      { id: 'a4', text: 'Карл Линней' },
    ],
  },
  {
    id: 'qb5',
    title: 'Из чего состоят хромосомы?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Из ДНК и белков', correct: true },
      { id: 'a2', text: 'Только из РНК' },
      { id: 'a3', text: 'Из липидов' },
      { id: 'a4', text: 'Из углеводов' },
    ],
  },
  {
    id: 'qb6',
    title: 'Какой процесс обеспечивает рост организма?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Митоз', correct: true },
      { id: 'a2', text: 'Мейоз' },
      { id: 'a3', text: 'Гидролиз' },
      { id: 'a4', text: 'Окисление' },
    ],
  },
  {
    id: 'qb7',
    title: 'Что такое биоценоз?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Сообщество живых организмов', correct: true },
      { id: 'a2', text: 'Часть клетки' },
      { id: 'a3', text: 'Вид растения' },
      { id: 'a4', text: 'Тип ткани' },
    ],
  },
  {
    id: 'qb8',
    title: 'Какой учёный создал теорию эволюции путём естественного отбора?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Чарлз Дарвин', correct: true },
      { id: 'a2', text: 'Жан-Батист Ламарк' },
      { id: 'a3', text: 'Карл Линней' },
      { id: 'a4', text: 'Александр Опарин' },
    ],
  },
  {
    id: 'qb9',
    title: 'Какие сосуды несут кровь от сердца?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'Артерии', correct: true },
      { id: 'a2', text: 'Вены' },
      { id: 'a3', text: 'Капилляры' },
      { id: 'a4', text: 'Лимфатические сосуды' },
    ],
  },
  {
    id: 'qb10',
    title: 'В каких органах человека происходит газообмен?',
    subject: 'Биология',
    answers: [
      { id: 'a1', text: 'В лёгких (альвеолах)', correct: true },
      { id: 'a2', text: 'В печени' },
      { id: 'a3', text: 'В почках' },
      { id: 'a4', text: 'В желудке' },
    ],
  },
]

/** Backward-compatible single-question export (the first question of the set). */
export const dailyQuiz = {
  ...quizQuestions[0],
  timeLimit: quizTimeLimit,
}
