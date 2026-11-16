import { supabase } from './supabase'
import type { CourseJournalData } from './courseJournal'
import { journalSnapshotResult } from './journalSnapshot'

type StartupSnapshot = {
  owner: string
  complete: boolean
  promise: Promise<CourseJournalData | null>
  controller: AbortController
  expiresAt: number
}
type JournalReadSource = 'app-prefetch' | 'route-load' | 'startup-upgrade' | string

function journalPerf(fields: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('iskra:journal-perf') === '1') {
      console.info('[journal-rpc]', JSON.stringify(fields))
    }
  } catch { /* Diagnostics are opt-in and must never affect loading. */ }
}

// Keep startup reads scoped by owner. A full snapshot is a safe superset of a
// compact one, but a compact read cannot satisfy a caller that needs the full
// work list. If those callers race, finish the compact read before upgrading;
// aborting it only cancels fetch in the browser and can leave both SQL calls
// consuming the database at once.
const startupSnapshots = new Map<string, StartupSnapshot>()
const startupUpgrades = new Map<string, Promise<CourseJournalData | null>>()
let currentAuthOwner: string | null | undefined
let startupGeneration = 0

function clearStartupSnapshot() {
  startupGeneration++
  for (const snapshot of startupSnapshots.values()) snapshot.controller.abort()
  startupSnapshots.clear()
  startupUpgrades.clear()
}

// Retain the first cold-entry read long enough for the lazy journal module to
// consume it. The key is the owner and response shape; no data leaves memory.
function requestStartupSnapshot(owner: string, complete: boolean, source: JournalReadSource) {
  const cached = startupSnapshots.get(owner)
  if (cached && cached.expiresAt > Date.now()) {
    // Full data contains everything required by the overview as well.
    if (cached.complete || !complete) {
      journalPerf({ source, shape: complete ? 'complete' : 'compact', event: 'reuse-startup', cachedShape: cached.complete ? 'complete' : 'compact' })
      return cached.promise
    }

    // Multiple full callers share one queued upgrade. Do not cancel an active
    // compact call: PostgREST may continue executing it after fetch is aborted.
    const existingUpgrade = startupUpgrades.get(owner)
    if (existingUpgrade) {
      journalPerf({ source, shape: 'complete', event: 'join-upgrade' })
      return existingUpgrade
    }
    journalPerf({ source, shape: 'complete', event: 'queue-upgrade' })
    const generation = startupGeneration
    const upgrade = cached.promise.then(
      () => {
        if (generation !== startupGeneration) throw new DOMException('Journal snapshot invalidated', 'AbortError')
        const latest = startupSnapshots.get(owner)
        if (latest?.complete && latest.expiresAt > Date.now()) return latest.promise
        return startStartupSnapshot(owner, true, generation, 'startup-upgrade')
      },
      () => {
        if (generation !== startupGeneration) throw new DOMException('Journal snapshot invalidated', 'AbortError')
        return startStartupSnapshot(owner, true, generation, 'startup-upgrade')
      },
    )
    startupUpgrades.set(owner, upgrade)
    void upgrade.finally(() => {
      if (startupUpgrades.get(owner) === upgrade) startupUpgrades.delete(owner)
    }).catch(() => {})
    return upgrade
  }
  return startStartupSnapshot(owner, complete, startupGeneration, source)
}

function startStartupSnapshot(owner: string, complete: boolean, generation: number, source: JournalReadSource) {
  const started = performance.now()
  journalPerf({ source, shape: complete ? 'complete' : 'compact', event: 'start' })
  const controller = new AbortController()
  const entry: StartupSnapshot = {
    owner,
    complete,
    promise: Promise.resolve(null),
    controller,
    expiresAt: Number.POSITIVE_INFINITY,
  }
  const timeout = setTimeout(() => controller.abort(new DOMException('Journal snapshot timed out', 'TimeoutError')), 20_000)
  const request = supabase.rpc('teacher_journal_snapshot_v3', {
    p_owner: owner,
    p_complete: complete,
  }).abortSignal(controller.signal).retry(false)
  entry.promise = Promise.resolve(request)
    .then(journalSnapshotResult)
    .then(data => {
      if (generation === startupGeneration && startupSnapshots.get(owner) === entry) entry.expiresAt = Date.now() + 15_000
      journalPerf({ source, shape: complete ? 'complete' : 'compact', event: data ? 'success' : 'empty', ms: Math.round(performance.now() - started) })
      return data
    })
    .catch(error => {
      if (startupSnapshots.get(owner) === entry) startupSnapshots.delete(owner)
      journalPerf({ source, shape: complete ? 'complete' : 'compact', event: 'error', code: error?.code, ms: Math.round(performance.now() - started) })
      throw error
    })
    .finally(() => clearTimeout(timeout))
  startupSnapshots.set(owner, entry)
  return entry.promise
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    const finish = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(value => { finish(); resolve(value) }, error => { finish(); reject(error) })
  })
}

/** Start the authenticated cold-entry read before the lazy journal component mounts. */
export function prefetchTeacherJournalSnapshot(owner: string, complete: boolean, source: JournalReadSource = 'app-prefetch') {
  return requestStartupSnapshot(owner, complete, source)
}

/** Keep the eager response compact unless the teacher last opened the full work list. */
export function hasSavedJournalWorkTab(owner: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`iskra:journal-stand:${owner}`) ?? '{}') as { tab?: unknown }
    return saved.tab === 'Работы'
  } catch {
    return false
  }
}

/** Use a matching cold-entry read, or start it if the route component won the race. */
export function readStartupJournalSnapshot(owner: string, complete: boolean, signal: AbortSignal, source: JournalReadSource = 'route-load') {
  return withAbort(requestStartupSnapshot(owner, complete, source), signal)
}

/** Explicit refreshes and mutations must always read a new server snapshot. */
export async function readFreshJournalSnapshot(owner: string, complete: boolean, signal: AbortSignal, source: JournalReadSource = 'fresh-read') {
  const started = performance.now()
  journalPerf({ source, shape: complete ? 'complete' : 'compact', event: 'start' })
  const { data, error } = await supabase.rpc('teacher_journal_snapshot_v3', {
    p_owner: owner,
    p_complete: complete,
  }).abortSignal(signal).retry(false)
  journalPerf({ source, shape: complete ? 'complete' : 'compact', event: error ? 'error' : 'success', code: error?.code, ms: Math.round(performance.now() - started) })
  return journalSnapshotResult({ data, error })
}

supabase.auth.onAuthStateChange((event, session) => {
  const nextOwner = session?.user.id ?? null
  if (currentAuthOwner === undefined) {
    currentAuthOwner = nextOwner
    return
  }
  if (nextOwner !== currentAuthOwner || event === 'USER_UPDATED') clearStartupSnapshot()
  currentAuthOwner = nextOwner
})

if (typeof window !== 'undefined') window.addEventListener('iskra:journal-changed', clearStartupSnapshot)
