const KEY = 'student_session'

export type StudentSession = { id: string; name: string; groupId: string }

export function getStudentSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<StudentSession> | null
    // Легаси/битые сессии (старый формат без id, "undefined" в полях) не должны
    // прикидываться валидными: без id кабинет всё равно ничего не загрузит, а
    // undefined в запросах даёт 400 `invalid uuid: "undefined"`. groupId
    // нормализуем в '' — его отсутствие переживаемо (курсы находятся по id).
    if (!s || typeof s.id !== 'string' || !s.id || s.id === 'undefined') return null
    return {
      id: s.id,
      name: typeof s.name === 'string' ? s.name : '',
      groupId: typeof s.groupId === 'string' && s.groupId !== 'undefined' ? s.groupId : '',
    }
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
