import React from 'react'

// ─── Unified side-panel tokens ────────────────────────────────────────────────
// One source of truth for all three-column editor layouts:
// TeacherConstructorPage, TeacherHomeworkCreatePage, TeacherLessonEditorPage

export const SIDE_W = 240
export const SIDE_STICKY_TOP = 20
export const SIDE_PAD = 16

export const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--color-text-3)',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
}

/** Small ALL-CAPS section divider used inside side panels */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...sectionLabelStyle, ...style }}>{children}</div>
}
