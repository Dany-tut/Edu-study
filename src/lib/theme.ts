// Single source of truth for subject + accent colors. Components that need to
// tint UI by subject (Schedule, Memes, ScienceFacts, lesson chrome, etc.)
// import from here instead of hardcoding hex literals.

import { resolveSubjectPalette } from './subjects'
import type { TrackLessonStatus } from './lessonStatus'

export interface SubjectPalette {
  /** Text color on a neutral/white surface. AA contrast vs white. */
  text: string
  /** Soft tinted background for cards/pills used as the surface itself. */
  soft: string
  /** Solid accent — use as filled background for high-contrast pills/buttons. */
  accent: string
  /** Text color sitting on `accent`. */
  onAccent: string
  /** Translucent accent for icon halos / outlines on tinted surfaces. */
  ring: string
}

// Subject palettes (incl. the literal hex for chemistry/biology) now live in the
// subject registry so every subject — not just two — has one. Accepts either the
// Russian display name or the English id; unknown subjects fall back to chemistry.
export function subjectTheme(subject: string | undefined, dark = false): SubjectPalette {
  return resolveSubjectPalette(subject, dark)
}

// Brand purple — reserved for "now / today / current focus" UI (today pill,
// current lesson node, primary CTA). Not tied to a subject.
export const PURPLE = {
  text: 'var(--color-accent)',
  // Подложка под .text — поэтому --color-accent-soft, а не --color-purple-soft:
  // тот уходит в цвет курса только на уровне «Мягкий», и на «Акценте» таблетка
  // «Сегодня» выходила коралловой надписью на брендово-фиолетовом.
  soft: 'var(--color-accent-soft)',
  mid: 'var(--color-purple)',
  ring: 'rgba(var(--accent-rgb), 0.14)',
  gradient: 'var(--grad-purple)',
} as const

// Glyphs can be lighter than the small captions. Nodes and popovers share both.
const trackTone = (bg: string, border: string, icon: string, text = icon) => ({ bg, border, icon, text })
export const TRACK_STATUS = {
  completed: trackTone('var(--color-green-soft)', '#6EE7A0', 'var(--color-green-text)'),
  returned:  trackTone('var(--color-yellow-soft)', '#F8EF8C', 'var(--color-yellow-text)'),
  unviewed:  trackTone('var(--track-recording-bg)', 'var(--track-recording-border)', 'var(--track-recording-icon)', 'var(--track-recording-text)'),
  test_low:  trackTone('var(--color-red-soft)', '#F48B91', 'var(--color-red-text)'),
  submitted: trackTone('var(--color-peach-soft)', '#F8C991', 'var(--color-peach-text)'),
  today:     trackTone('var(--status-now-soft)', 'var(--status-now)', 'var(--track-today-icon)', 'var(--status-now-text)'),
  current:   trackTone('rgb(var(--glass-rgb))', 'var(--color-border-strong)', 'var(--color-muted)', 'var(--track-muted-text)'),
  locked:    trackTone('var(--color-bg-3)', 'var(--color-border-soft)', 'var(--color-muted)', 'var(--track-muted-text)'),
}

export function trackPalette(status: TrackLessonStatus) {
  if (status === 'test_passed') return TRACK_STATUS.completed
  if (status === 'submitted_unknown') return TRACK_STATUS.locked
  return TRACK_STATUS[status]
}
