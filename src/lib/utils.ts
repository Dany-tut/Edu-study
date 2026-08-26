import { clsx, type ClassValue } from 'clsx'
import { t } from './i18n'

/**
 * Склейка classNames.
 *
 * Без tailwind-merge: тот умеет разрешать конфликты утилит («p-2 p-4» → «p-4»)
 * и стоит за это 70 КБ в бандле — при ЕДИНСТВЕННОМ вызове cn() во всём
 * приложении (CourseNode), где конфликтующих утилит нет и в помине. Вёрстка
 * здесь живёт в inline-стилях, а не в утилитах Tailwind, так что разрешать
 * нечего: clsx делает ровно то, что нужно.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Returns '#ffffff' or '#1a1a2e' depending on which contrasts better against `hex`. */
export function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? '#1a1a2e' : '#ffffff'
}

/**
 * Приглушённый вариант акцента — заливка под БЕЛЫМ текстом или галочкой.
 * Акценты предметов подобраны как цвет текста/рамок (биология #22C55E даёт с
 * белым 2.3:1), поэтому залитый ими кружок читается плохо. Затемняем цвет
 * шагами, пока контраст с белым не дойдёт до 4.5:1 — тот же смысл, что у
 * готовых --color-*-fill в index.css, но для произвольного пользовательского
 * цвета. Не hex (CSS-переменная, rgba) возвращается как есть.
 */
export function fillUnderWhite(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex
  let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  if ([r, g, b].some(Number.isNaN)) return hex
  // 24 шагов по 8% хватает, чтобы дожать до чёрного даже чистый белый.
  for (let i = 0; i < 24 && contrastWithWhite(r, g, b) < 4.5; i++) {
    r = Math.round(r * 0.92); g = Math.round(g * 0.92); b = Math.round(b * 0.92)
  }
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

/** WCAG-контраст цвета с белым. */
function contrastWithWhite(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return 1.05 / (L + 0.05)
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
