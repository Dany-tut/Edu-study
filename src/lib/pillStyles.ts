// ─────────────────────────────────────────────────────────────────────────
// Unified colour system — the single source of truth for every coloured
// surface in the app. Spread these instead of hand-writing inline colours.
//
// THREE LAYERS:
//   1. PAIR   — flat { bg + text } combos for pills, badges, tabs, rows, tiles
//   2. GRAD   — vivid gradients for CTA buttons / accent cards / progress bars
//   3. CTA    — solid accent button (purple base #786AD7, white text)
//
// All values reference CSS vars so light/dark themes resolve automatically.
// Never hard-code #7B3FCC / #C48BFF / #EEDBFF etc. in components again.
// ─────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react'

/** Colour family keys used across the UI. */
export type PillTone =
  | 'purple'   // course, trainer, group, student, diagnostics, quiz
  | 'green'    // create-actions, published, correct, science
  | 'peach'    // draft status, trainer-editor, focus/pomodoro
  | 'red'      // logout, delete, error
  | 'blue'     // widget, settings
  | 'teal'     // testing tab, question-of-day
  | 'yellow'   // in-progress, warnings
  | 'rose'     // memes
  | 'neutral'  // bg-3 chips, secondary

// ── 1. FLAT PAIRS — { background, color } ───────────────────────────────────
// The 90% case. `bg` is the soft fill, `color` is the on-fill text/icon colour.
type Pair = { bg: string; color: string }

export const PAIR: Record<PillTone, Pair> = {
  purple:  { bg: 'var(--color-purple-soft)',   color: 'var(--color-purple-text)' },
  green:   { bg: 'var(--color-green-soft)',    color: 'var(--color-green-text)' },
  peach:   { bg: 'var(--color-peach-soft)',    color: 'var(--color-peach-text)' },
  red:     { bg: 'var(--color-red-soft)',      color: 'var(--color-red-text)' },
  blue:    { bg: 'var(--color-blue-pill-bg)',  color: 'var(--color-blue-pill-text)' },
  teal:    { bg: 'var(--color-teal-pill-bg)',  color: 'var(--color-teal-pill-text)' },
  yellow:  { bg: 'var(--color-yellow-soft)',   color: 'var(--color-yellow-text)' },
  rose:    { bg: 'var(--color-rose-soft)',     color: 'var(--color-rose-text)' },
  neutral: { bg: 'var(--color-bg-3)',          color: 'var(--color-muted)' },
}

/** A pill / badge: `<span style={pill('purple')}>…</span>` */
export function pill(tone: PillTone, extra?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 9px', borderRadius: 8,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    background: PAIR[tone].bg, color: PAIR[tone].color,
    ...extra,
  }
}

/**
 * Canonical small card badge — the chip in the corner of cards
 * (status, type, count, line №, AI/Диагностика, "лин." …).
 * One geometry everywhere: fontSize 10 / weight 700 / radius 7 / pad 2×8.
 * Pass explicit colours (accent hex, CSS var, or a PAIR via cardChipTone).
 * `<span style={cardChip({ bg, color })}>…</span>`
 */
export function cardChip(colors: { bg: string; color: string }, extra?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '2px 8px', borderRadius: 7,
    fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.4,
    background: colors.bg, color: colors.color,
    ...extra,
  }
}

/** cardChip keyed by a PillTone family. `style={cardChipTone('red')}` */
export function cardChipTone(tone: PillTone, extra?: CSSProperties): CSSProperties {
  return cardChip(PAIR[tone], extra)
}

/** A square icon-tile: `<div style={tile('purple')}>…</div>` */
export function tile(tone: PillTone, size = 36, extra?: CSSProperties): CSSProperties {
  return {
    width: size, height: size, borderRadius: 11, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: PAIR[tone].bg, color: PAIR[tone].color,
    ...extra,
  }
}

/** A list-row in selected state (soft fill + on-fill text). */
export function selectedRow(tone: PillTone = 'purple', extra?: CSSProperties): CSSProperties {
  return { background: PAIR[tone].bg, color: PAIR[tone].color, ...extra }
}

// ── 2. GRADIENTS — vivid CTA / card / progress fills ────────────────────────
export const GRAD = {
  purple:    'var(--grad-purple)',
  purpleBar: 'var(--grad-purple-bar)',
  green:     'var(--grad-green)',
  greenBar:  'var(--grad-green-bar)',
  red:       'var(--grad-red)',
  redBar:    'var(--grad-red-bar)',
  blue:      'var(--grad-blue)',
  teal:      'var(--grad-teal)',
} as const

// ── 3. SOLID CTA BUTTON — purple accent, white text ─────────────────────────
/** Primary call-to-action: solid accent. `style={ctaBtn}` */
export const ctaBtn: CSSProperties = {
  background: 'var(--color-accent)', color: '#fff',
  border: 'none', borderRadius: 12, cursor: 'pointer',
  padding: '9px 18px', fontSize: 13, fontWeight: 700,
}

/** Gradient call-to-action (the "Готово" / nav-active look). */
export const ctaGradBtn: CSSProperties = {
  background: 'var(--grad-purple)', color: '#fff',
  border: 'none', borderRadius: 12, cursor: 'pointer',
  padding: '9px 18px', fontSize: 13, fontWeight: 700,
}

/** Soft (secondary) accent button: purple fill + purple text, no white. */
export const softBtn: CSSProperties = {
  background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
  border: 'none', borderRadius: 12, cursor: 'pointer',
  padding: '9px 18px', fontSize: 13, fontWeight: 700,
}

// ── ENTITY → TONE MAP — keeps colour assignment consistent app-wide ─────────
export const ENTITY_TONE = {
  course: 'purple', trainer: 'purple', group: 'purple', student: 'purple',
  diagnostics: 'purple', quiz: 'purple',
  createCourse: 'green', createLesson: 'green', createHomework: 'green',
  createTask: 'green', published: 'green', correct: 'green', science: 'green',
  widget: 'blue', settings: 'blue',
  testing: 'teal', questionOfDay: 'teal',
  draft: 'peach', focus: 'peach',
  logout: 'red', delete: 'red', error: 'red',
  inProgress: 'yellow',
  memes: 'rose',
} as const satisfies Record<string, PillTone>
