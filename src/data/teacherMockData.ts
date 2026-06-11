export const teacher = {
  name: 'Анна Петровна',
  initials: 'АП',
  subjects: ['Химия', 'Биология'],
}

export type OnlineStudent = {
  id: string
  initials: string
  color: string
  name: string
}

export const onlineStudents: OnlineStudent[] = [
  { id: 's3',  initials: 'ВК', color: '#9B6DCC', name: 'Виктория Козлова' },
  { id: 's5',  initials: 'ДН', color: '#7B9FCC', name: 'Дарья Новикова' },
  { id: 's12', initials: 'КБ', color: '#CC7B9B', name: 'Карина Белова' },
  { id: 's1',  initials: 'АС', color: '#6DBB9A', name: 'Алиса Смирнова' },
  { id: 's9',  initials: 'МК', color: '#CCA46D', name: 'Мария Кузнецова' },
]

export type Group = {
  id: string
  name: string
  subject: 'Химия' | 'Биология'
  icon: string
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
  paymentDue?: string
  paymentAmount?: number
  lastPayment?: string
  debt?: number
  email?: string
  tempPassword?: string
  inviteToken?: string | null
}

export type ScheduleItem = {
  id: string
  time: string
  endTime: string
  groupId: string
  groupName: string
  subject: string
  icon: string
  lessonNumber: number
  topic: string
  studentCount: number
  status: 'completed' | 'live' | 'upcoming'
  color: string
  colorSoft: string
}

export type HwTask = {
  id: string
  title: string
  maxScore: number
}

export type HomeworkItem = {
  id: string
  groupId: string
  groupName: string
  icon?: string
  title: string
  assignedAt: string
  dueDate: string
  submittedCount: number
  totalCount: number
  reviewedCount: number
  color: string
  tasks?: HwTask[]
}

export type Reminder = {
  id: string
  type: 'check-hw' | 'fill-widget' | 'make-trainer' | 'send-push' | 'payment-debt'
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
    id: 'g1', name: 'ЕГЭ-Хим Атомы', subject: 'Химия', icon: '🧪', level: 'ЕГЭ',
    color: '#B98FFF', colorSoft: '#EFE0FF',
    startDate: '01.09.2024', studentCount: 19, lessonsCompleted: 34, totalLessons: 48,
  },
  {
    id: 'g2', name: 'ЕГЭ-Хим Молекулы', subject: 'Химия', icon: '🧪', level: 'ЕГЭ',
    color: '#9B6DFF', colorSoft: '#E4D9FF',
    startDate: '01.09.2024', studentCount: 12, lessonsCompleted: 34, totalLessons: 48,
  },
  {
    id: 'g3', name: 'ОГЭ-Хим Ионы', subject: 'Химия', icon: '🧪', level: 'ОГЭ',
    color: '#C58BFF', colorSoft: '#EEDBFF',
    startDate: '15.09.2024', studentCount: 6, lessonsCompleted: 22, totalLessons: 36,
  },
  {
    id: 'g4', name: 'ЕГЭ-Био Хлорофилл', subject: 'Биология', icon: '🌿', level: 'ЕГЭ',
    color: '#5FD68A', colorSoft: '#D6F5E3',
    startDate: '10.01.2025', studentCount: 10, lessonsCompleted: 18, totalLessons: 48,
  },
  {
    id: 'g5', name: 'ОГЭ-Био Нейроны', subject: 'Биология', icon: '🌿', level: 'ОГЭ',
    color: '#3EC87A', colorSoft: '#C8F0D9',
    startDate: '10.01.2025', studentCount: 7, lessonsCompleted: 14, totalLessons: 36,
  },
  {
    id: 'g6', name: 'ЕГЭ-Хим Реакции', subject: 'Химия', icon: '🧪', level: 'ЕГЭ',
    color: '#FF7A5C', colorSoft: '#FFE8E3',
    startDate: '01.02.2025', studentCount: 9, lessonsCompleted: 20, totalLessons: 48,
  },
  {
    id: 'g7', name: 'ОГЭ-Хим Металлы', subject: 'Химия', icon: '🧪', level: 'ОГЭ',
    color: '#F5A623', colorSoft: '#FFF3D6',
    startDate: '15.02.2025', studentCount: 5, lessonsCompleted: 10, totalLessons: 36,
  },
  {
    id: 'g8', name: 'ЕГЭ-Био Генетика', subject: 'Биология', icon: '🌿', level: 'ЕГЭ',
    color: '#4AABDB', colorSoft: '#D6EFFA',
    startDate: '01.03.2025', studentCount: 11, lessonsCompleted: 8, totalLessons: 48,
  },
]

export const students: Student[] = [
  { id: 's1', groupId: 'g1', name: 'Алиса Смирнова',  phone: '+7 900 111-22-33', telegramLink: 'alice_s', parentContact: '+7 900 111-00-00', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 85, testScore: 78, trialScore: 72,   desiredScore: 90, attendance: 94,  comment: 'Старается, иногда пропускает дедлайны', lastPayment: '2026-06-01', debt: 0 },
  { id: 's2', groupId: 'g1', name: 'Борис Иванов',     phone: '+7 900 222-33-44', telegramLink: 'borisi',  startedAt: '01.09.2024', lastVisit: '07.06.2025', hwScore: 62, testScore: 55, trialScore: 58,   desiredScore: 75, attendance: 80,  paymentDue: '2026-06-12', paymentAmount: 4500, lastPayment: '2026-05-12', debt: 4500 },
  { id: 's3', groupId: 'g1', name: 'Виктория Козлова', phone: '+7 900 333-44-55', parentContact: '+7 900 333-00-00', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 92, testScore: 89, trialScore: 87,   desiredScore: 95, attendance: 100, lastPayment: '2026-06-03', debt: 0 },
  { id: 's4', groupId: 'g1', name: 'Григорий Попов',   phone: '+7 900 444-55-66', startedAt: '01.09.2024', lastVisit: '28.05.2025', hwScore: 40, testScore: 38, trialScore: null, desiredScore: 65, attendance: 60,  comment: 'Нужна дополнительная работа', paymentDue: '2026-06-05', paymentAmount: 4500, lastPayment: '2026-04-05', debt: 9000 },
  { id: 's5', groupId: 'g1', name: 'Дарья Новикова',   phone: '+7 900 555-66-77', telegramLink: 'dasha_n', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 88, testScore: 82, trialScore: 80,   desiredScore: 90, attendance: 97,  lastPayment: '2026-06-05', debt: 0 },
  { id: 's6', groupId: 'g1', name: 'Евгений Морозов',  phone: '+7 900 666-77-88', startedAt: '01.09.2024', lastVisit: '08.06.2025', hwScore: 70, testScore: 65, trialScore: 63,   desiredScore: 80, attendance: 88,  paymentDue: '2026-06-22', paymentAmount: 4500, lastPayment: '2026-05-22', debt: 0 },
  { id: 's7', groupId: 'g1', name: 'Жанна Волкова',    phone: '+7 900 777-88-99', parentContact: '+7 900 777-11-11', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 75, testScore: 70, trialScore: null, desiredScore: 85, attendance: 92,  lastPayment: '2026-06-01', debt: 0 },
  { id: 's8', groupId: 'g1', name: 'Иван Петров',      phone: '+7 900 888-99-00', startedAt: '01.09.2024', lastVisit: '06.06.2025', hwScore: 55, testScore: 50, trialScore: 48,   desiredScore: 70, attendance: 75,  paymentDue: '2026-06-08', paymentAmount: 4500, lastPayment: '2026-05-08', debt: 4500 },
  { id: 's9', groupId: 'g2', name: 'Карина Белова',    phone: '+7 901 111-22-33', telegramLink: 'karina_b', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 90, testScore: 87, trialScore: 85,   desiredScore: 95, attendance: 99,  lastPayment: '2026-06-04', debt: 0 },
  { id: 's10', groupId: 'g2', name: 'Лев Сидоров',    phone: '+7 901 222-33-44', startedAt: '01.09.2024', lastVisit: '08.06.2025', hwScore: 68, testScore: 62, trialScore: 60,   desiredScore: 78, attendance: 83,  paymentDue: '2026-06-14', paymentAmount: 4500, lastPayment: '2026-05-14', debt: 4500 },
  { id: 's11', groupId: 'g3', name: 'Мария Кузнецова', phone: '+7 902 111-22-33', parentContact: '+7 902 111-00-00', startedAt: '15.09.2024', lastVisit: '09.06.2025', hwScore: 78, testScore: 72, trialScore: null, desiredScore: 87, attendance: 95, lastPayment: '2026-06-02', debt: 0 },
  { id: 's12', groupId: 'g3', name: 'Николай Федоров', phone: '+7 902 222-33-44', startedAt: '15.09.2024', lastVisit: '05.06.2025', hwScore: 50, testScore: 45, trialScore: null, desiredScore: 65, attendance: 72, paymentDue: '2026-06-28', paymentAmount: 3800, lastPayment: '2026-05-28', debt: 3800 },
  // g6 — ЕГЭ-Хим Реакции
  { id: 's13', groupId: 'g6', name: 'Ольга Тихонова',   phone: '+7 903 111-22-33', telegramLink: 'olga_t', startedAt: '01.02.2025', lastVisit: '10.06.2025', hwScore: 91, testScore: 88, trialScore: 84,   desiredScore: 95, attendance: 98,  lastPayment: '2026-06-07', debt: 0 },
  { id: 's14', groupId: 'g6', name: 'Пётр Власов',      phone: '+7 903 222-33-44', startedAt: '01.02.2025', lastVisit: '09.06.2025', hwScore: 74, testScore: 69, trialScore: 66,   desiredScore: 82, attendance: 87,  lastPayment: '2026-06-01', debt: 0 },
  { id: 's15', groupId: 'g6', name: 'Роман Зайцев',     phone: '+7 903 333-44-55', startedAt: '01.02.2025', lastVisit: '07.06.2025', hwScore: 58, testScore: 52, trialScore: null, desiredScore: 70, attendance: 76,  paymentDue: '2026-06-15', paymentAmount: 4500, lastPayment: '2026-05-15', debt: 4500 },
  // g7 — ОГЭ-Хим Металлы
  { id: 's16', groupId: 'g7', name: 'Светлана Орлова',  phone: '+7 904 111-22-33', parentContact: '+7 904 111-00-00', startedAt: '15.02.2025', lastVisit: '10.06.2025', hwScore: 83, testScore: 77, trialScore: null, desiredScore: 88, attendance: 96,  lastPayment: '2026-06-03', debt: 0 },
  { id: 's17', groupId: 'g7', name: 'Тимур Крылов',     phone: '+7 904 222-33-44', startedAt: '15.02.2025', lastVisit: '06.06.2025', hwScore: 61, testScore: 55, trialScore: null, desiredScore: 72, attendance: 78,  paymentDue: '2026-06-20', paymentAmount: 3800, lastPayment: '2026-05-20', debt: 3800 },
  // g8 — ЕГЭ-Био Генетика
  { id: 's18', groupId: 'g8', name: 'Ульяна Пирогова',  phone: '+7 905 111-22-33', telegramLink: 'ulyana_p', startedAt: '01.03.2025', lastVisit: '10.06.2025', hwScore: 89, testScore: 85, trialScore: 80,   desiredScore: 93, attendance: 97,  lastPayment: '2026-06-05', debt: 0 },
  { id: 's19', groupId: 'g8', name: 'Фёдор Беляев',     phone: '+7 905 222-33-44', startedAt: '01.03.2025', lastVisit: '08.06.2025', hwScore: 72, testScore: 66, trialScore: 61,   desiredScore: 80, attendance: 84,  lastPayment: '2026-06-02', debt: 0 },
  { id: 's20', groupId: 'g8', name: 'Хелена Громова',   phone: '+7 905 333-44-55', parentContact: '+7 905 333-00-00', startedAt: '01.03.2025', lastVisit: '04.06.2025', hwScore: 45, testScore: 40, trialScore: null, desiredScore: 60, attendance: 65,  paymentDue: '2026-06-10', paymentAmount: 4500, lastPayment: '2026-04-10', debt: 9000 },
  { id: 's21', groupId: 'g1', name: 'Артём Соколов',    phone: '+7 906 111-22-33', telegramLink: 'artem_s', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 81, testScore: 76, trialScore: 74, desiredScore: 88, attendance: 91, lastPayment: '2026-06-01', debt: 0 },
  { id: 's22', groupId: 'g2', name: 'Артур Казаков',    phone: '+7 906 222-33-44', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 67, testScore: 61, trialScore: null, desiredScore: 78, attendance: 85, lastPayment: '2026-06-03', debt: 0 },
  { id: 's23', groupId: 'g4', name: 'Арина Миронова',   phone: '+7 906 333-44-55', parentContact: '+7 906 333-00-00', startedAt: '10.01.2025', lastVisit: '08.06.2025', hwScore: 93, testScore: 90, trialScore: 88, desiredScore: 96, attendance: 100, lastPayment: '2026-06-05', debt: 0 },
  // g1 — добавочный набор
  { id: 's24', groupId: 'g1', name: 'Богдан Лазарев',    phone: '+7 907 111-22-33', telegramLink: 'bogdan_l', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 79, testScore: 73, trialScore: 70,   desiredScore: 85, attendance: 90, lastPayment: '2026-06-01', debt: 0 },
  { id: 's25', groupId: 'g1', name: 'Вероника Шилова',   phone: '+7 907 222-33-44', parentContact: '+7 907 222-00-00', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 94, testScore: 91, trialScore: 89,   desiredScore: 96, attendance: 99, lastPayment: '2026-06-04', debt: 0 },
  { id: 's26', groupId: 'g1', name: 'Глеб Носов',         phone: '+7 907 333-44-55', startedAt: '01.09.2024', lastVisit: '03.06.2025', hwScore: 48, testScore: 44, trialScore: null, desiredScore: 65, attendance: 68, comment: 'Часто опаздывает', paymentDue: '2026-06-18', paymentAmount: 4500, lastPayment: '2026-05-18', debt: 4500 },
  { id: 's27', groupId: 'g1', name: 'Диана Ковалёва',     phone: '+7 907 444-55-66', telegramLink: 'diana_k', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 86, testScore: 80, trialScore: 77,   desiredScore: 90, attendance: 95, lastPayment: '2026-06-05', debt: 0 },
  { id: 's28', groupId: 'g1', name: 'Егор Панфилов',      phone: '+7 907 555-66-77', startedAt: '01.09.2024', lastVisit: '07.06.2025', hwScore: 64, testScore: 58, trialScore: 55,   desiredScore: 75, attendance: 82, paymentDue: '2026-06-20', paymentAmount: 4500, lastPayment: '2026-05-20', debt: 0 },
  { id: 's29', groupId: 'g1', name: 'Зоя Терентьева',     phone: '+7 907 666-77-88', parentContact: '+7 907 666-00-00', startedAt: '01.09.2024', lastVisit: '09.06.2025', hwScore: 90, testScore: 86, trialScore: 83,   desiredScore: 94, attendance: 98, lastPayment: '2026-06-02', debt: 0 },
  { id: 's30', groupId: 'g1', name: 'Кирилл Авдеев',      phone: '+7 907 777-88-99', telegramLink: 'kirill_a', startedAt: '01.09.2024', lastVisit: '05.06.2025', hwScore: 52, testScore: 47, trialScore: 45,   desiredScore: 68, attendance: 73, comment: 'Нужна дополнительная работа', paymentDue: '2026-06-09', paymentAmount: 4500, lastPayment: '2026-04-09', debt: 9000 },
  { id: 's31', groupId: 'g1', name: 'Лидия Сорокина',     phone: '+7 907 888-99-00', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 77, testScore: 71, trialScore: null, desiredScore: 84, attendance: 91, lastPayment: '2026-06-03', debt: 0 },
  { id: 's32', groupId: 'g1', name: 'Максим Гущин',       phone: '+7 908 111-22-33', startedAt: '01.09.2024', lastVisit: '08.06.2025', hwScore: 71, testScore: 66, trialScore: 64,   desiredScore: 80, attendance: 87, paymentDue: '2026-06-25', paymentAmount: 4500, lastPayment: '2026-05-25', debt: 0 },
  { id: 's33', groupId: 'g1', name: 'Надежда Ермакова',   phone: '+7 908 222-33-44', parentContact: '+7 908 222-00-00', telegramLink: 'nadya_e', startedAt: '01.09.2024', lastVisit: '10.06.2025', hwScore: 83, testScore: 79, trialScore: 76,   desiredScore: 89, attendance: 96, lastPayment: '2026-06-06', debt: 0 },
]

export const todaySchedule: ScheduleItem[] = [
  {
    id: 'sc1', time: '12:00', endTime: '13:30', groupId: 'g1',
    groupName: 'ЕГЭ-Хим Атомы', subject: 'Химия ЕГЭ', icon: '🧪', lessonNumber: 34,
    topic: 'Гидролиз солей', studentCount: 8, status: 'completed',
    color: '#B98FFF', colorSoft: '#EFE0FF',
  },
  {
    id: 'sc2', time: '15:00', endTime: '16:30', groupId: 'g2',
    groupName: 'ЕГЭ-Хим Молекулы', subject: 'Химия ЕГЭ', icon: '🧪', lessonNumber: 34,
    topic: 'Гидролиз солей', studentCount: 12, status: 'upcoming',
    color: '#9B6DFF', colorSoft: '#E4D9FF',
  },
  {
    id: 'sc3', time: '18:00', endTime: '19:30', groupId: 'g4',
    groupName: 'ЕГЭ-Био Хлорофилл', subject: 'Биология ЕГЭ', icon: '🌿', lessonNumber: 18,
    topic: 'Фотосинтез и дыхание', studentCount: 10, status: 'upcoming',
    color: '#5FD68A', colorSoft: '#D6F5E3',
  },
]

// Course lessons available for linking when creating homework.
export type CourseLesson = {
  id: string
  courseTitle: string
  lessonTitle: string
  subject: string
}

export const courseLessons: CourseLesson[] = [
  { id: 'cl1', courseTitle: 'ЕГЭ по Химии — Полный курс', lessonTitle: 'Периодический закон',   subject: 'Химия' },
  { id: 'cl2', courseTitle: 'ЕГЭ по Химии — Полный курс', lessonTitle: 'Гидролиз солей',         subject: 'Химия' },
  { id: 'cl3', courseTitle: 'ЕГЭ по Химии — Полный курс', lessonTitle: 'Органические реакции',   subject: 'Химия' },
  { id: 'cl4', courseTitle: 'ОГЭ по Химии — Базовый',     lessonTitle: 'Кислоты и основания',    subject: 'Химия' },
  { id: 'cl5', courseTitle: 'ОГЭ по Химии — Базовый',     lessonTitle: 'Соли и реакции',         subject: 'Химия' },
  { id: 'cl6', courseTitle: 'ЕГЭ по Биологии — 2025',     lessonTitle: 'Фотосинтез',             subject: 'Биология' },
]

// Homework templates the teacher has prepared in the constructor. A lesson can
// attach one basic + one hard template; the editor suggests matches by topic.
export type HomeworkTemplate = {
  id: string
  title: string
  subject: 'Химия' | 'Биология'
  level: 'basic' | 'hard'
  topic: string
  taskCount: number
}

export const homeworkTemplates: HomeworkTemplate[] = [
  { id: 't1',  title: 'Гидролиз солей — базовый',          subject: 'Химия',    level: 'basic', topic: 'Гидролиз солей',        taskCount: 8 },
  { id: 't2',  title: 'Гидролиз: сложные случаи',          subject: 'Химия',    level: 'hard',  topic: 'Гидролиз солей',        taskCount: 5 },
  { id: 't3',  title: 'Основные оксиды — базовый',         subject: 'Химия',    level: 'basic', topic: 'Оксиды',                taskCount: 10 },
  { id: 't4',  title: 'Сложные оксиды — продвинутый',      subject: 'Химия',    level: 'hard',  topic: 'Оксиды',                taskCount: 6 },
  { id: 't5',  title: 'Фотосинтез — схемы',                subject: 'Биология', level: 'basic', topic: 'Фотосинтез',            taskCount: 10 },
  { id: 't6',  title: 'Фотосинтез и дыхание — задачи C',   subject: 'Биология', level: 'hard',  topic: 'Фотосинтез',            taskCount: 4 },
  { id: 't7',  title: 'ОВР — базовый',                     subject: 'Химия',    level: 'basic', topic: 'Окислительно',          taskCount: 9 },
  { id: 't8',  title: 'ОВР — метод электронного баланса',  subject: 'Химия',    level: 'hard',  topic: 'Окислительно',          taskCount: 5 },
  { id: 't9',  title: 'Периодический закон',               subject: 'Химия',    level: 'basic', topic: 'Периодический',         taskCount: 12 },
  { id: 't10', title: 'Кислоты: классификация',           subject: 'Химия',    level: 'basic', topic: 'Кислоты',               taskCount: 6 },
]

export const pendingHomework: HomeworkItem[] = [
  {
    id: 'hw1', groupId: 'g1', groupName: 'ЕГЭ-Хим Атомы', icon: '🧪',
    title: 'Задачи на гидролиз', assignedAt: '05.06', dueDate: '09.06',
    submittedCount: 7, totalCount: 8, reviewedCount: 0, color: '#B98FFF',
    tasks: [
      { id: 't1', title: 'Задание 1. Составить уравнение гидролиза', maxScore: 30 },
      { id: 't2', title: 'Задание 2. Определить среду раствора', maxScore: 20 },
      { id: 't3', title: 'Задание 3. Расставить коэффициенты', maxScore: 30 },
      { id: 't4', title: 'Задание 4. Задача с объяснением', maxScore: 20 },
    ],
  },
  {
    id: 'hw2', groupId: 'g2', groupName: 'ЕГЭ-Хим Молекулы', icon: '🧪',
    title: 'Окислительно-восстановительные реакции', assignedAt: '07.06', dueDate: '10.06',
    submittedCount: 5, totalCount: 12, reviewedCount: 2, color: '#9B6DFF',
    tasks: [
      { id: 't1', title: 'Задание 1. Определить окислитель и восстановитель', maxScore: 25 },
      { id: 't2', title: 'Задание 2. Метод электронного баланса', maxScore: 40 },
      { id: 't3', title: 'Задание 3. Составить схему реакции', maxScore: 35 },
    ],
  },
  {
    id: 'hw3', groupId: 'g4', groupName: 'ЕГЭ-Био Хлорофилл', icon: '🌿',
    title: 'Фотосинтез — схемы', assignedAt: '08.06', dueDate: '11.06',
    submittedCount: 4, totalCount: 10, reviewedCount: 0, color: '#5FD68A',
    tasks: [
      { id: 't1', title: 'Задание 1. Световая фаза', maxScore: 40 },
      { id: 't2', title: 'Задание 2. Тёмновая фаза', maxScore: 40 },
      { id: 't3', title: 'Задание 3. Схема хлоропласта', maxScore: 20 },
    ],
  },
]

// Full homework log shown on the ДЗ page — pending items plus already-graded
// ones. groupName is always the real group name so the per-group filter shows
// exactly the topics assigned to that group.
const extraHomework: HomeworkItem[] = [
  { id: 'hw4', groupId: 'g1', groupName: 'ЕГЭ-Хим Атомы',     title: 'Термодинамика — задачи',  assignedAt: '01.06', dueDate: '05.06', submittedCount: 8,  totalCount: 8,  reviewedCount: 8,  color: '#B98FFF' },
  { id: 'hw5', groupId: 'g2', groupName: 'ЕГЭ-Хим Молекулы',  title: 'Периодический закон',     assignedAt: '03.06', dueDate: '07.06', submittedCount: 12, totalCount: 12, reviewedCount: 12, color: '#9B6DFF' },
  { id: 'hw6', groupId: 'g3', groupName: 'ОГЭ-Хим Ионы',      title: 'Кислоты: классификация',  assignedAt: '04.06', dueDate: '08.06', submittedCount: 6,  totalCount: 6,  reviewedCount: 6,  color: '#C58BFF' },
  { id: 'hw7', groupId: 'g4', groupName: 'ЕГЭ-Био Хлорофилл', title: 'Процессы фотосинтеза',    assignedAt: '02.06', dueDate: '06.06', submittedCount: 10, totalCount: 10, reviewedCount: 10, color: '#5FD68A' },
  { id: 'hw8', groupId: 'g3', groupName: 'ОГЭ-Хим Ионы',      title: 'Реакции ионного обмена',  assignedAt: '06.06', dueDate: '10.06', submittedCount: 5,  totalCount: 6,  reviewedCount: 0,  color: '#C58BFF' },
  { id: 'hw9', groupId: 'g6', groupName: 'ЕГЭ-Хим Реакции',   title: 'Скорость реакции',        assignedAt: '05.06', dueDate: '09.06', submittedCount: 7,  totalCount: 9,  reviewedCount: 3,  color: '#FF7A5C' },
]

export const allHomework: HomeworkItem[] = [...pendingHomework, ...extraHomework]

export const reminders: Reminder[] = [
  { id: 'r1', type: 'check-hw', text: 'Проверить ДЗ — ЕГЭ-Хим Атомы', detail: '7 работ ждут', urgency: 'high' },
  { id: 'r2', type: 'check-hw', text: 'Проверить ДЗ — ЕГЭ-Хим Молекулы', detail: '5 работ ждут', urgency: 'high' },
  { id: 'r3', type: 'fill-widget', text: 'Заполнить виджеты — Органика', detail: 'урок 35', urgency: 'medium' },
  { id: 'r4', type: 'make-trainer', text: 'Составить тренажёр', detail: 'Тема: Кислоты', urgency: 'low' },
]

export const recentActivity: RecentActivity[] = [
  { id: 'a1', studentName: 'Виктория Козлова', groupName: 'ЕГЭ-11А', action: 'submitted-hw', detail: 'Гидролиз солей', time: '2 ч назад' },
  { id: 'a2', studentName: 'Карина Белова', groupName: 'ЕГЭ-11Б', action: 'submitted-hw', detail: 'ОВР — задача №4', time: '3 ч назад' },
  { id: 'a3', studentName: 'Алиса Смирнова', groupName: 'ЕГЭ-11А', action: 'scored', detail: 'Тест: 88/100', time: '5 ч назад' },
  { id: 'a4', studentName: 'Мария Кузнецова', groupName: 'ОГЭ-9А', action: 'visited', detail: 'Посетила урок 22', time: 'вчера' },
]

// The students who submitted a given homework — the first `submittedCount`
// students of its group, matching how the detail panel lists them.
export function getSubmitters(hw: HomeworkItem): Student[] {
  return students.filter(s => s.groupId === hw.groupId).slice(0, hw.submittedCount)
}

export function getTotalPendingHw(homework: HomeworkItem[]) {
  return homework.reduce((acc, hw) => acc + (hw.submittedCount - hw.reviewedCount), 0)
}

export function getAvgScore(studentList: Student[]) {
  const scores = studentList.map(s => s.testScore)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
