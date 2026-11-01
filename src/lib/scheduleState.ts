/** Event timing is independent of attendance, homework and recording progress. */
export type ScheduleEventStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'
export type SchedulePhase = 'upcoming' | 'today' | 'scheduled_now' | 'live' | 'elapsed' | 'completed' | 'cancelled' | 'available' | 'unknown'

export interface ScheduleSlot {
  date: string
  time: string
  endTime?: string
  endDate?: string
  /** Absolute planned times, retained before converting the display timezone. */
  startsAt?: string
  endsAt?: string
  status?: ScheduleEventStatus
  materialOnly?: boolean
}

export interface ScheduleState {
  phase: SchedulePhase
  label: string | null
  isCurrent: boolean
  hasEnded: boolean
  isToday: boolean
  startMs: number | null
  endMs: number | null
  secondsUntil: number | null
  minutesUntil: number | null
  recordingAvailable?: boolean
}

const labels: Record<SchedulePhase, string | null> = {
  upcoming: null, today: 'Сегодня', scheduled_now: 'Сейчас по расписанию', live: 'Идёт',
  elapsed: 'Время занятия прошло', completed: 'Завершено', cancelled: 'Отменено',
  available: 'Материалы открыты', unknown: null,
}
const formatters = new Map<string, Intl.DateTimeFormat>()
function wallParts(now: Date, timeZone: string) {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
    formatters.set(timeZone, formatter)
  }
  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(now)) parts[part.type] = part.value
  return parts
}

/** Convert a wall time without interpreting it in the device's timezone. */
function wallTimeMs(date: string, time: string, timeZone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute, second = 0] = time.split(':').map(Number)
  if (hour > 23 || minute > 59 || second > 59) return null
  const target = Date.UTC(year, month - 1, day, hour, minute, second)
  if (new Date(target).toISOString().slice(0, 10) !== date) return null
  let instant = target
  for (let i = 0; i < 3; i++) {
    const p = wallParts(new Date(instant), timeZone)
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
    const next = target - (wall - instant)
    if (next === instant) return instant
    instant = next
  }
  return instant
}

export function getScheduleState(slot: ScheduleSlot, now: Date, timeZone: string): ScheduleState {
  const p = wallParts(now, timeZone)
  const today = `${p.year}-${p.month}-${p.day}`
  const isToday = slot.date === today
  const hasTime = !!slot.time?.trim()
  const absoluteStart = slot.startsAt ? Date.parse(slot.startsAt) : NaN
  const startMs = Number.isFinite(absoluteStart) ? absoluteStart : hasTime ? wallTimeMs(slot.date, slot.time, timeZone) : null
  let endDate = slot.endDate ?? slot.date
  if (!slot.endDate && slot.endTime && slot.endTime.slice(0, 5) < slot.time.slice(0, 5)) {
    const next = new Date(`${slot.date}T12:00:00Z`)
    if (Number.isFinite(next.getTime())) { next.setUTCDate(next.getUTCDate() + 1); endDate = next.toISOString().slice(0, 10) }
  }
  const absoluteEnd = slot.endsAt ? Date.parse(slot.endsAt) : NaN
  const rawEnd = Number.isFinite(absoluteEnd) ? absoluteEnd : slot.endTime ? wallTimeMs(endDate, slot.endTime, timeZone) : null
  const endMs = rawEnd != null && startMs != null && rawEnd > startMs ? rawEnd : null
  const diff = startMs == null ? null : startMs - now.getTime()
  // Ceil keeps a future lesson future until the exact boundary, including its last second.
  const secondsUntil = diff == null ? null : Math.ceil(diff / 1000)
  const minutesUntil = diff == null ? null : Math.ceil(diff / 60_000)
  let phase: SchedulePhase
  if (slot.status === 'cancelled') phase = 'cancelled'
  else if (slot.status === 'completed') phase = 'completed'
  else if (slot.status === 'live') phase = 'live'
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || (hasTime && startMs == null)) phase = 'unknown'
  else if (startMs != null && now.getTime() < startMs) phase = 'upcoming'
  else if (!hasTime && slot.date > today) phase = 'upcoming'
  else if (slot.materialOnly) phase = 'available'
  else if (endMs != null && now.getTime() >= endMs) phase = 'elapsed'
  // Without an end time, don't invent a duration or a completed lesson.
  else if (endMs == null && slot.date < today) phase = 'elapsed'
  else phase = hasTime ? 'scheduled_now' : 'today'
  return {
    phase, label: labels[phase], isToday, startMs, endMs, secondsUntil, minutesUntil,
    isCurrent: phase === 'live' || phase === 'scheduled_now',
    hasEnded: phase === 'completed' || phase === 'elapsed',
  }
}

/** Current events outrank future ones; overlapping current lessons remain visible. */
export function pickScheduleFocus(states: ScheduleState[]): number {
  const live = states.findIndex(state => state.phase === 'live')
  if (live >= 0) return live
  const current = states.findIndex(state => state.isCurrent)
  if (current >= 0) return current
  let next = -1
  states.forEach((state, i) => {
    if (state.phase === 'upcoming' && state.startMs != null && (next < 0 || state.startMs < states[next].startMs!)) next = i
  })
  return next
}
