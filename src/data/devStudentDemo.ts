// DEV-only demo data so the mobile (and desktop) student UI can be reviewed
// locally without a teacher-authored course. Mirrors taskBankStore's DEV_SEED
// pattern. NEVER used in production (import.meta.env.DEV gate in the store) and
// only when the real Supabase fetch returns no lessons — real data always wins.
//
// Purposely broad: 4 subjects, multiple modules, every LessonStatus, mixed
// shapes, test nodes, recordings, comments and a week-long schedule — so every
// branch of the student UI has something to render while polishing locally.

import type { Subject, ScheduleDay, Lesson } from './mockData'
import type { StudentStats } from '../lib/db'

const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const today = iso(0)

// Small helper to keep the lesson literals terse and consistent.
const L = (
  id: string,
  subject: string,
  number: number,
  title: string,
  status: Lesson['status'],
  extra: Partial<Lesson> = {},
): Lesson => ({ id, subject, number, title, status, shape: 'circle', ...extra })

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'chemistry', name: 'Химия', progress: 46, activeModuleId: 2, accessMode: 'custom',
    modules: [
      {
        id: 1, label: 'Основы',
        lessons: [
          L('demo-c1', 'chemistry', 1, 'Строение атома', 'completed', { points: 95, comment: 'Отличная работа!' }),
          L('demo-c2', 'chemistry', 2, 'Периодический закон', 'completed', { points: 88 }),
          L('demo-c3', 'chemistry', 3, 'Химические связи', 'completed', { points: 72 }),
          L('demo-c4', 'chemistry', 4, 'Контрольная: атом и связи', 'completed', { shape: 'square', kind: 'test', points: 90 }),
        ],
      },
      {
        id: 2, label: 'Реакции',
        lessons: [
          L('demo-c5', 'chemistry', 5, 'Электролитическая диссоциация', 'current', {
            description: 'Разбираем, как вещества распадаются на ионы.',
            homework: {
              hwTitle: 'ДЗ · Электролитическая диссоциация',
              hwTasks: [
                { id: 't1', type: 'single', isHard: false, question: 'Какое вещество является сильным электролитом?', choices: ['Сахар', 'Соляная кислота', 'Этанол', 'Глюкоза'], correctChoices: [1] },
                { id: 't2', type: 'multi', isHard: false, question: 'Выберите вещества-электролиты.', choices: ['NaCl', 'O₂', 'KOH', 'H₂SO₄'], correctChoices: [0, 2, 3] },
                { id: 't3', type: 'fill', isHard: false, question: 'Процесс распада вещества на ионы называется …', answer: 'диссоциация' },
                { id: 't4', type: 'sequence', isHard: false, question: 'Расставьте по возрастанию силы электролита.', sequenceItems: ['Уксусная кислота', 'Угольная кислота', 'Серная кислота'] },
                { id: 'h1', type: 'extended', isHard: true, label: 'Задание 1', question: 'Опишите механизм электролитической диссоциации хлорида натрия в воде. Приведите уравнение.' },
              ],
            },
          }),
          L('demo-c6', 'chemistry', 6, 'Реакции ионного обмена', 'returned', { points: 45, comment: 'Пересдай задание 3 — перепутал осадок.' }),
          L('demo-c7', 'chemistry', 7, 'Окислительно-восстановительные реакции', 'submitted'),
          L('demo-c8', 'chemistry', 8, 'Запись: скорость реакций', 'unviewed', { shape: 'diamond', videoUrl: 'https://rutube.ru/video/demo/' }),
          L('demo-c9', 'chemistry', 9, 'Химическое равновесие', 'locked'),
        ],
      },
      {
        id: 3, label: 'Органика',
        lessons: [
          L('demo-c10', 'chemistry', 10, 'Углеводороды', 'locked'),
          L('demo-c11', 'chemistry', 11, 'Спирты и кислоты', 'locked'),
          L('demo-c12', 'chemistry', 12, 'Итоговый тест', 'locked', { shape: 'square', kind: 'test' }),
        ],
      },
    ],
  },
  {
    id: 'biology', name: 'Биология', progress: 28, activeModuleId: 1, accessMode: 'by_date',
    modules: [
      {
        id: 1, label: 'Клетка',
        lessons: [
          L('demo-b1', 'biology', 1, 'Клетка и её строение', 'completed', { points: 84 }),
          L('demo-b2', 'biology', 2, 'Клеточное дыхание', 'returned', { points: 40, comment: 'Дополни схему гликолиза.' }),
          L('demo-b3', 'biology', 3, 'Фотосинтез', 'current', { description: 'Световая и темновая фазы.' }),
          L('demo-b4', 'biology', 4, 'Митоз и мейоз', 'locked'),
          L('demo-b5', 'biology', 5, 'Запись вебинара: деление клетки', 'unviewed', { shape: 'diamond', videoUrl: 'https://www.youtube.com/watch?v=demo' }),
        ],
      },
      {
        id: 2, label: 'Генетика',
        lessons: [
          L('demo-b6', 'biology', 6, 'Законы Менделя', 'locked'),
          L('demo-b7', 'biology', 7, 'Сцепленное наследование', 'locked'),
          L('demo-b8', 'biology', 8, 'Мутации', 'locked'),
        ],
      },
    ],
  },
  {
    id: 'physics', name: 'Физика', progress: 60, activeModuleId: 2, accessMode: 'full',
    modules: [
      {
        id: 1, label: 'Механика',
        lessons: [
          L('demo-p1', 'physics', 1, 'Кинематика', 'completed', { points: 91 }),
          L('demo-p2', 'physics', 2, 'Законы Ньютона', 'completed', { points: 87 }),
          L('demo-p3', 'physics', 3, 'Импульс и энергия', 'completed', { points: 78 }),
          L('demo-p4', 'physics', 4, 'Контрольная по механике', 'completed', { shape: 'square', kind: 'test', points: 82 }),
        ],
      },
      {
        id: 2, label: 'Молекулярка',
        lessons: [
          L('demo-p5', 'physics', 5, 'Газовые законы', 'submitted'),
          L('demo-p6', 'physics', 6, 'Термодинамика', 'current'),
          L('demo-p7', 'physics', 7, 'Влажность и фазовые переходы', 'locked'),
        ],
      },
    ],
  },
  {
    id: 'math', name: 'Математика', progress: 15, activeModuleId: 1, accessMode: 'custom',
    modules: [
      {
        id: 1, label: 'Алгебра',
        lessons: [
          L('demo-m1', 'math', 1, 'Функции и графики', 'completed', { points: 70 }),
          L('demo-m2', 'math', 2, 'Производная', 'current'),
          L('demo-m3', 'math', 3, 'Исследование функций', 'locked'),
          L('demo-m4', 'math', 4, 'Интеграл', 'locked'),
        ],
      },
    ],
  },
]

export const DEMO_SCHEDULE: ScheduleDay[] = [
  { date: iso(-1), label: 'Вчера', isToday: false, lessons: [
    { id: 'demo-sd0', subject: 'Физика', lessonTitle: 'Газовые законы', lessonNumber: 5, time: '18:00', passed: true },
  ] },
  { date: today, label: 'Сегодня', isToday: true, lessons: [
    { id: 'demo-sd1', subject: 'Химия', lessonTitle: 'Электролитическая диссоциация', lessonNumber: 5, time: '19:30', upcoming: true, minutesUntil: 90 },
    { id: 'demo-sd2', subject: 'Биология', lessonTitle: 'Фотосинтез', lessonNumber: 3, time: '21:00', upcoming: true, minutesUntil: 180 },
  ] },
  { date: iso(1), label: 'Завтра', isToday: false, lessons: [
    { id: 'demo-sd3', subject: 'Математика', lessonTitle: 'Производная', lessonNumber: 2, time: '17:00' },
    { id: 'demo-sd4', subject: 'Физика', lessonTitle: 'Термодинамика', lessonNumber: 6, time: '19:00' },
  ] },
  { date: iso(2), label: iso(2), isToday: false, lessons: [
    { id: 'demo-sd5', subject: 'Химия', lessonTitle: 'Реакции ионного обмена', lessonNumber: 6, time: '19:30' },
  ] },
  { date: iso(4), label: iso(4), isToday: false, lessons: [
    { id: 'demo-sd6', subject: 'Биология', lessonTitle: 'Митоз и мейоз', lessonNumber: 4, time: '21:00' },
  ] },
]

export const DEMO_STATS: StudentStats = {
  performance: 78,
  completedTasks: 34,
  totalTasks: 60,
  avgScore: 81,
  streak: 7,
  totalPoints: 1240,
  stars: 4,
}
