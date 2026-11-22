export type CourseItemKind = 'module' | 'lesson'
export type CourseVisibilityRow = { item_kind: CourseItemKind; item_key: string; hidden: boolean }

/** The database protects student reads; this also filters a teacher's preview. */
export function visibleCourseModules<T extends { id: string; lessons: Array<{ short_id: string }> }>(modules: T[], rows: CourseVisibilityRow[]): T[] {
  const hidden = new Set(rows.filter(r => r.hidden).map(r => `${r.item_kind}:${r.item_key}`))
  return modules.filter(m => !hidden.has(`module:${m.id}`)).map(m => ({
    ...m, lessons: m.lessons.filter(l => !hidden.has(`lesson:${l.short_id}`)),
  }))
}
