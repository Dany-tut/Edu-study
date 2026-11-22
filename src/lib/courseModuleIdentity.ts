type EditorModule = { id: string; label: string }
type SavedModule = { id: string; label: string; position: number }

/** Position is presentation, never identity: removing A must not hide B. */
export function courseModuleIdentities(modules: EditorModule[], saved: SavedModule[], createId = () => crypto.randomUUID(), aliases: Record<string, string> = {}) {
  const used = new Set<string>()
  const ids: Record<string, string> = {}
  for (const module of modules) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(module.id)) {
      // A UUID may be new or already persisted. Never borrow another UUID.
      ids[module.id] = module.id
      used.add(module.id)
    }
  }
  for (const module of modules) {
    if (ids[module.id]) continue
    if (aliases[module.id]) {
      ids[module.id] = aliases[module.id]
      used.add(aliases[module.id])
      continue
    }
    // Older editor drafts retained local IDs after a save. Recover only an
    // unambiguous named identity, never whichever module occupies its position.
    const matches = saved.filter(s => !used.has(s.id) && s.label === module.label)
    if (matches.length > 1) throw new Error('Обновите курс перед изменением модулей с одинаковыми названиями. Правки сохранены в черновике.')
    const id = matches[0]?.id ?? createId()
    ids[module.id] = id
    used.add(id)
  }
  return ids
}

// Queued snapshots of a seed/legacy draft may retain the old local ID after an
// acknowledgement. Reuse its assigned UUID even if that snapshot renamed it.
const sessionAliases = new Map<string, Record<string, string>>()
export function courseModuleIdentitiesFor(course: string, modules: EditorModule[], saved: SavedModule[]) {
  const prior = sessionAliases.get(course) ?? {}
  const ids = courseModuleIdentities(modules, saved, undefined, prior)
  sessionAliases.set(course, { ...prior, ...ids })
  return ids
}
