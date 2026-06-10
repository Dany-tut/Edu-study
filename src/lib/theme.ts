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

const CHEMISTRY: SubjectPalette = {
  text: '#7B3FCC',
  soft: '#EEDBFF',
  accent: '#7B3FCC',
  onAccent: '#FFFFFF',
  ring: 'rgba(123,63,204,0.16)',
}

// Accept either the Russian display name or the English id used in mock data.
export function subjectTheme(subject: string | undefined): SubjectPalette {
  switch (subject) {
    case 'Биология':
    case 'biology':
      return BIOLOGY
    case 'Химия':
    case 'chemistry':
      return CHEMISTRY
    default:
      return CHEMISTRY
  }
}

// Brand purple — reserved for "now / today / current focus" UI (today pill,
// current lesson node, primary CTA). Not tied to a subject.
export const PURPLE = {
  text: '#7B3FCC',
  soft: '#EEDBFF',
  mid: '#C58BFF',
  ring: 'rgba(123,63,204,0.14)',
  gradient: 'linear-gradient(135deg, #C58BFF, #7B3FCC)',
} as const

// Course track status palette — kept here so all status chrome (CourseNode,
// LessonStatusCard, lesson page badges) reads from one place.
export const TRACK_STATUS = {
  completed: { bg: '#DFF8D6', border: '#6EE7A0', icon: '#2A7D4F' },
  returned:  { bg: '#FFF9CC', border: '#F8EF8C', icon: '#7A6A00' },
  unviewed:  { bg: '#FFE1E4', border: '#F48B91', icon: '#A8282D' },
  submitted: { bg: '#FFE4BD', border: '#F8C991', icon: '#8A4A00' },
  current:   { bg: '#FFFFFF', border: PURPLE.mid, icon: PURPLE.text },
  locked:    { bg: '#F0F0F2', border: '#E0E0E2', icon: '#BDBDC2' },
} as const
