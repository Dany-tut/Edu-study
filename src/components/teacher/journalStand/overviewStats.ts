import type { Student } from '../../../data/teacherMockData'
import { workStats, type StudentWork } from './studentWorks'

export type RosterEntry = { student: Student; works: StudentWork[]; stats: ReturnType<typeof workStats> }
type ScoredWork = StudentWork & { score: number }
const isScored = (w: StudentWork): w is ScoredWork => w.score !== null
const dayMs = 86_400_000
export const shiftDay = (day: string, n: number) =>
  new Date(Date.parse(day) + n * dayMs).toISOString().slice(0, 10)
export const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / dayMs)
export const workDay = (w: StudentWork) => w.slot.due ?? w.slot.date ?? w.dates[0] ?? ''
const shortDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const showDate = (day: string) => shortDate.format(new Date(day))
export const periodLabel = (today: string) =>
  showDate(shiftDay(today, -27)) + ' — ' + showDate(today) + ' ' + today.slice(0, 4)
const mean = (works: ScoredWork[]) =>
  works.length ? Math.round(works.reduce((sum, w) => sum + w.score, 0) / works.length) : null

export function studentOverview(works: StudentWork[], today: string) {
  const start = shiftDay(today, -27),
    halfway = shiftDay(today, -13)
  const inPeriod = (day: string) => day >= start && day <= today
  const items = works
    .filter((w) => (w.slot.required || w.submitted) && w.status !== 'Впереди' && inPeriod(workDay(w)))
    .sort((a, b) => workDay(a).localeCompare(workDay(b)) || a.slot.ref.localeCompare(b.slot.ref))
  const graded = items.filter(isScored)
  const previous = graded.filter((w) => workDay(w) < halfway),
    recent = graded.filter((w) => workDay(w) >= halfway)
  const before = mean(previous),
    after = mean(recent)
  const delta = previous.length >= 2 && recent.length >= 2 ? after! - before! : null
  const byWeek: ScoredWork[][] = [[], [], [], []]
  const byTopic = new Map<string, ScoredWork[]>()
  for (const w of graded) {
    byWeek[Math.floor(daysBetween(start, workDay(w)) / 7)].push(w)
    if (!w.slot.topic) continue
    const topic = byTopic.get(w.slot.topic.id) ?? []
    topic.push(w)
    byTopic.set(w.slot.topic.id, topic)
  }
  const topics = [...byTopic.values()]
    .filter((group) => group.length >= 2)
    .map((group) => {
      const pair = group.slice(-2)
      return {
        ...pair[0].slot.topic!,
        pair,
        mastered: pair.every((w) => w.score >= w.threshold),
        reinforce: pair.every((w) => w.score < w.threshold),
        average: mean(pair)!,
      }
    })
  const debts = items.filter(
    (w) => w.slot.required && !w.submitted && w.status === 'Просрочено' && w.slot.due && w.slot.due < today,
  )
  const hasDue = items.some((w) => w.slot.due && w.slot.due <= today)
  const stats = workStats(items, today)
  const marks = works.filter((w) => w.present !== null && w.slot.date && inPeriod(w.slot.date))
  const rhythm = Array.from({ length: 4 }, (_, week) => {
    const withinWeek = (day: string) => inPeriod(day) && Math.floor(daysBetween(start, day) / 7) === week
    const planned = items.filter((w) => withinWeek(workDay(w)))
    if (!planned.length) return null
    if (works.some((w) => w.dates.some(withinWeek))) return true
    return planned.some((w) => w.submitted && !w.dates.length) ? null : false
  })
  return {
    items,
    graded,
    debts,
    hasDue,
    stats,
    before,
    after,
    delta,
    beforeCount: previous.length,
    afterCount: recent.length,
    weekly: byWeek.map(mean),
    topics,
    mastered: topics.filter((t) => t.mastered),
    focus: topics.filter((t) => t.reinforce).sort((a, b) => a.average - b.average)[0],
    rhythm,
    activeWeeks: rhythm.filter((v) => v === true).length,
    weeks: rhythm.filter((v) => v !== null).length,
    attended: marks.filter((w) => w.present).length,
    marked: marks.length,
  }
}

export type Overview = ReturnType<typeof studentOverview>
export function groupOverview(reports: Overview[]) {
  const topics = new Map<string, { id: string; title: string; known: number; weak: number }>()
  const sources = new Set<string>()
  let scoreSum = 0,
    checked = 0
  for (const report of reports) {
    for (const w of report.graded) {
      checked++
      scoreSum += w.score
      for (const source of w.source.split(' + ')) sources.add(source)
    }
    for (const t of report.topics) {
      const group = topics.get(t.id) ?? { id: t.id, title: t.title, known: 0, weak: 0 }
      group.known++
      if (t.reinforce) group.weak++
      topics.set(t.id, group)
    }
  }
  const ordered = [...topics.values()].sort(
    (a, b) => b.weak - a.weak || b.weak / b.known - a.weak / a.known || a.title.localeCompare(b.title, 'ru'),
  )
  return {
    checked,
    sources: [...sources].sort((a, b) => a.localeCompare(b, 'ru')),
    average: checked ? Math.round(scoreSum / checked) : null,
    debtors: reports.filter((r) => r.debts.length).length,
    ungraded: reports.filter((r) => !r.graded.length).length,
    focus: ordered.find((t) => t.weak),
    knownTopics: topics.size,
  }
}
