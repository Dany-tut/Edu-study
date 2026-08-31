// Single source of truth for subject + accent colors. Components that need to
// tint UI by subject (Schedule, Memes, ScienceFacts, lesson chrome, etc.)
// import from here instead of hardcoding hex literals.

import { resolveSubjectPalette } from './subjects'

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

// Course track status palette — kept here so all status chrome (CourseNode,
// lesson page badges) reads from one place.
export const TRACK_STATUS = {
  completed: { bg: 'var(--color-green-soft)',  border: '#6EE7A0', icon: '#2A7D4F' },
  returned:  { bg: 'var(--color-yellow-soft)', border: '#F8EF8C', icon: '#7A6A00' },
  unviewed:  { bg: 'var(--color-red-soft)',    border: '#F48B91', icon: '#A8282D' },
  submitted: { bg: 'var(--color-peach-soft)',  border: '#F8C991', icon: '#8A4A00' },
  // «Сейчас» держится на --status-now*, а не на PURPLE: брендовый фиолетовый
  // уходит в цвет открытого курса (lib/courseTint.ts), а статусная линия обязана
  // оставаться различимой при любом предмете.
  current:   { bg: 'var(--color-bg-input)',    border: 'var(--status-now)', icon: 'var(--status-now-text)' },
  locked:    { bg: 'var(--color-bg-3)',        border: 'var(--color-border-soft)', icon: 'var(--color-muted)' },
}
