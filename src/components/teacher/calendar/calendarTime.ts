// Время календаря учителя — московское (часы школы), как во всём расписании.

export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

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
