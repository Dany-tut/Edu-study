// Course access is independent of membership in a teaching group.
export type StudentCourseAssignment = {
  id: string
  title: string
  student_ids: string[] | null
  group_ids: string[] | null
}

export function assignedCourseTitles(
  students: { id: string; groupId?: string | null }[],
  courses: StudentCourseAssignment[],
): string[] {
  const ids = new Set(students.map(s => s.id))
  const groupIds = new Set(students.map(s => s.groupId).filter(Boolean))
  return [...new Set(courses.filter(c =>
    c.student_ids?.some(id => ids.has(id)) || c.group_ids?.some(id => groupIds.has(id)),
  ).map(c => c.title))]
}
