type EditorModule = { id: string; label: string }
type SavedModule = { id: string; label: string; position: number }
export type CourseModuleWrite = {
  kind: 'update' | 'insert'
  id: string
  values: { label: string; position: number }
}

/** Compare only fields owned by content save, using the resolved stable UUID.
 * Visibility is saved independently and is never copied into these writes.
 */
export function courseModuleWrites(modules: readonly EditorModule[], ids: Record<string, string>, saved: readonly SavedModule[]): CourseModuleWrite[] {
  const byId = new Map(saved.map(row => [row.id, row]))
  return modules.flatMap((module, position): CourseModuleWrite[] => {
    const id = ids[module.id]
    if (!id) throw new Error('Missing stable course module identity')
    const before = byId.get(id)
    if (before && before.label === module.label && before.position === position) return []
    return [{ kind: before ? 'update' : 'insert', id, values: { label: module.label, position } }]
  })
}
