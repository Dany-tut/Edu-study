import type { CourseSaveStage } from './courseSaveReason'

export type ReportStatus = 'ready' | 'sending' | 'sent' | 'error'
export type ReportContext = {
  courseId: string; recoveredDraft: boolean; conflict: boolean
  kind?: 'auth' | 'network' | 'server' | 'preservation' | 'conflict'; stage: CourseSaveStage | 'conflict' | 'unknown'; code?: string
}
export type CourseReportSnapshot = { attempts: number; status: ReportStatus }
const idle: CourseReportSnapshot = { attempts: 0, status: 'ready' }

export function courseSaveReportFields(context: ReportContext, attempts: number) {
  const id = /^[a-z\d_-]{1,80}$/i.test(context.courseId) ? context.courseId : 'unknown'
  const code = /^(?:[0-9A-Z]{5}|PGRST\d{3}|PT\d{3}|ISKRA_DATA_PRESERVATION)$/.test(context.code ?? '') ? context.code : null
  return {
    course_id: id, manual_retries: attempts, recovered_draft: context.recoveredDraft,
    conflict: context.conflict, stage: context.stage, code, kind: context.kind ?? 'unknown',
  }
}

// The client-owned ticket ID also identifies a database insert whose response was lost.
export function createCourseSaveReport(storageKey: string) {
  let snapshot = idle
  let id: string | null = null
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (saved && Number.isSafeInteger(saved.attempts) && saved.attempts >= 0 &&
        typeof saved.id === 'string' && /^[0-9a-f-]{36}$/i.test(saved.id)) {
      id = saved.id
      snapshot = { attempts: saved.attempts, status: saved.status === 'sent' ? 'sent' : 'ready' }
    }
  } catch { /* Storage is optional. */ }
  let generation = 0
  let manualPending = false
  const listeners = new Set<() => void>()
  function update(next: CourseReportSnapshot) {
    snapshot = next
    try {
      if (id) sessionStorage.setItem(storageKey, JSON.stringify({ id, ...next }))
      else sessionStorage.removeItem(storageKey)
    } catch { /* Keep the in-memory state. */ }
    listeners.forEach(listener => listener())
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => snapshot,
    reset() {
      if (!manualPending && !id && snapshot.attempts === 0) return
      generation++; manualPending = false; id = null; update(idle)
    },
    async retry(write: () => Promise<boolean> | undefined) {
      if (manualPending) return
      const current = generation
      manualPending = true
      let failed = false
      try {
        const result = write()
        if (result) failed = !await result
      } catch {
        failed = true
      } finally {
        if (current === generation) {
          manualPending = false
          if (failed) {
            id ??= crypto.randomUUID()
            update({ ...snapshot, attempts: snapshot.attempts + 1 })
          }
        }
      }
    },
    async send(context: ReportContext, deliver: (id: string, fields: ReturnType<typeof courseSaveReportFields>) => Promise<void>) {
      if (!id || snapshot.attempts < 2 || snapshot.status === 'sending' || snapshot.status === 'sent') return
      const current = generation
      const fields = courseSaveReportFields(context, snapshot.attempts)
      update({ ...snapshot, status: 'sending' })
      try {
        await deliver(id, fields)
        if (current === generation) update({ ...snapshot, status: 'sent' })
      } catch {
        if (current === generation) update({ ...snapshot, status: 'error' })
      }
    },
  }
}
