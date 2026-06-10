import { useEffect, useState } from 'react'

// Returns a Date that re-renders subscribers every `intervalMs` ms.
// Default = 30s, good enough for minute-grained UI without burning re-renders.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// Compute live state for a scheduled lesson given the day (YYYY-MM-DD) and the
// lesson's local start time (HH:MM). All three flags are derived from `now`,
// not stored on the mock data, so the UI stays accurate as time passes.
export function lessonTimeState(dayDate: string, time: string, now: Date) {
  const [h, m] = time.split(':').map(Number)
  const start = new Date(`${dayDate}T00:00:00`)
  start.setHours(h, m, 0, 0)
  const diffMs = start.getTime() - now.getTime()
  const minutesUntil = Math.round(diffMs / 60_000)
  const secondsUntil = Math.round(diffMs / 1000)
  return {
    minutesUntil,
    secondsUntil,
    // "passed" once the lesson has started — we don't model duration.
    passed: secondsUntil < 0,
  }
}
