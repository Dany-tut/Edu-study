// Rule-based Raven-style matrix generator.
//
// Difficulty == number of simultaneous attribute-rules. Level 1 ≈ single rule (SPM-easy),
// Level 5 ≈ 3+ rules with Latin-square distribution (APM-hard). Each generated item has a
// deterministically-computed correct answer + near-miss distractors, so it is always solvable
// and never ambiguous.

import type { MatrixRuleKey } from '../../data/screeningConfig'

export type Shape = 'circle' | 'square' | 'triangle' | 'diamond'
export type Fill = 'outline' | 'solid' | 'striped'
export type Size = 'large' | 'medium' | 'small'

export interface GenCell {
  shape: Shape
  fill: Fill
  size: Size
  rot: number   // degrees (0/90/180/270)
  count: 1 | 2 | 3
}

export interface GenMatrix {
  grid: GenCell[][]      // 3×3; [2][2] is the missing answer cell
  options: GenCell[]     // 4 choices
  correct: number        // index into options
  level: number
  rules: string[]        // human-readable rule summary (teacher preview / debugging)
}

// Attribute value pools
const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond']
const FILLS: Fill[] = ['outline', 'solid', 'striped']
const SIZES: Size[] = ['large', 'medium', 'small']
const ROTS = [0, 90, 180, 270]
const COUNTS: (1 | 2 | 3)[] = [1, 2, 3]

type Attr = 'shape' | 'fill' | 'size' | 'rotation' | 'count'

const rint = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(a: T[]): T => a[rint(a.length)]
const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rint(i + 1); [b[i], b[j]] = [b[j], b[i]] } return b }

function valuesFor(attr: Attr): (string | number)[] {
  switch (attr) {
    case 'shape': return SHAPES
    case 'fill': return FILLS
    case 'size': return SIZES
    case 'rotation': return ROTS
    case 'count': return COUNTS
  }
}

function applyAttr(cell: GenCell, attr: Attr, v: string | number): void {
  switch (attr) {
    case 'shape': cell.shape = v as Shape; break
    case 'fill': cell.fill = v as Fill; break
    case 'size': cell.size = v as Size; break
    case 'rotation': cell.rot = v as number; break
    case 'count': cell.count = v as 1 | 2 | 3; break
  }
}

function readAttr(cell: GenCell, attr: Attr): string | number {
  switch (attr) {
    case 'shape': return cell.shape
    case 'fill': return cell.fill
    case 'size': return cell.size
    case 'rotation': return cell.rot
    case 'count': return cell.count
  }
}

const RULE_LABEL: Record<Attr, string> = {
  shape: 'форма', fill: 'заливка', size: 'размер', rotation: 'поворот', count: 'количество',
}

/** Generate one matrix at the requested difficulty using the enabled rules. */
export function generateMatrix(level: number, enabledRules: MatrixRuleKey[]): GenMatrix {
  const lvl = Math.max(1, Math.min(5, Math.round(level)))

  // Map config rule keys → attributes the renderer can show.
  const attrPool: Attr[] = (['shape', 'fill', 'size', 'rotation', 'count'] as Attr[])
    .filter(a => enabledRules.includes(a as MatrixRuleKey))
  // Fallbacks so generation never fails on a sparse config.
  if (attrPool.length === 0) attrPool.push('shape', 'fill', 'size')

  const useDistribute = enabledRules.includes('distribute3')

  // Number of varying attributes scales with level (capped by available attributes).
  const nRules = Math.max(1, Math.min(lvl, attrPool.length))
  let chosen = shuffle(attrPool).slice(0, nRules)

  // Rotation is only visible on asymmetric shapes — if rotating, lock shape to triangle
  // and drop 'shape' from the varying set to keep the rule readable.
  if (chosen.includes('rotation')) chosen = chosen.filter(a => a !== 'shape')
  if (chosen.length === 0) chosen = ['fill']

  // Base (constant) cell for the non-varying attributes.
  const base: GenCell = {
    shape: chosen.includes('rotation') ? 'triangle' : pick(SHAPES.filter(s => s !== 'circle')),
    fill: 'solid', size: 'medium', rot: 0, count: 1,
  }

  // For each varying attribute, decide a per-cell value pattern.
  // distribute3: Latin square (each of 3 values once per row & column) — harder.
  // progression: value[r][c] = values[(start + c*stepC + r*stepR) % L] — a learnable gradient.
  const grid: GenCell[][] = [[], [], []]
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = { ...base }

  const ruleSummary: string[] = []

  for (const attr of chosen) {
    const vals = valuesFor(attr)
    const L = vals.length
    // Latin square needs exactly 3 distinct values; pick 3 and a random offset.
    const distribute = useDistribute && lvl >= 3 && Math.random() < 0.6
    if (distribute || L < 3) {
      const three = shuffle([...vals]).slice(0, 3)
      const off = rint(3)
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        applyAttr(grid[r][c], attr, three[(r + c + off) % 3])
      }
      ruleSummary.push(`${RULE_LABEL[attr]}: распределение`)
    } else {
      const start = rint(L)
      const stepC = 1 + rint(Math.max(1, L - 1))
      const stepR = rint(L)
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        applyAttr(grid[r][c], attr, vals[(start + c * stepC + r * stepR) % L])
      }
      ruleSummary.push(`${RULE_LABEL[attr]}: прогрессия`)
    }
  }

  const answer: GenCell = { ...grid[2][2] }

  // Build distractors: each mutates ONE varying attribute of the answer to a different value.
  const options: GenCell[] = [answer]
  const mutAttrs = shuffle(chosen)
  let guard = 0
  while (options.length < 4 && guard++ < 60) {
    const attr = mutAttrs[(options.length - 1) % mutAttrs.length]
    const vals = valuesFor(attr)
    const cur = readAttr(answer, attr)
    const other = pick(vals.filter(v => v !== cur))
    const cand: GenCell = { ...answer }
    applyAttr(cand, attr, other)
    if (!options.some(o => cellsEqual(o, cand))) options.push(cand)
  }
  // Pad (rare) with random single-attr mutations if not enough unique distractors.
  guard = 0
  while (options.length < 4 && guard++ < 60) {
    const attr = pick(['shape', 'fill', 'size', 'rotation', 'count'] as Attr[])
    const cand: GenCell = { ...answer }
    applyAttr(cand, attr, pick(valuesFor(attr)))
    if (!options.some(o => cellsEqual(o, cand))) options.push(cand)
  }

  const order = shuffle(options.map((_, i) => i))
  const shuffled = order.map(i => options[i])
  const correct = order.indexOf(0)

  return { grid, options: shuffled, correct, level: lvl, rules: ruleSummary }
}

function cellsEqual(a: GenCell, b: GenCell): boolean {
  return a.shape === b.shape && a.fill === b.fill && a.size === b.size && a.rot === b.rot && a.count === b.count
}
