const KEY = 'student_session'

export type StudentSession = { id: string; name: string; groupId: string }

export function getStudentSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StudentSession) : null
  } catch {
    return null
  }
}

export function setStudentSession(s: StudentSession) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function clearStudentSession() {
  localStorage.removeItem(KEY)
}
