// Adaptive difficulty — keeps a learner in their "zone of proximal development": nudge level
// up after a run of successes, down after struggles. Pure + testable; the trainer (or any
// item feed) calls nextState() after each answer and serves the next item at state.level.
//
// Seed `level` from a diagnostic result (e.g. map a domain % to 1..5) so practice starts where
// the student actually is rather than at level 1 for everyone.

export interface AdaptiveState {
  level: number          // current difficulty (1..maxLevel)
  recent: boolean[]      // rolling window of recent correct/incorrect
}

export interface AdaptiveOpts {
  minLevel?: number
  maxLevel?: number
  window?: number        // how many recent answers to weigh
  upAt?: number          // accuracy ≥ this → level up (0..1)
  downAt?: number        // accuracy ≤ this → level down (0..1)
}

const DEFAULTS = { minLevel: 1, maxLevel: 5, window: 4, upAt: 0.75, downAt: 0.4 }

export function initAdaptive(level = 1): AdaptiveState {
  return { level, recent: [] }
}

/** Map a 0..100 diagnostic score to a 1..maxLevel starting difficulty. */
export function levelFromScore(pct: number, maxLevel = 5): number {
  return Math.max(1, Math.min(maxLevel, Math.round((pct / 100) * (maxLevel - 1)) + 1))
}

export function nextState(state: AdaptiveState, correct: boolean, opts: AdaptiveOpts = {}): AdaptiveState {
  const o = { ...DEFAULTS, ...opts }
  const recent = [...state.recent, correct].slice(-o.window)
  let level = state.level
  // Only adjust once the window is full, so we judge on a stable sample.
  if (recent.length >= o.window) {
    const acc = recent.filter(Boolean).length / recent.length
    if (acc >= o.upAt && level < o.maxLevel) { level += 1; return { level, recent: [] } }   // reset window after a step
    if (acc <= o.downAt && level > o.minLevel) { level -= 1; return { level, recent: [] } }
  }
  return { level, recent }
}
