export const teacher = {
  name: 'Анна Петровна',
  initials: 'АП',
  subject: 'Химия',
}

export type Group = {
  id: string
  name: string
  subject: string
  level: string
  color: string
  colorSoft: string
  startDate: string
  studentCount: number
  lessonsCompleted: number
  totalLessons: number
}

export type Student = {
  id: string
  groupId: string
  name: string
  phone: string
  telegramLink?: string
  parentContact?: string
  startedAt: string
  lastVisit: string
  hwScore: number
  testScore: number
  trialScore: number | null
  desiredScore: number
  attendance: number
  comment?: string
}

export type ScheduleItem = {
  id: string
  time: string
  endTime: string
  groupId: string
  groupName: string
  subject: string
  lessonNumber: number
  topic: string
  studentCount: number
  status: 'completed' | 'live' | 'upcoming'
  color: string
  colorSoft: string
}

export type HomeworkItem = {
  id: string
  groupId: string
  groupName: string
  title: string
  assignedAt: string
  dueDate: string
  submittedCount: number
  totalCount: number
  reviewedCount: number
  color: string
}

export type Reminder = {
  id: string
  type: 'check-hw' | 'fill-widget' | 'make-trainer' | 'send-push'
  text: string
  detail?: string
  urgency: 'high' | 'medium' | 'low'
}

export type RecentActivity = {
  id: string
  studentName: string
  groupName: string
  action: 'submitted-hw' | 'visited' | 'scored'
  detail: string
  time: string
}

export const groups: Group[] = [
  {
    id: 'g1', name: 'ЕГЭ-Хим 11А', subject: 'Химия', level: 'ЕГЭ',
    color: '#6EE7A0', colorSoft: '#DFF8D6',
    startDate: '01.09.2024', studentCount: 8, lessonsCompleted: 34, totalLessons: 48,
  },
  {
    id: 'g2', name: 'ЕГЭ-Хим 11Б', subject: 'Химия', level: 'ЕГЭ',
    color: '#C58BFF', colorSoft: '#EEDBFF',
    startDate: '01.09.2024', studentCount: 12, lessonsCompleted: 34, totalLessons: 48,
  },
  {
    id: 'g3', name: 'ОГЭ-Хим 9А', subject: 'Химия', level: 'ОГЭ',
    color: '#F8C991', colorSoft: '#FFE4BD',
    startDate: '15.09.2024', studentCount: 6, lessonsCompleted: 22, totalLessons: 36,
  },
  {
    id: 'g4', name: 'ЕГЭ-Хим 10А', subject: 'Химия', level: 'ЕГЭ',
    color: '#F48B91', colorSoft: '#FFE1E4',
    startDate: '10.01.2025', studentCount: 10, lessonsCompleted: 18, totalLessons: 48,
  },
]

export const students: Student[] = [
  { id: 's1', groupId: 'g1', name: 'Алиса Смирнова', phone: '+7 900 111-22-33', telegramLink: 'alice_s', parentContact: '+7 900 111-00-00', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 85, testScore: 78, trialScore: 72, desiredScore: 90, attendance: 94, comment: 'Старается, иногда пропускает дедлайны' },
  { id: 's2', groupId: 'g1', name: 'Борис Иванов', phone: '+7 900 222-33-44', telegramLink: 'borisi', startedAt: '01.09.2024', lastVisit: '07.06.2025', hwScore: 62, testScore: 55, trialScore: 58, desiredScore: 75, attendance: 80 },
  { id: 's3', groupId: 'g1', name: 'Виктория Козлова', phone: '+7 900 333-44-55', parentContact: '+7 900 333-00-00', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 92, testScore: 89, trialScore: 87, desiredScore: 95, attendance: 100 },
  { id: 's4', groupId: 'g1', name: 'Григорий Попов', phone: '+7 900 444-55-66', startedAt: '01.09.2024', lastVisit: '28.05.2025', hwScore: 40, testScore: 38, trialScore: null, desiredScore: 65, attendance: 60, comment: 'Нужна дополнительная работа' },
  { id: 's5', groupId: 'g1', name: 'Дарья Новикова', phone: '+7 900 555-66-77', telegramLink: 'dasha_n', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 88, testScore: 82, trialScore: 80, desiredScore: 90, attendance: 97 },
  { id: 's6', groupId: 'g1', name: 'Евгений Морозов', phone: '+7 900 666-77-88', startedAt: '01.09.2024', lastVisit: '08.06.2025', hwScore: 70, testScore: 65, trialScore: 63, desiredScore: 80, attendance: 88 },
  { id: 's7', groupId: 'g1', name: 'Жанна Волкова', phone: '+7 900 777-88-99', parentContact: '+7 900 777-11-11', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 75, testScore: 70, trialScore: null, desiredScore: 85, attendance: 92 },
  { id: 's8', groupId: 'g1', name: 'Иван Петров', phone: '+7 900 888-99-00', startedAt: '01.09.2024', lastVisit: '06.06.2025', hwScore: 55, testScore: 50, trialScore: 48, desiredScore: 70, attendance: 75 },
  { id: 's9', groupId: 'g2', name: 'Карина Белова', phone: '+7 901 111-22-33', telegramLink: 'karina_b', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 90, testScore: 87, trialScore: 85, desiredScore: 95, attendance: 99 },
  { id: 's10', groupId: 'g2', name: 'Лев Сидоров', phone: '+7 901 222-33-44', startedAt: '01.09.2024', lastVisit: '08.06.2025', hwScore: 68, testScore: 62, trialScore: 60, desiredScore: 78, attendance: 83 },
  { id: 's11', groupId: 'g3', name: 'Мария Кузнецова', phone: '+7 902 111-22-33', parentContact: '+7 902 111-00-00', startedAt: '15.09.2024', lastVisit: '09.06.2025', hwScore: 78, testScore: 72, trialScore: null, desiredScore: 87, attendance: 95 },
  { id: 's12', groupId: 'g3', name: 'Николай Федоров', phone: '+7 902 222-33-44', startedAt: '15.09.2024', lastVisit: '05.06.2025', hwScore: 50, testScore: 45, trialScore: null, desiredScore: 65, attendance: 72 },
]

export const todaySchedule: ScheduleItem[] = [
  {
    id: 'sc1', time: '12:00', endTime: '13:30', groupId: 'g1',
    groupName: 'ЕГЭ-Хим 11А', subject: 'Химия ЕГЭ', lessonNumber: 34,
    topic: 'Гидролиз солей', studentCount: 8, status: 'completed',
    color: '#6EE7A0', colorSoft: '#DFF8D6',
  },
  {
    id: 'sc2', time: '15:00', endTime: '16:30', groupId: 'g2',
    groupName: 'ЕГЭ-Хим 11Б', subject: 'Химия ЕГЭ', lessonNumber: 34,
    topic: 'Гидролиз солей', studentCount: 12, status: 'upcoming',
    color: '#C58BFF', colorSoft: '#EEDBFF',
  },
  {
    id: 'sc3', time: '18:00', endTime: '19:30', groupId: 'g3',
    groupName: 'ОГЭ-Хим 9А', subject: 'Химия ОГЭ', lessonNumber: 22,
    topic: 'Кислоты и основания', studentCount: 6, status: 'upcoming',
    color: '#F8C991', colorSoft: '#FFE4BD',
  },
]

export const pendingHomework: HomeworkItem[] = [
  { id: 'hw1', groupId: 'g1', groupName: 'ЕГЭ-Хим 11А', title: 'Задачи на гидролиз', assignedAt: '05.06', dueDate: '09.06', submittedCount: 7, totalCount: 8, reviewedCount: 0, color: '#6EE7A0' },
  { id: 'hw2', groupId: 'g2', groupName: 'ЕГЭ-Хим 11Б', title: 'Окислительно-восстановительные реакции', assignedAt: '07.06', dueDate: '10.06', submittedCount: 5, totalCount: 12, reviewedCount: 2, color: '#C58BFF' },
  { id: 'hw3', groupId: 'g3', groupName: 'ОГЭ-Хим 9А', title: 'Типы химических реакций', assignedAt: '08.06', dueDate: '11.06', submittedCount: 4, totalCount: 6, reviewedCount: 0, color: '#F8C991' },
]

export const reminders: Reminder[] = [
  { id: 'r1', type: 'check-hw', text: 'Проверить ДЗ — ЕГЭ-Хим 11А', detail: '7 работ ждут', urgency: 'high' },
  { id: 'r2', type: 'check-hw', text: 'Проверить ДЗ — ОГЭ-Хим 9А', detail: '4 работы ждут', urgency: 'high' },
  { id: 'r3', type: 'fill-widget', text: 'Заполнить виджеты — Органика', detail: 'урок 35', urgency: 'medium' },
  { id: 'r4', type: 'make-trainer', text: 'Составить тренажёр', detail: 'Тема: Кислоты', urgency: 'low' },
]

export const recentActivity: RecentActivity[] = [
  { id: 'a1', studentName: 'Виктория Козлова', groupName: 'ЕГЭ-11А', action: 'submitted-hw', detail: 'Гидролиз солей', time: '2 ч назад' },
  { id: 'a2', studentName: 'Карина Белова', groupName: 'ЕГЭ-11Б', action: 'submitted-hw', detail: 'ОВР — задача №4', time: '3 ч назад' },
  { id: 'a3', studentName: 'Алиса Смирнова', groupName: 'ЕГЭ-11А', action: 'scored', detail: 'Тест: 88/100', time: '5 ч назад' },
  { id: 'a4', studentName: 'Мария Кузнецова', groupName: 'ОГЭ-9А', action: 'visited', detail: 'Посетила урок 22', time: 'вчера' },
]

export function getTotalPendingHw(homework: HomeworkItem[]) {
  return homework.reduce((acc, hw) => acc + (hw.submittedCount - hw.reviewedCount), 0)
}

export function getAvgScore(studentList: Student[]) {
  const scores = studentList.map(s => s.testScore)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
