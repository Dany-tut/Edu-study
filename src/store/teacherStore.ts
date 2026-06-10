import { create } from 'zustand'

export type TeacherPage = 'home' | 'groups' | 'homework' | 'gradebook' | 'constructor'

type TeacherStore = {
  activePage: TeacherPage
  setActivePage: (page: TeacherPage) => void
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
}

export const useTeacher = create<TeacherStore>(set => ({
  activePage: 'home',
  setActivePage: page => set({ activePage: page }),
  selectedGroupId: null,
  setSelectedGroupId: id => set({ selectedGroupId: id }),
  selectedStudentId: null,
  setSelectedStudentId: id => set({ selectedStudentId: id }),
}))
