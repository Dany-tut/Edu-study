import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { t } from './i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns '#ffffff' or '#1a1a2e' depending on which contrasts better against `hex`. */
export function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? '#1a1a2e' : '#ffffff'
}

/** Returns a box-shadow that makes a filled circle visible on any theme background. */
export function getCircleShadow(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'none'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (lum < 0.28) return 'inset 0 0 0 1.5px rgba(255,255,255,0.28)'  // dark → subtle light ring
  if (lum > 0.72) return 'inset 0 0 0 1.5px rgba(0,0,0,0.18)'         // light → subtle dark ring
  return 'none'
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
  return `${msk} ${t('МСК')} (${mskToVietnam(msk)} ${t('Вьетнам')})`
}
