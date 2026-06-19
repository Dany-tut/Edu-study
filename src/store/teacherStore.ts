import { create } from 'zustand'

export type TeacherPage = 'home' | 'groups' | 'homework' | 'homework-create' | 'homework-review' | 'hard-review' | 'lesson-editor' | 'gradebook' | 'constructor' | 'student' | 'course-editor'

export type StudentTrainerStats = {
  doneCount: number
  wrongCount: number
  totalCount: number
  favCount: number
  todayCorrect: number
  todayWrong: number
  subject: string
  savedAt: number
}

export type HwReview = {
  verdict: 'accepted' | 'returned'
  score: number
  taskScores?: Record<string, number>
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
  // Course editor — JSON-serialized course data passed between constructor and editor pages
  editingCourseJson: string | null
  openCourseEditor: (courseJson: string) => void
  courseEditedJson: string | null
  setCourseEdited: (json: string | null) => void
  // True while a page's fixed "docked twin" header occupies the topbar line —
  // the top-right widget slot hides so the docked controls aren't covered.
  headerDocked: boolean
  setHeaderDocked: (docked: boolean) => void
  editingScheduleId: string | null
  openLessonEditor: (scheduleId: string | null) => void
  // One-shot signal: open the Constructor straight into a creator view.
  // The Constructor page consumes it on mount, then calls clearConstructorIntent.
  constructorIntent: 'course' | 'trainer' | 'widget' | null
  openConstructor: (mode: 'course' | 'trainer' | 'widget') => void
  clearConstructorIntent: () => void
  editTaskIntent: number | null
  openConstructorEditTask: (taskId: number) => void
  clearEditTaskIntent: () => void
  reviewingHwId: string | null
  openHomeworkReview: (hwId: string) => void
  // Homework composer: null id = create new, set id = edit existing.
  editingHomeworkId: string | null
  // Optional student to pre-scope a fresh "ДЗ допом" to (consumed by the composer on mount).
  hwPresetStudentId: string | null
  openHomeworkCreate: (presetStudentId?: string) => void
  clearHwPreset: () => void
  openHomeworkEdit: (hwId: string) => void
  // Full-screen hard-submission review (lesson_progress id).
  reviewingHardId: string | null
  openHardReview: (hardId: string) => void
  reviewIdx: number
  setReviewIdx: (idx: number) => void
  // hwId -> studentId -> verdict the teacher gave while reviewing
  reviews: Record<string, Record<string, HwReview>>
  submitReview: (hwId: string, studentId: string, review: HwReview) => void
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  openStudentDashboard: (studentId: string, groupId: string) => void
  tasks: TeacherTask[]
  addTask: (task: Omit<TeacherTask, 'id' | 'done'>) => void
  updateTask: (id: string, task: Omit<TeacherTask, 'id' | 'done'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  studentTrainerStats: StudentTrainerStats | null
  saveStudentTrainerStats: (stats: Omit<StudentTrainerStats, 'savedAt'>) => void
}

const HASH_TO_PAGE: Record<string, TeacherPage> = {
  '#/teacher':             'home',
  '#/teacher/groups':      'groups',
  '#/teacher/homework':    'homework',
  '#/teacher/gradebook':   'gradebook',
  '#/teacher/constructor': 'constructor',
}

// The course editor is a sub-page with no URL hash of its own. To survive a page
// refresh (so the teacher lands back in the course/lesson they were editing) we
// stash the live course JSON in sessionStorage while the editor is open.
const EDITOR_SESSION_KEY = 'ce-session'
function readEditorSession(): string | null {
  try { return sessionStorage.getItem(EDITOR_SESSION_KEY) } catch { return null }
}
function clearEditorSession() {
  try { sessionStorage.removeItem(EDITOR_SESSION_KEY) } catch { /* unavailable — non-fatal */ }
}

function initialPage(): TeacherPage {
  if (readEditorSession()) return 'course-editor'
  return HASH_TO_PAGE[window.location.hash] ?? 'home'
}

export const useTeacher = create<TeacherStore>(set => ({
  activePage: initialPage(),
  setActivePage: page => { clearEditorSession(); set({ activePage: page, headerDocked: false }) },
  editingCourseJson: readEditorSession(),
  openCourseEditor: courseJson => {
    try { sessionStorage.setItem(EDITOR_SESSION_KEY, courseJson) } catch { /* non-fatal */ }
    set({ editingCourseJson: courseJson, activePage: 'course-editor', headerDocked: false })
  },
  courseEditedJson: null,
  setCourseEdited: json => set({ courseEditedJson: json }),
  headerDocked: false,
  setHeaderDocked: docked => set({ headerDocked: docked }),
  editingScheduleId: null,
  openLessonEditor: scheduleId => set({ editingScheduleId: scheduleId, activePage: 'lesson-editor', headerDocked: false }),
  constructorIntent: null,
  openConstructor: mode => set({ activePage: 'constructor', constructorIntent: mode, headerDocked: false }),
  clearConstructorIntent: () => set({ constructorIntent: null }),
  editTaskIntent: null,
  openConstructorEditTask: taskId => set({ activePage: 'constructor', editTaskIntent: taskId, constructorIntent: 'trainer', headerDocked: false }),
  clearEditTaskIntent: () => set({ editTaskIntent: null }),
  reviewingHwId: null,
  openHomeworkReview: hwId => set({ reviewingHwId: hwId, activePage: 'homework-review', reviewIdx: 0, headerDocked: false }),
  editingHomeworkId: null,
  hwPresetStudentId: null,
  openHomeworkCreate: presetStudentId => set({ activePage: 'homework-create', editingHomeworkId: null, hwPresetStudentId: presetStudentId ?? null, headerDocked: false }),
  clearHwPreset: () => set({ hwPresetStudentId: null }),
  openHomeworkEdit: hwId => set({ activePage: 'homework-create', editingHomeworkId: hwId, hwPresetStudentId: null, headerDocked: false }),
  reviewingHardId: null,
  openHardReview: hardId => set({ reviewingHardId: hardId, activePage: 'hard-review', headerDocked: false }),
  reviewIdx: 0,
  setReviewIdx: idx => set({ reviewIdx: idx }),
  reviews: {},
  submitReview: (hwId, studentId, review) => set(s => ({
    reviews: { ...s.reviews, [hwId]: { ...(s.reviews[hwId] ?? {}), [studentId]: review } },
  })),
  selectedGroupId: null,
  setSelectedGroupId: id => set({ selectedGroupId: id }),
  selectedStudentId: null,
  setSelectedStudentId: id => set({ selectedStudentId: id }),
  openStudentDashboard: (studentId, groupId) => set({ activePage: 'student', selectedStudentId: studentId, selectedGroupId: groupId, headerDocked: false }),
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
  studentTrainerStats: null,
  saveStudentTrainerStats: stats => set({ studentTrainerStats: { ...stats, savedAt: Date.now() } }),
}))
