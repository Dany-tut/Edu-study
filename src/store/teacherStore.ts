import { create } from 'zustand'

export type TeacherPage = 'home' | 'groups' | 'homework' | 'homework-create' | 'homework-review' | 'lesson-editor' | 'gradebook' | 'constructor'

export type HwReview = {
  verdict: 'accepted' | 'returned'
  score: number
  comment: string
}

export type TeacherTask = {
  id: string
  typeId: string | null
  typeLabel: string | null
  typeBg: string | null
  typeColor: string | null
  title: string
  date: string
  time: string
  comment: string
  done: boolean
}

type TeacherStore = {
  activePage: TeacherPage
  setActivePage: (page: TeacherPage) => void
  editingScheduleId: string | null
  openLessonEditor: (scheduleId: string | null) => void
  reviewingHwId: string | null
  openHomeworkReview: (hwId: string) => void
  // hwId -> studentId -> verdict the teacher gave while reviewing
  reviews: Record<string, Record<string, HwReview>>
  submitReview: (hwId: string, studentId: string, review: HwReview) => void
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  tasks: TeacherTask[]
  addTask: (task: Omit<TeacherTask, 'id' | 'done'>) => void
  updateTask: (id: string, task: Omit<TeacherTask, 'id' | 'done'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
}

export const useTeacher = create<TeacherStore>(set => ({
  activePage: 'home',
  setActivePage: page => set({ activePage: page }),
  editingScheduleId: null,
  openLessonEditor: scheduleId => set({ editingScheduleId: scheduleId, activePage: 'lesson-editor' }),
  reviewingHwId: null,
  openHomeworkReview: hwId => set({ reviewingHwId: hwId, activePage: 'homework-review' }),
  reviews: {},
  submitReview: (hwId, studentId, review) => set(s => ({
    reviews: { ...s.reviews, [hwId]: { ...(s.reviews[hwId] ?? {}), [studentId]: review } },
  })),
  selectedGroupId: null,
  setSelectedGroupId: id => set({ selectedGroupId: id }),
  selectedStudentId: null,
  setSelectedStudentId: id => set({ selectedStudentId: id }),
  tasks: [],
  addTask: task => set(s => ({
    tasks: [...s.tasks, { ...task, id: Math.random().toString(36).slice(2), done: false }],
  })),
  updateTask: (id, task) => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...task } : t),
  })),
  toggleTask: id => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
  })),
  removeTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
}))
