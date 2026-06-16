// Pure item generators for the screening battery (number/letter series, mental rotation,
// working-memory sequences, Stroop trials). All return solvable items with a known answer.

import type { SeriesType, StroopConfig } from '../../data/screeningConfig'

const ri = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(a: T[]): T => a[ri(a.length)]
const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = ri(i + 1); [b[i], b[j]] = [b[j], b[i]] } return b }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ── Number / letter series ───────────────────────────────────────────────────────

export interface SeriesItem {
  seq: (number | string)[]   // shown terms
  options: (number | string)[]
  correct: number
  level: number
}

export function generateSeries(level: number, typesIn: SeriesType[]): SeriesItem {
  const lvl = clamp(Math.round(level), 1, 5)
  const types = typesIn.length ? typesIn : (['arithmetic'] as SeriesType[])
  // Easy levels favour arithmetic; harder levels allow the trickier rules.
  const easy: SeriesType[] = types.filter(t => t === 'arithmetic' || t === 'letters')
  const type: SeriesType = lvl <= 2 && easy.length ? pick(easy) : pick(types)

  const len = 5
  const full: number[] = []
  let letters: string[] = []
  let lastDiff = 1

  switch (type) {
    case 'arithmetic': {
      const d = lvl <= 2 ? 1 + ri(4) : (4 + ri(9)) * (Math.random() < 0.35 ? -1 : 1)
      const a = 2 + ri(9); lastDiff = Math.abs(d)
      for (let i = 0; i <= len; i++) full.push(a + i * d)
      break
    }
    case 'geometric': {
      const r = 2 + ri(lvl >= 4 ? 3 : 2)
      const a = 1 + ri(3); lastDiff = a
      for (let i = 0; i <= len; i++) full.push(a * Math.pow(r, i))
      break
    }
    case 'fibonacci': {
      let x = 1 + ri(4), y = 2 + ri(5)
      full.push(x, y)
      for (let i = 2; i <= len; i++) { const z = x + y; full.push(z); x = y; y = z }
      lastDiff = full[full.length - 1] - full[full.length - 2]
      break
    }
    case 'alternating': {
      const a = 1 + ri(6), d1 = 1 + ri(4), d2 = 2 + ri(5)
      for (let i = 0; i <= len; i++) {
        const k = Math.floor(i / 2)
        full.push(i % 2 === 0 ? a + k * d1 : a + 3 + k * d2)
      }
      lastDiff = d1
      break
    }
    case 'letters': {
      const step = 1 + ri(lvl >= 3 ? 4 : 2)
      const start = ri(8)
      for (let i = 0; i <= len; i++) letters.push(String.fromCharCode(65 + ((start + i * step) % 26)))
      break
    }
  }

  if (type === 'letters') {
    const answer = letters[len]
    const shown = letters.slice(0, len)
    const opts = new Set<string>([answer])
    const code = answer.charCodeAt(0) - 65
    const cands = shuffle([1, -1, 2, -2, 3].map(d => String.fromCharCode(65 + ((code + d + 26) % 26))))
    for (const c of cands) { if (opts.size >= 4) break; opts.add(c) }
    const arr = shuffle([...opts])
    return { seq: shown, options: arr, correct: arr.indexOf(answer), level: lvl }
  }

  const answer = full[len]
  const shown = full.slice(0, len)
  const opts = new Set<number>([answer])
  const cands = shuffle([answer + 1, answer - 1, answer + lastDiff, answer - lastDiff, answer + 2 * lastDiff, answer * 2, answer + 10])
  for (const c of cands) { if (opts.size >= 4) break; if (c !== answer) opts.add(c) }
  let g = 0
  while (opts.size < 4 && g++ < 30) opts.add(answer + (1 + ri(20)) * (Math.random() < 0.5 ? -1 : 1))
  const arr = shuffle([...opts])
  return { seq: shown, options: arr, correct: arr.indexOf(answer), level: lvl }
}

// ── Mental rotation (Gv) ─────────────────────────────────────────────────────────
// One option is the base glyph merely ROTATED (same chirality); distractors are MIRRORED
// (a mirror image can never be produced by rotation of a chiral shape).

export interface RotOption { rot: number; mirror: boolean }
export interface RotItem {
  glyph: string          // SVG polygon points in a 0..100 box (chiral)
  baseRot: number        // rotation of the reference figure
  options: RotOption[]
  correct: number
  level: number
}

// Chiral glyphs (no mirror symmetry) in a 0..100 viewBox.
const GLYPHS = [
  // flag on a pole (flag points right)
  '38,88 38,16 46,16 46,22 78,32 46,42 46,88',
  // boot / L with a foot
  '30,18 46,18 46,62 74,62 74,80 30,80',
  // lightning-ish zigzag
  '34,16 64,16 46,46 70,46 36,86 48,54 28,54',
]

export function generateRotation(level: number): RotItem {
  const lvl = clamp(Math.round(level), 1, 5)
  const glyph = pick(GLYPHS)
  const angles = lvl >= 4 ? [0, 45, 90, 135, 180, 225, 270, 315] : [0, 90, 180, 270]
  const baseRot = pick(angles)

  const correct: RotOption = { rot: pick(angles.filter(a => a !== baseRot)) || 90, mirror: false }
  const opts: RotOption[] = [correct]
  let g = 0
  while (opts.length < 4 && g++ < 40) {
    const cand: RotOption = { rot: pick(angles), mirror: true }
    if (!opts.some(o => o.mirror === cand.mirror && o.rot === cand.rot)) opts.push(cand)
  }
  const order = shuffle(opts.map((_, i) => i))
  const shuffled = order.map(i => opts[i])
  return { glyph, baseRot, options: shuffled, correct: order.indexOf(0), level: lvl }
}

// ── Working memory sequences ─────────────────────────────────────────────────────
// A schedule of trials with growing span; optional backward (reverse-order) trials.

export interface MemTrial { cells: number[]; backward: boolean; span: number }

export function buildMemorySchedule(minSpan: number, maxSpan: number, backward: boolean, gridSize = 6): MemTrial[] {
  const trials: MemTrial[] = []
  for (let span = minSpan; span <= maxSpan; span++) {
    trials.push({ cells: randomCells(span, gridSize), backward: false, span })
    if (backward && span >= minSpan + 1) trials.push({ cells: randomCells(span, gridSize), backward: true, span })
  }
  return trials
}

function randomCells(span: number, gridSize: number): number[] {
  // distinct cells, random order, length = span (cap at gridSize)
  const n = Math.min(span, gridSize)
  return shuffle(Array.from({ length: gridSize }, (_, i) => i)).slice(0, n)
}

// ── Stroop trials ────────────────────────────────────────────────────────────────

export interface StroopTrial { wordIdx: number; inkIdx: number; correct: number; congruent: boolean }

export function buildStroopTrials(cfg: StroopConfig): StroopTrial[] {
  const n = cfg.colors.length
  const trials: StroopTrial[] = []
  const nCongruent = Math.round(cfg.trials * clamp(cfg.congruentRatio, 0, 1))
  for (let i = 0; i < cfg.trials; i++) {
    const congruent = i < nCongruent
    const wordIdx = ri(n)
    const inkIdx = congruent ? wordIdx : pick(Array.from({ length: n }, (_, k) => k).filter(k => k !== wordIdx))
    trials.push({ wordIdx, inkIdx, correct: inkIdx, congruent })
  }
  return shuffle(trials)
}
