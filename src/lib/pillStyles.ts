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
    // Статус в строке — капсула (круг 2): уголок карточки — cardChip, радиус 7.
    padding: '3px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    background: PAIR[tone].bg, color: PAIR[tone].color,
    ...extra,
  }
}

/**
 * Canonical small card badge — the chip in the corner of cards
 * (status, type, count, line №, AI/Диагностика, "лин." …).
 *
 * One geometry everywhere: fontSize 10 / weight 700 / radius 7 / pad 2×8.
 * One fill *weight* everywhere: the background is always derived from the
 * chip's own text colour at a fixed opacity (CHIP_FILL), so every chip looks
 * equally "solid" regardless of which colour family it belongs to. Only the
 * hue changes — that's the semantic signal (line vs № vs AI vs diagnostic).
 *
 * `<span style={cardChip('var(--color-red-text)')}>…</span>`
 */
const CHIP_FILL = '20%' // opacity of the text colour used as the chip background

export function cardChip(color: string, extra?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '2px 8px', borderRadius: 7,
    fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.4,
    color,
    background: `color-mix(in srgb, ${color} ${CHIP_FILL}, transparent)`,
    ...extra,
  }
}

/** cardChip keyed by a PillTone family. `style={cardChipTone('red')}` */
export function cardChipTone(tone: PillTone, extra?: CSSProperties): CSSProperties {
  return cardChip(PAIR[tone].color, extra)
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

// ── 3. КНОПКИ — три размера и четыре вида (дизайн-система, круг 2) ──────────
/**
 * `style={btn('M', 'primary')}`.
 * Размеры: S — 32 / радиус 10 / 12 · 700, M — 40 / 12 / 13 · 700,
 * L — 48 / 14 / 15 · 700 во всю ширину окна.
 * Виды: primary — градиент (одинаков в обеих темах; --color-accent в тёмной
 * светлый, и белые буквы на нём тонут), secondary — bg-3, quiet — без фона,
 * danger — красный градиент. Неактивность — opacity, не бледная заливка.
 */
export type BtnSize = 'S' | 'M' | 'L'
export type BtnKind = 'primary' | 'secondary' | 'quiet' | 'danger'
const BTN_GEO: Record<BtnSize, CSSProperties> = {
  S: { height: 32, padding: '0 12px', borderRadius: 10, fontSize: 12 },
  M: { height: 40, padding: '0 16px', borderRadius: 12, fontSize: 13 },
  L: { height: 48, padding: '0 22px', borderRadius: 14, fontSize: 15, width: '100%' },
}
const BTN_KIND: Record<BtnKind, CSSProperties> = {
  primary:   { background: 'var(--grad-purple)', color: '#fff' },
  secondary: { background: 'var(--color-bg-3)', color: 'var(--color-text)' },
  quiet:     { background: 'transparent', color: 'var(--color-text-3)' },
  danger:    { background: 'var(--btn-red-bg)', color: '#fff' },
}
export function btn(size: BtnSize = 'M', kind: BtnKind = 'primary', extra?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
    ...BTN_GEO[size], ...BTN_KIND[kind], ...extra,
  }
}

/** @deprecated — btn('M', 'primary'). Оставлено для старых вызовов. */
export const ctaBtn: CSSProperties = btn('M', 'primary')
/** @deprecated — btn('M', 'primary'). */
export const ctaGradBtn: CSSProperties = btn('M', 'primary')
/** Мягкая акцентная кнопка: фиолетовая подложка и фиолетовый текст. */
export const softBtn: CSSProperties = btn('M', 'secondary', { background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' })

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
