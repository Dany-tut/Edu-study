import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { JournalAttempt } from './studentWorkJournal'

/** No answers or teacher-private notes: only the learner-visible attempt summary, under existing RLS. */
export async function fetchStudentJournalHistory(studentIds: string[], signal: AbortSignal): Promise<JournalAttempt[]> {
  const rows: JournalAttempt[] = []
  const ids = [...new Set(studentIds)].filter(id => /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id))
  for (let start = 0; start < ids.length; start += 100) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('homework_attempts')
        .select('id,student_id,lesson_ref,number,status,score,passing_score,submitted_at,reviewed_at,review_comment')
        .in('student_id', ids.slice(start, start + 100)).order('id').range(offset, offset + 499).abortSignal(signal)
      if (error) throw error
      rows.push(...(data ?? []) as JournalAttempt[])
      if (!data || data.length < 500) break
    }
  }
  return rows
}

export function useStudentJournalHistory(owner: string | null, studentIds: string[], revision: unknown) {
  const idsKey = JSON.stringify([...new Set(studentIds)].sort())
  const key = `${owner}:${idsKey}`
  const [tick, setTick] = useState(0)
  const [snapshot, setSnapshot] = useState<{ key: string; rows: JournalAttempt[] | null; error: boolean; pending: boolean } | null>(null)
  const reload = useCallback(() => setTick(n => n + 1), [])
  useEffect(() => {
    if (!owner) return
    const controller = new AbortController()
    setSnapshot(previous => ({ key, rows: previous?.key === key ? previous.rows : null, error: false, pending: true }))
    const timeout = setTimeout(() => controller.abort(), 25_000)
    let active = true
    fetchStudentJournalHistory(JSON.parse(idsKey), controller.signal).then(rows => {
      if (!controller.signal.aborted) setSnapshot({ key, rows, error: false, pending: false })
    }).catch(() => {
      if (active) setSnapshot(previous => ({ key, rows: previous?.key === key ? previous.rows : null, error: true, pending: false }))
    }).finally(() => clearTimeout(timeout))
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [key, idsKey, owner, revision, tick])
  const current = snapshot?.key === key ? snapshot : null
  return { attempts: current?.rows ?? null, pending: !!owner && (!current || current.pending), error: current?.error ?? false, reload }
}
