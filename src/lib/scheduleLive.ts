import type { SchedItem } from './teacherSchedule'

type TimedLesson = Pick<SchedItem, 'date' | 'time' | 'endTime' | 'cancelled' | 'rec' | 'status'>

/** Schedule times are Moscow wall time, regardless of the teacher's display zone. */
export function scheduleLiveWindow(item: TimedLesson): { start: number; end: number } | null {
  if (item.cancelled || item.rec || item.status === 'cancelled' || item.status === 'completed') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d{2}:\d{2}$/.test(item.time)) return null
  const start = Date.parse(`${item.date}T${item.time}:00+03:00`)
  if (!Number.isFinite(start)) return null
  // Without a scheduled end, only an explicitly started lesson can be live.
  if (!item.endTime) {
    if (item.status !== 'live') return null
    const end = Date.parse(`${item.date}T23:59:59.999+03:00`) + 1
    return { start, end }
  }
  if (!/^\d{2}:\d{2}$/.test(item.endTime)) return null
  let end = Date.parse(`${item.date}T${item.endTime}:00+03:00`)
  if (!Number.isFinite(end) || end === start) return null
  if (end < start) end += 24 * 60 * 60 * 1000
  return { start, end }
}

export function isScheduleLive(item: TimedLesson, now = Date.now()): boolean {
  const window = scheduleLiveWindow(item)
  return window !== null && now >= window.start && now < window.end
}
