const prefix = '#/teacher/student/'

export function teacherStudentHash(studentId: string) {
  return prefix + encodeURIComponent(studentId)
}

export function studentIdFromTeacherHash(hash: string): string | null {
  if (!hash.startsWith(prefix)) return null
  const id = hash.slice(prefix.length)
  return /^[\w-]+$/.test(id) ? id : null
}
