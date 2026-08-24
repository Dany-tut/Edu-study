// ─── Shared answer/task-type palette ─────────────────────────────────────────
// Colour only. The canonical list of types, their labels, defaults and grading
// live in src/data/taskTypes.ts — that file is the source of truth; this one
// just says what each family looks like.
//
// Colour follows the ANSWER FAMILY, not the individual type, so related tasks
// read as related: choice → green, fill-in → peach, order → yellow/rose,
// audio → blue, free production → purple, vocabulary → teal.
//
// Legacy aliases normalised by normalizeTaskType() below — use it when reading
// data that was written before the rename (DB rows, JSONB homework payloads).

export interface TypeVisual {
  /** Цвет ТЕКСТА и рамок — яркий, рассчитан на тёмный фон. */
  color: string
  /** Мягкая подложка под чипсы. */
  bg: string
  /**
   * Заливка под белой галочкой (кружок «верный ответ», залитый чекбокс).
   * Отдельно от `color`: тот подобран как цвет текста и потому яркий —
   * --color-green-text под белым даёт 1.7:1, жёлтый и бирюзовый ещё хуже.
   */
  fill: string
}

export const TYPE_VISUALS: Record<string, TypeVisual> = {
  // choice family → green
  single:     { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)',     fill: 'var(--color-green-fill)' },
  multi:      { color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)',     fill: 'var(--color-green-fill)' },
  // fill-in → peach
  fill:       { color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)',     fill: 'var(--color-peach-fill)' },
  // matching → rose
  matching:   { color: 'var(--color-rose-text)',      bg: 'var(--color-rose-soft)',      fill: 'var(--color-rose-fill)' },
  // sequence → yellow
  sequence:   { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },
  // table with blanks → teal
  tableFill:  { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)',   fill: 'var(--color-teal-fill)' },
  // extended free-text → purple
  extended:   { color: 'var(--color-purple)',         bg: 'var(--color-purple-soft)',    fill: 'var(--color-control-accent)' },
  // whiteboard drawing → blue
  whiteboard: { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)',   fill: 'var(--color-blue-fill)' },

  // ─── language-course types ───
  // assembling a sentence is an ordering task → yellow, like sequence
  wordBank:      { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },
  // everything driven by audio → blue
  listenType:    { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)',   fill: 'var(--color-blue-fill)' },
  listenBank:    { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)',   fill: 'var(--color-blue-fill)' },
  minimalPair:   { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)',   fill: 'var(--color-blue-fill)' },
  // free production the teacher reviews → purple, like extended
  speaking:      { color: 'var(--color-purple)',         bg: 'var(--color-purple-soft)',    fill: 'var(--color-control-accent)' },
  imageDescribe: { color: 'var(--color-purple)',         bg: 'var(--color-purple-soft)',    fill: 'var(--color-control-accent)' },
  imageCompare:  { color: 'var(--color-purple)',         bg: 'var(--color-purple-soft)',    fill: 'var(--color-control-accent)' },
  // vocabulary → teal
  flashcard:     { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)',   fill: 'var(--color-teal-fill)' },
  // подстановочный дрилл — ученик вписывает форму → peach, как fill
  pattern:       { color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)',     fill: 'var(--color-peach-fill)' },

  // Письменность — своя пара к «звуку»: обводка и сборка слога про форму буквы.
  trace:         { color: 'var(--color-teal-pill-text)', bg: 'var(--color-teal-pill-bg)',   fill: 'var(--color-teal-fill)' },
  buildSyllable: { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },

  // Сборка тапами — задания порядка, как sequence/wordBank → yellow.
  unscramble:    { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },
  blockOrder:    { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },
  charBank:      { color: 'var(--color-yellow-text)',    bg: 'var(--color-yellow-soft)',    fill: 'var(--color-yellow-fill)' },

  // Видео — к семье «на слух»: тот же синий, что у диктанта и похожих звуков.
  videoWatch:    { color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)',   fill: 'var(--color-blue-fill)' },
}

export function typeVisual(t: string): TypeVisual {
  return TYPE_VISUALS[normalizeTaskType(t)] ?? { color: 'var(--color-accent)', bg: 'var(--color-purple-soft)', fill: 'var(--color-control-accent)' }
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
