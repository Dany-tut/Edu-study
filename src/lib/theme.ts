// Single source of truth for subject + accent colors. Components that need to
// tint UI by subject (Schedule, Memes, ScienceFacts, lesson chrome, etc.)
// import from here instead of hardcoding hex literals.

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

const BIOLOGY: SubjectPalette = {
  text: '#0E8F5F',
  soft: '#DFF7EC',
  accent: '#1DB97D',
  onAccent: '#FFFFFF',
  ring: 'rgba(29,185,125,0.16)',
}

const BIOLOGY_DARK: SubjectPalette = {
  text: '#4ECFA0',
  soft: '#0D2B1E',
  accent: '#2ABD8A',
  onAccent: '#FFFFFF',
  ring: 'rgba(42,189,138,0.25)',
}

const CHEMISTRY: SubjectPalette = {
  text: 'var(--color-accent)',
  soft: 'var(--color-purple-soft)',
  accent: 'var(--color-accent)',
  onAccent: '#FFFFFF',
  ring: 'rgba(99,84,207,0.16)',
}

const CHEMISTRY_DARK: SubjectPalette = {
  text: '#C08AFF',
  soft: '#201336',
  accent: '#9B6FE8',
  onAccent: '#FFFFFF',
  ring: 'rgba(155,111,232,0.25)',
}

// Accept either the Russian display name or the English id used in mock data.
export function subjectTheme(subject: string | undefined, dark = false): SubjectPalette {
  switch (subject) {
    case 'Биология':
    case 'biology':
      return dark ? BIOLOGY_DARK : BIOLOGY
    case 'Химия':
    case 'chemistry':
      return dark ? CHEMISTRY_DARK : CHEMISTRY
    default:
      return dark ? CHEMISTRY_DARK : CHEMISTRY
  }
}

// Brand purple — reserved for "now / today / current focus" UI (today pill,
// current lesson node, primary CTA). Not tied to a subject.
export const PURPLE = {
  text: 'var(--color-accent)',
  soft: 'var(--color-purple-soft)',
  mid: 'var(--color-purple)',
  ring: 'rgba(99,84,207,0.14)',
  gradient: 'var(--grad-purple)',
} as const

// Course track status palette — kept here so all status chrome (CourseNode,
// LessonStatusCard, lesson page badges) reads from one place.
export const TRACK_STATUS = {
  completed: { bg: 'var(--color-green-soft)',  border: '#6EE7A0', icon: '#2A7D4F' },
  returned:  { bg: 'var(--color-yellow-soft)', border: '#F8EF8C', icon: '#7A6A00' },
  unviewed:  { bg: 'var(--color-red-soft)',    border: '#F48B91', icon: '#A8282D' },
  submitted: { bg: 'var(--color-peach-soft)',  border: '#F8C991', icon: '#8A4A00' },
  current:   { bg: 'var(--color-bg-input)',    border: PURPLE.mid, icon: PURPLE.text },
  locked:    { bg: 'var(--color-bg-3)',        border: 'var(--color-border-soft)', icon: 'var(--color-muted)' },
}
