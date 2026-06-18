import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Timezone helpers ────────────────────────────────────────────────────────
// All schedule times are authored/stored in Moscow time (МСК). Vietnam (Asia/Ho_Chi_Minh)
// is МСК + 4 hours. Teacher calendars show both so it's clear for everyone.

/** Shift an "HH:mm" string by `hours`, wrapping across midnight. Returns "HH:mm". */
export function shiftHHmm(hhmm: string, hours: number): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim())
  if (!m) return hhmm
  const total = (((Number(m[1]) * 60 + Number(m[2])) + hours * 60) % 1440 + 1440) % 1440
  const h = Math.floor(total / 60)
  const min = total % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Vietnam time for a given МСК "HH:mm" (МСК + 4h). */
export function mskToVietnam(hhmm: string): string {
  return shiftHHmm(hhmm, 4)
}

/** "14:00" → "14:00 МСК (18:00 Вьетнам)". Empty input → "". */
export function formatMskVn(hhmm: string | null | undefined): string {
  if (!hhmm) return ''
  const msk = hhmm.trim()
  if (!/^\d{1,2}:\d{2}/.test(msk)) return msk
  return `${msk} МСК (${mskToVietnam(msk)} Вьетнам)`
}
