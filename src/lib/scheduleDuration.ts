/** Planned duration on the school's wall clock, including lessons crossing midnight. */
export function scheduleDurationMinutes(start: string, end: string): number | null {
  const minutes = (time: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
  }
  const from = minutes(start), to = minutes(end)
  if (from === null || to === null) return null
  const duration = (to - from + 1440) % 1440
  return duration || null
}
