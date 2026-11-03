export type PendingJournal = {
  scheduleId: string
  date: string        // 'YYYY-MM-DD'
  title: string
  timeStart: string
  groupId: string | null
  studentId: string | null
  scopeName: string
}

export type PendingEvent = { id: string; date: string; lesson_title: string | null; time_start: string | null;
  group_id: string | null; student_id: string | null; lesson_id: string | null; subject: string | null; node_type: string | null;
  groups?: { name: string } | null; students?: { name: string; group_id: string | null } | null }
export function pendingJournalRows(data: PendingEvent[], myStudents: { id: string; groupId: string }[],
  legacy: { student_id: string; lesson_date: string; lesson_title: string | null; present: boolean | null }[],
  sessions: { schedule_id: string; attendance: unknown }[], now: number): PendingJournal[] {
  const byEvent = new Map(sessions.map(s => [s.schedule_id, s.attendance as Record<string, boolean | null>]))
  const legacyMarks = new Map(legacy.map(a => [`${a.student_id}|${a.lesson_date}|${a.lesson_title ?? ''}`, a.present]))

  const seen = new Set<string>()
  const out: PendingJournal[] = []
  for (const r of data) {
    // Grace gate: only surface once the lesson has had time to finish.
    const start = new Date(`${r.date}T${(r.time_start || '00:00')}:00`).getTime()
    if (Number.isFinite(start) && start + 2 * 3_600_000 > now) continue

    const gid: string | null = r.group_id ?? r.students?.group_id ?? null
    const roster = r.group_id ? myStudents.filter(p => p.groupId === r.group_id).map(p => p.id) : r.student_id ? [r.student_id] : []
    const marks = byEvent.get(r.id)
    // Legacy marks are ambiguous when the same title occurs twice that day.
    const matchingTimes = new Set(data.filter(other => other.date === r.date && other.lesson_title === r.lesson_title
      && other.group_id === r.group_id && other.student_id === r.student_id).map(other => JSON.stringify([other.time_start, other.lesson_id, other.subject, other.node_type])))
    const filled = roster.length > 0 && roster.every(id => {
      if (marks && Object.prototype.hasOwnProperty.call(marks, id)) return typeof marks[id] === 'boolean'
      return matchingTimes.size === 1 && typeof legacyMarks.get(`${id}|${r.date}|${r.lesson_title ?? ''}`) === 'boolean'
    })
    if (filled) continue

    // Each event gets its own reminder, including consecutive lessons.
    const key = `${r.group_id ?? r.student_id}|${r.date}|${r.time_start}|${r.lesson_title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      scheduleId: r.id, date: r.date, title: r.lesson_title ?? '', timeStart: r.time_start ?? '',
      groupId: gid, studentId: r.student_id,
      scopeName: r.groups?.name ?? r.students?.name ?? '',
    })
  }
  return out
}
