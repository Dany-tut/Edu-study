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

let startupSnapshot: StartupSnapshot | null = null
let currentAuthOwner: string | null | undefined

function clearStartupSnapshot() {
  startupSnapshot?.controller.abort()
  startupSnapshot = null
}

// Retain the first cold-entry read long enough for the lazy journal module to
// consume it. The key is the owner and response shape; no data leaves memory.
function requestStartupSnapshot(owner: string, complete: boolean) {
  const cached = startupSnapshot
  if (cached?.owner === owner && cached.complete === complete && cached.expiresAt > Date.now()) {
    return cached.promise
  }
  clearStartupSnapshot()

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
      if (startupSnapshot === entry) entry.expiresAt = Date.now() + 15_000
      return data
    })
    .catch(error => {
      if (startupSnapshot === entry) startupSnapshot = null
      throw error
    })
    .finally(() => clearTimeout(timeout))
  startupSnapshot = entry
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
export function prefetchTeacherJournalSnapshot(owner: string, complete: boolean) {
  return requestStartupSnapshot(owner, complete)
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
export function readStartupJournalSnapshot(owner: string, complete: boolean, signal: AbortSignal) {
  return withAbort(requestStartupSnapshot(owner, complete), signal)
}

/** Explicit refreshes and mutations must always read a new server snapshot. */
export async function readFreshJournalSnapshot(owner: string, complete: boolean, signal: AbortSignal) {
  const { data, error } = await supabase.rpc('teacher_journal_snapshot_v3', {
    p_owner: owner,
    p_complete: complete,
  }).abortSignal(signal).retry(false)
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
