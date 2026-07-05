// ─── Shared answer/task-type palette ─────────────────────────────────────────
// Canonical type IDs (8 types):
//   single | multi | fill | extended | matching | sequence | tableFill | whiteboard
//
// Legacy aliases normalised by normalizeTaskType() below — use it when reading
// data that was written before the rename (DB rows, JSONB homework payloads).

export interface TypeVisual { color: string; bg: string }

export const TYPE_VISUALS: Record<string, TypeVisual> = {
  // choice family → green
  single:     { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  multi:      { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  // fill-in → peach
  fill:       { color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)' },
  // matching → rose
  matching:   { color: 'var(--color-rose-text)',      bg: 'var(--color-rose-soft)' },
  // sequence → yellow
  sequence:   { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)' },
  // table with blanks → teal
  tableFill:  { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)' },
  // extended free-text → purple
  extended:   { color: 'var(--color-purple)',         bg: 'var(--color-purple-soft)' },
  // whiteboard drawing → blue
  whiteboard: { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
}

export function typeVisual(t: string): TypeVisual {
  return TYPE_VISUALS[normalizeTaskType(t)] ?? { color: 'var(--color-accent)', bg: 'var(--color-purple-soft)' }
}

/** Normalise legacy type strings to canonical IDs. */
export function normalizeTaskType(t: string): string {
  switch (t) {
    case 'short':  return 'fill'
    case 'text':   return 'extended'
    case 'choice': return 'single'
    case 'match':  return 'matching'
    case 'table':  return 'tableFill'
    default:       return t
  }
}
