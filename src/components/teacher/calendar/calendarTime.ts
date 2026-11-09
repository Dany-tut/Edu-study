// Время календаря учителя — московское (часы школы), как во всём расписании.

import { addDays, weekStart } from '../../../lib/teacherSchedule'

export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

// «Месяц» — следующим шагом: нужна загрузка нескольких недель (useTeacherWeek грузит одну).
export type CalendarView = 'day' | 'week'

export const dayNum = (d: string) => Number(d.slice(8, 10))
export const monthIdx = (d: string) => Number(d.slice(5, 7)) - 1
export const weekdayIdx = (d: string) => (new Date(`${d}T12:00:00`).getDay() + 6) % 7

/** «HH:MM» → минуты от полуночи; пусто или мусор → null. */
export function minutes(time: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Минуты от полуночи сейчас по Москве. */
export function nowMinutesMsk(now = new Date()): number {
  const msk = new Date(now.getTime() + 3 * 3600_000)
  return msk.getUTCHours() * 60 + msk.getUTCMinutes()
}

export const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Дни, которые показывает вид: день — один, неделя — 7. */
export function viewDays(view: CalendarView, anchor: string): string[] {
  if (view === 'day') return [anchor]
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i))
}

/** Подпись периода в шапке: «9–15 ноября 2026», «пн, 9 ноября 2026». */
export function periodLabel(view: CalendarView, anchor: string): string {
  const y = anchor.slice(0, 4)
  if (view === 'day') return `${WEEKDAYS[weekdayIdx(anchor)]}, ${dayNum(anchor)} ${MONTHS_GEN[monthIdx(anchor)]} ${y}`
  const a = weekStart(anchor), b = addDays(a, 6)
  if (monthIdx(a) === monthIdx(b)) return `${dayNum(a)}–${dayNum(b)} ${MONTHS_GEN[monthIdx(b)]} ${b.slice(0, 4)}`
  return `${dayNum(a)} ${MONTHS_GEN[monthIdx(a)].slice(0, 3)} – ${dayNum(b)} ${MONTHS_GEN[monthIdx(b)].slice(0, 3)} ${b.slice(0, 4)}`
}

/** Сдвиг якоря на один период вперёд/назад. */
export function shiftAnchor(view: CalendarView, anchor: string, dir: -1 | 1): string {
  return addDays(anchor, view === 'day' ? dir : 7 * dir)
}
