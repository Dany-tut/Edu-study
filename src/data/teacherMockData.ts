export type OnlineStudent = {
  id: string
  initials: string
  color: string
  name: string
}

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
  isIndividual?: boolean
}

export type Student = {
  id: string
  authUserId?: string
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
  status?: string
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

export type CourseLesson = {
  id: string
  courseTitle: string
  lessonTitle: string
  subject: string
}

export type HomeworkTemplate = {
  id: string
  title: string
  subject: 'Химия' | 'Биология'
  level: 'basic' | 'hard'
  topic: string
  taskCount: number
}

export function getTotalPendingHw(homework: HomeworkItem[]) {
  return homework.reduce((acc, hw) => acc + (hw.submittedCount - hw.reviewedCount), 0)
}

export function getAvgScore(studentList: Student[]) {
  const scores = studentList.map(s => s.testScore)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
