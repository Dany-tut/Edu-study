// Centralised API client. All fetch calls go through here.
// studentId comes from env (set per-deploy or per-user session).
export const STUDENT_ID = import.meta.env.VITE_STUDENT_ID ?? 'default'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Subjects / Lessons ────────────────────────────────────────────────────────

export function fetchSubjects() {
  return request<SubjectDTO[]>(`/subjects?studentId=${STUDENT_ID}`)
}

export function fetchLesson(id: string) {
  return request<LessonDetailDTO>(`/lessons/${id}`)
}

export function updateLesson(id: string, data: Partial<{ youtubeUrl: string; description: string; materials: unknown[]; isPublished: boolean }>) {
  return request(`/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export function fetchSchedule() {
  return request<ScheduleItemDTO[]>('/schedule')
}

// ── Homework ──────────────────────────────────────────────────────────────────

export function fetchHomeworkQuestions(lessonId: string) {
  return request<HomeworkQuestionDTO[]>(`/homework/${lessonId}/questions`)
}

export function fetchHomeworkAttempt(lessonId: string) {
  return request<HomeworkAttemptDTO | null>(`/homework/${lessonId}/attempt?studentId=${STUDENT_ID}`)
}

export function submitHomework(lessonId: string, answers: number[], score: number, total: number) {
  return request<HomeworkAttemptDTO>(`/homework/${lessonId}/attempt`, {
    method: 'POST',
    body: JSON.stringify({ studentId: STUDENT_ID, answers, score, total }),
  })
}

// ── Students ──────────────────────────────────────────────────────────────────

export function fetchStudent(id: string) {
  return request<StudentDTO>(`/students/${id}`)
}

export function fetchAllStudents() {
  return request<StudentDTO[]>('/students')
}

export function updateLessonProgress(studentId: string, lessonId: string, status: string, points?: number, comment?: string) {
  return request(`/students/${studentId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ lessonId, status, points, comment }),
  })
}

// ── DTOs (shapes returned by the API) ────────────────────────────────────────

export interface LessonDTO {
  id: string
  title: string
  number: number
  shape: string
  youtubeUrl: string | null
  description: string | null
  materials: unknown[] | null
  subject: string       // subject id
  status: string        // from LessonProgress
  points: number | null
  comment: string | null
}

export interface ModuleDTO {
  id: string
  label: string
  lessons: LessonDTO[]
}

export interface SubjectDTO {
  id: string
  name: string
  emoji: string | null
  modules: ModuleDTO[]
}

export interface LessonDetailDTO extends LessonDTO {
  homeworkQuestions: HomeworkQuestionDTO[]
}

export interface HomeworkQuestionDTO {
  id: string
  lessonId: string
  question: string
  options: string[]
  correctIndex: number
  order: number
}

export interface HomeworkAttemptDTO {
  id: string
  studentId: string
  lessonId: string
  answers: number[]
  score: number
  total: number
  submittedAt: string
}

export interface ScheduleItemDTO {
  id: string
  lessonId: string
  dayOffset: number
  time: string
  subject: string
  passed: boolean
  lesson: {
    id: string
    title: string
    module: { subject: { id: string; name: string } }
  }
}

export interface StudentDTO {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  stats: {
    performance: number
    completedTasks: number
    totalTasks: number
    avgScore: number
    streak: number
    totalPoints: number
  } | null
}
