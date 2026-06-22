// ─── Shared answer/task-type palette ─────────────────────────────────────────
// Single source of truth for the colour of each answer concept. Both the trainer
// creator (TeacherConstructorPage, `AnswerType`) and the course constructor
// (TeacherCourseEditorPage, `HWTaskType`) read from here, so equivalent types —
// e.g. «Сопоставление» / match / matching — look identical everywhere.
//
// Each concept gets its OWN colour (per-type, not a single accent), mirroring the
// course palette the teacher already knew.

export interface TypeVisual { color: string; bg: string }

export const TYPE_VISUALS: Record<string, TypeVisual> = {
  // text / extended answer → purple (the base accent)
  text:       { color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
  extended:   { color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
  // choice family (single / multiple) → green
  choice:     { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  single:     { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  multi:      { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  // short / fill-in → peach
  fill:       { color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)' },
  short:      { color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)' },
  // matching → rose
  match:      { color: 'var(--color-rose-text)',      bg: 'var(--color-rose-soft)' },
  matching:   { color: 'var(--color-rose-text)',      bg: 'var(--color-rose-soft)' },
  // fill-the-table → teal
  table:      { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)' },
  tableFill:  { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)' },
  // sequence / ordering → yellow
  sequence:   { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)' },
  // whiteboard drawing → blue
  whiteboard: { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
}

export function typeVisual(t: string): TypeVisual {
  return TYPE_VISUALS[t] ?? { color: 'var(--color-accent)', bg: 'var(--color-purple-soft)' }
}
