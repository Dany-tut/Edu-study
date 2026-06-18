// DEV-only demo data so the mobile (and desktop) student UI can be reviewed
// locally without a teacher-authored course. Mirrors taskBankStore's DEV_SEED
// pattern. NEVER used in production (import.meta.env.DEV gate in the store) and
// only when the real Supabase fetch returns nothing — real data always wins.

import type { Subject, ScheduleDay } from './mockData'
import type { StudentStats } from '../lib/db'

const today = new Date().toISOString().slice(0, 10)

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'chemistry', name: 'Химия', progress: 38, activeModuleId: 1,
    modules: [
      {
        id: 1, label: 'Модуль 1',
        lessons: [
          { id: 'demo-c1', title: 'Строение атома', number: 1, status: 'completed', shape: 'circle', subject: 'chemistry', points: 95 },
          { id: 'demo-c2', title: 'Химические связи', number: 2, status: 'completed', shape: 'circle', subject: 'chemistry', points: 88 },
          { id: 'demo-c3', title: 'Электролитическая диссоциация', number: 3, status: 'current', shape: 'circle', subject: 'chemistry' },
          { id: 'demo-c4', title: 'Кислоты и основания', number: 4, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'demo-c5', title: 'Окислительно-восстановительные реакции', number: 5, status: 'locked', shape: 'diamond', subject: 'chemistry' },
        ],
      },
      {
        id: 2, label: 'Модуль 2',
        lessons: [
          { id: 'demo-c6', title: 'Органическая химия: введение', number: 6, status: 'locked', shape: 'circle', subject: 'chemistry' },
          { id: 'demo-c7', title: 'Углеводороды', number: 7, status: 'locked', shape: 'circle', subject: 'chemistry' },
        ],
      },
    ],
  },
  {
    id: 'biology', name: 'Биология', progress: 12, activeModuleId: 1,
    modules: [
      {
        id: 1, label: 'Модуль 1',
        lessons: [
          { id: 'demo-b1', title: 'Клетка и её строение', number: 1, status: 'completed', shape: 'circle', subject: 'biology', points: 78 },
          { id: 'demo-b2', title: 'Клеточное дыхание', number: 2, status: 'returned', shape: 'circle', subject: 'biology', points: 40 },
          { id: 'demo-b3', title: 'Фотосинтез', number: 3, status: 'locked', shape: 'circle', subject: 'biology' },
        ],
      },
    ],
  },
]

export const DEMO_SCHEDULE: ScheduleDay[] = [
  { date: today, label: 'Сегодня', isToday: true, lessons: [
    { id: 'demo-s1', subject: 'Химия', lessonTitle: 'Электролитическая диссоциация', lessonNumber: 3, time: '19:30' },
    { id: 'demo-s2', subject: 'Биология', lessonTitle: 'Фотосинтез', lessonNumber: 3, time: '21:00' },
  ] },
]

export const DEMO_STATS: StudentStats = {
  performance: 72,
  completedTasks: 14,
  totalTasks: 40,
  avgScore: 83,
  streak: 5,
  totalPoints: 582,
  stars: 3,
}
