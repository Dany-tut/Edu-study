// Recovery evidence is retained independently of whether the user retries successfully.
// No exception messages, form values, URLs or labels enter this channel.
type Scope = 'lazy_module' | 'page' | 'widget' | 'student_preferences'
type Pending = { id: string; scope: Scope; at: number; retry?: string; profileReloadOwner?: string }
type Sink = (event: string, meta: Record<string, unknown>) => void
let sink: Sink | undefined
const queued: Array<[string, Record<string, unknown>]> = []
const key = 'iskra:diagnostic-journeys'
function emit(event: string, meta: Record<string, unknown>) {
  try { if (sink) sink(event, meta); else { queued.push([event, meta]); if (queued.length > 30) queued.shift() } } catch { /* never affect recovery */ }
}
function read(): Pending[] {
  try { const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter((x): x is Pending => !!x && typeof x.id === 'string' && ['lazy_module','page','widget','student_preferences'].includes(x.scope) && Number.isFinite(x.at) && Date.now() - x.at < 86400000).slice(-20) : [] } catch { return [] }
}
function write(rows: Pending[]) { try { sessionStorage.setItem(key, JSON.stringify(rows.slice(-20))) } catch { /* unavailable */ } }
// Only the document immediately following this tab's automatic profile reload may confirm it.
let currentActor: () => string | null = () => null
let pendingProfile: Pending | undefined
let readyProfileOwner: string | null = null
export function markProfileReload(id: string) {
  const owner = currentActor()
  if (!owner || location.hash !== '#/teacher/profile') return
  const rows = read()
  const row = rows.find(x => x.id === id)
  if (!row) return
  row.profileReloadOwner = owner
  write(rows)
  diagnosticRetry(id, 'reload')
}

export function profileFormReady(owner: string | null) {
  readyProfileOwner = owner
  if (owner && pendingProfile?.profileReloadOwner === owner && currentActor() === owner && location.hash === '#/teacher/profile') {
    const id = pendingProfile.id
    pendingProfile = undefined
    diagnosticRecovered(id, 'profile_form_ready')
  }
}

export function setJourneyReporter(next: Sink, actor: () => string | null = () => null) { currentActor = actor; sink = next; for (const [event, meta] of queued.splice(0)) emit(event, meta) }
export function diagnosticFailure(scope: Scope, reason: 'load_failed' | 'render_failed' | 'save_failed') {
  let id: string
  try { id = crypto.randomUUID() } catch { id = Date.now().toString(16) + '-' + Math.random().toString(16).slice(2) }
  write([...read(), { id, scope, at: Date.now() }])
  emit('operation_failed', { failure_id: id, operation: scope, reason })
  return id
}
export function diagnosticRetry(id: string, action: 'reload' | 'home' | 'retry' | 'automatic') {
  const rows = read(); const row = rows.find(x => x.id === id); if (row) row.retry = action; write(rows)
  emit('diagnostic_recovery', { failure_id: id, stage: 'attempted', action })
}
export function diagnosticRecovered(id: string, evidence: 'module_loaded' | 'subtree_rendered' | 'save_acknowledged' | 'profile_form_ready') {
  write(read().filter(x => x.id !== id))
  emit('diagnostic_recovery', { failure_id: id, stage: 'observed', evidence })
}
export function observeReloadedJourneys() {
  for (const row of read()) if (row.retry === 'reload' || row.retry === 'home' || row.retry === 'automatic') {
    // A new app boot proves only mounting, never that the lesson/data became usable.
    emit('diagnostic_recovery', { failure_id: row.id, stage: 'boot_observed', operation: row.scope })
    if (row.profileReloadOwner) {
      if (row.profileReloadOwner === currentActor() && location.hash === '#/teacher/profile' &&
          (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload') {
        pendingProfile = { ...row }
        window.addEventListener('hashchange', () => { pendingProfile = undefined }, { once: true })
      }
      delete row.profileReloadOwner
    }
    delete row.retry
    write(read().map(x => x.id === row.id ? row : x))
  }
  profileFormReady(readyProfileOwner)
}
