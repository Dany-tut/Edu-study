import { useCallback, useEffect, useRef, useState } from 'react'
import { requestAiGrade, useAiGrades } from './useAiGrades'
import { homeworkAiForAttempt } from './homeworkAiState'

/** Only the open, real submission is queried. Demo cards never call the provider. */
export function useHomeworkCardAi(progressId: string | undefined, attemptId: string | undefined,
  submittedAt: string | undefined, pending: boolean) {
  const grades = useAiGrades(progressId ? [progressId] : [])
  const grade = homeworkAiForAttempt(progressId ? grades.byProgress.get(progressId) : undefined, attemptId, submittedAt)
  const key = progressId ? progressId + ':' + (attemptId ?? submittedAt ?? '') : ''
  const requested = useRef(new Set<string>())
  const inFlight = useRef(new Set<string>())
  const [requests, setRequests] = useState<Record<string, { busy: boolean; error: string }>>({})
  const request = useCallback(async () => {
    if (!progressId || !pending || inFlight.current.has(key)) return
    inFlight.current.add(key)
    setRequests(old => ({ ...old, [key]: { busy: true, error: '' } }))
    try {
      if (grades.error) { await grades.reload(); return }
      const result = await requestAiGrade(progressId, grade?.status === 'error' || grade?.status === 'skipped')
      setRequests(old => ({ ...old, [key]: { busy: false, error: result.error ?? '' } }))
      if (result.ok) await grades.reload()
    } catch {
      setRequests(old => ({ ...old, [key]: { busy: false, error: 'unavailable' } }))
    } finally {
      inFlight.current.delete(key)
      setRequests(old => old[key]?.busy ? { ...old, [key]: { ...old[key], busy: false } } : old)
    }
  }, [progressId, pending, key, grade?.status, grades.error, grades.reload])
  useEffect(() => {
    if (!key || !pending || grades.loading || grades.error || requested.current.has(key) || grade) return
    requested.current.add(key)
    void request()
  }, [key, pending, grades.loading, grades.error, grade, request])
  const ready = grade && ['graded', 'confirmed', 'changed', 'dismissed'].includes(grade.status)
  return { grade, loading: grades.loading, busy: requests[key]?.busy ?? false,
    error: grades.error || (ready ? '' : requests[key]?.error ?? ''), request }
}
