import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type TeacherPage = 'home' | 'groups' | 'homework' | 'homework-create' | 'homework-review' | 'hard-review' | 'lesson-editor' | 'gradebook' | 'constructor' | 'student' | 'course-editor' | 'storage' | 'admin' | 'profile-settings' | 'payment' | 'finances'

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
  /** Карточка ученика, о которой задача (students.id). Клик по задаче ведёт в неё. */
  studentId?: string | null
  /** Её группа — нужна, чтобы открыть карточку (openStudentDashboard). */
  groupId?: string | null
}

// ── teacher_tasks row ⇄ TeacherTask mapping ──────────────────────────────────
// The DB uses snake_case columns (and quotes "time"/"date" as they are reserved
// words); the store keeps the camelCase shape the widgets already consume.
type TaskRow = {
  id: string
  type_id: string | null
  type_label: string | null
  type_bg: string | null
  type_color: string | null
  title: string | null
  date: string | null
  time: string | null
  comment: string | null
  done: boolean | null
  student_id?: string | null
  group_id?: string | null
}
function rowToTask(r: TaskRow): TeacherTask {
  return {
    id: r.id,
    typeId: r.type_id,
    typeLabel: r.type_label,
    typeBg: r.type_bg,
    typeColor: r.type_color,
    title: r.title ?? '',
    date: r.date ?? '',
    time: r.time ?? '',
    comment: r.comment ?? '',
    done: r.done ?? false,
    studentId: r.student_id ?? null,
    groupId: r.group_id ?? null,
  }
}
function taskToRow(t: Partial<TeacherTask>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if ('typeId' in t)    row.type_id    = t.typeId
  if ('typeLabel' in t) row.type_label = t.typeLabel
  if ('typeBg' in t)    row.type_bg    = t.typeBg
  if ('typeColor' in t) row.type_color = t.typeColor
  if ('title' in t)     row.title      = t.title
  if ('date' in t)      row.date       = t.date
  if ('time' in t)      row.time       = t.time
  if ('comment' in t)   row.comment    = t.comment
  if ('done' in t)      row.done       = t.done
  // Ссылку на карточку пишем ТОЛЬКО когда она есть: у обычной задачи ключей нет
  // вовсе, и строка уходит в базу без этих колонок.
  if ('studentId' in t) row.student_id = t.studentId
  if ('groupId' in t)   row.group_id   = t.groupId
  return row
}

type TeacherStore = {
  activePage: TeacherPage
  setActivePage: (page: TeacherPage) => void
  // One-shot: when navigating to gradebook from a reminder, pre-open a specific lesson.
  pendingGradebookLessonId: string | null
  openGradebook: (scheduleId?: string) => void
  clearPendingGradebookLesson: () => void
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
  // Incremented when the user clicks "Конструктор" nav while already on the constructor page.
  // The constructor page listens to this to auto-save draft and return to the list.
  constructorBackTick: number
  triggerConstructorBack: () => void
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
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  openStudentDashboard: (studentId: string, groupId: string) => void
  tasks: TeacherTask[]
  tasksLoaded: boolean
  loadTasks: () => Promise<void>
  addTask: (task: Omit<TeacherTask, 'id' | 'done'>) => void
  updateTask: (id: string, task: Omit<TeacherTask, 'id' | 'done'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  studentTrainerStats: StudentTrainerStats | null
  saveStudentTrainerStats: (stats: Omit<StudentTrainerStats, 'savedAt'>) => void
}

// Standalone pages that can be restored purely from their URL hash (no extra
// context needed). Every entry here round-trips through PAGE_TO_HASH so a refresh
// lands the teacher back on the same section — including admin/finances/storage.
export const HASH_TO_PAGE: Record<string, TeacherPage> = {
  '#/teacher':             'home',
  '#/teacher/groups':      'groups',
  '#/teacher/homework':    'homework',
  '#/teacher/gradebook':   'gradebook',
  '#/teacher/constructor': 'constructor',
  '#/teacher/finances':    'finances',
  '#/teacher/storage':     'storage',
  '#/teacher/admin':       'admin',
  '#/teacher/profile':     'profile-settings',
  '#/teacher/payment':     'payment',
}
export const PAGE_TO_HASH: Record<string, string> = Object.fromEntries(
  Object.entries(HASH_TO_PAGE).map(([hash, page]) => [page, hash])
)

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

// Per-tab navigation snapshot. Context-heavy sub-pages (student dashboard, HW
// review, HW composer, hard review, lesson editor) have no URL hash of their own,
// so on refresh we restore both the page AND the ids those pages need to re-fetch.
// sessionStorage is per-tab, so a fresh tab / deep-link starts clean and honours
// the URL hash instead.
const NAV_SESSION_KEY = 'teacher-nav'
type NavSnapshot = {
  page: TeacherPage
  selectedGroupId: string | null
  selectedStudentId: string | null
  reviewingHwId: string | null
  reviewingHardId: string | null
  editingHomeworkId: string | null
  hwPresetStudentId: string | null
  editingScheduleId: string | null
}
function readNav(): NavSnapshot | null {
  try { const raw = sessionStorage.getItem(NAV_SESSION_KEY); return raw ? JSON.parse(raw) as NavSnapshot : null } catch { return null }
}
function writeNav(s: TeacherStore) {
  try {
    sessionStorage.setItem(NAV_SESSION_KEY, JSON.stringify({
      page: s.activePage,
      selectedGroupId: s.selectedGroupId,
      selectedStudentId: s.selectedStudentId,
      reviewingHwId: s.reviewingHwId,
      reviewingHardId: s.reviewingHardId,
      editingHomeworkId: s.editingHomeworkId,
      hwPresetStudentId: s.hwPresetStudentId,
      editingScheduleId: s.editingScheduleId,
    } satisfies NavSnapshot))
  } catch { /* unavailable — non-fatal */ }
}

const _nav = readNav()

function initialPage(): TeacherPage {
  if (readEditorSession()) return 'course-editor'
  // The per-tab snapshot is the freshest record of where this tab was.
  // (course-editor is owned by the editor session above, so ignore it here.)
  if (_nav?.page && _nav.page !== 'course-editor') return _nav.page
  return HASH_TO_PAGE[window.location.hash] ?? 'home'
}

export const useTeacher = create<TeacherStore>(set => ({
  activePage: initialPage(),
  setActivePage: page => { clearEditorSession(); set({ activePage: page, headerDocked: false }) },
  pendingGradebookLessonId: null,
  openGradebook: scheduleId => { clearEditorSession(); set({ activePage: 'gradebook', headerDocked: false, pendingGradebookLessonId: scheduleId ?? null }) },
  clearPendingGradebookLesson: () => set({ pendingGradebookLessonId: null }),
  editingCourseJson: readEditorSession(),
  openCourseEditor: courseJson => {
    try { sessionStorage.setItem(EDITOR_SESSION_KEY, courseJson) } catch { /* non-fatal */ }
    set({ editingCourseJson: courseJson, activePage: 'course-editor', headerDocked: false })
  },
  courseEditedJson: null,
  setCourseEdited: json => set({ courseEditedJson: json }),
  headerDocked: false,
  setHeaderDocked: docked => set({ headerDocked: docked }),
  editingScheduleId: _nav?.editingScheduleId ?? null,
  openLessonEditor: scheduleId => set({ editingScheduleId: scheduleId, activePage: 'lesson-editor', headerDocked: false }),
  constructorIntent: null,
  openConstructor: mode => set({ activePage: 'constructor', constructorIntent: mode, headerDocked: false }),
  clearConstructorIntent: () => set({ constructorIntent: null }),
  constructorBackTick: 0,
  triggerConstructorBack: () => set(s => ({ constructorBackTick: s.constructorBackTick + 1 })),
  editTaskIntent: null,
  openConstructorEditTask: taskId => set({ activePage: 'constructor', editTaskIntent: taskId, constructorIntent: 'trainer', headerDocked: false }),
  clearEditTaskIntent: () => set({ editTaskIntent: null }),
  reviewingHwId: _nav?.reviewingHwId ?? null,
  openHomeworkReview: hwId => set({ reviewingHwId: hwId, activePage: 'homework-review', reviewIdx: 0, headerDocked: false }),
  editingHomeworkId: _nav?.editingHomeworkId ?? null,
  hwPresetStudentId: _nav?.hwPresetStudentId ?? null,
  openHomeworkCreate: presetStudentId => set({ activePage: 'homework-create', editingHomeworkId: null, hwPresetStudentId: presetStudentId ?? null, headerDocked: false }),
  clearHwPreset: () => set({ hwPresetStudentId: null }),
  openHomeworkEdit: hwId => set({ activePage: 'homework-create', editingHomeworkId: hwId, hwPresetStudentId: null, headerDocked: false }),
  reviewingHardId: _nav?.reviewingHardId ?? null,
  openHardReview: hardId => set({ reviewingHardId: hardId, activePage: 'hard-review', headerDocked: false }),
  reviewIdx: 0,
  setReviewIdx: idx => set({ reviewIdx: idx }),
  selectedGroupId: _nav?.selectedGroupId ?? null,
  setSelectedGroupId: id => set({ selectedGroupId: id }),
  selectedStudentId: _nav?.selectedStudentId ?? null,
  setSelectedStudentId: id => set({ selectedStudentId: id }),
  openStudentDashboard: (studentId, groupId) => set({ activePage: 'student', selectedStudentId: studentId, selectedGroupId: groupId, headerDocked: false }),
  // Tasks are per-teacher and persisted in the `teacher_tasks` table, scoped by
  // owner (created_by = auth.uid()) via RLS. loadTasks() hydrates them once the
  // teacher cabinet mounts; the mutators write through to the DB optimistically.
  tasks: [],
  tasksLoaded: false,
  loadTasks: async () => {
    const { data } = await supabase
      .from('teacher_tasks')
      .select('*')
      .order('created_at', { ascending: true })
    set({ tasks: (data ?? []).map(rowToTask), tasksLoaded: true })
  },
  addTask: task => {
    // crypto.randomUUID() so the local id matches the DB row id — no reconcile.
    const id = crypto.randomUUID()
    set(s => ({ tasks: [...s.tasks, { ...task, id, done: false }] }))
    supabase.from('teacher_tasks').insert({ id, ...taskToRow({ ...task, id, done: false }) })
      .then(({ error }) => { if (error) console.warn('addTask persist failed', error.message) })
  },
  updateTask: (id, task) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...task } : t) }))
    supabase.from('teacher_tasks').update(taskToRow(task)).eq('id', id)
      .then(({ error }) => { if (error) console.warn('updateTask persist failed', error.message) })
  },
  toggleTask: id => {
    const next = !useTeacher.getState().tasks.find(t => t.id === id)?.done
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done: next } : t) }))
    supabase.from('teacher_tasks').update({ done: next }).eq('id', id)
      .then(({ error }) => { if (error) console.warn('toggleTask persist failed', error.message) })
  },
  removeTask: id => {
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    supabase.from('teacher_tasks').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('removeTask persist failed', error.message) })
  },
  studentTrainerStats: null,
  saveStudentTrainerStats: stats => set({ studentTrainerStats: { ...stats, savedAt: Date.now() } }),
}))

// Persist the navigation snapshot on every state change so a refresh restores the
// exact section the teacher was on (admin, finances, a student dashboard, …).
useTeacher.subscribe(writeNav)
