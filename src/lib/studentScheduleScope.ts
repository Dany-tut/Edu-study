/** A person's calendar covers the same student rows and groups as their track. */
export function studentScheduleScope(rows: Array<{ id: string; groupId: string }>): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return [
    ...[...new Set(rows.map(row => row.groupId))].filter(id => uuid.test(id)).map(id => `group_id.eq.${id}`),
    ...[...new Set(rows.map(row => row.id))].filter(id => uuid.test(id)).map(id => `student_id.eq.${id}`),
  ]
}
