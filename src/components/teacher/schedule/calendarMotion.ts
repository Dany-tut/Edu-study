import type { CSSProperties } from 'react'

// A quick calendar action should only composite the scrim's opacity. Blurring
// the entire glass dashboard makes opening/closing expensive on large displays.
export const CALENDAR_BACKDROP: CSSProperties = {
  backdropFilter: 'none', WebkitBackdropFilter: 'none',
  willChange: 'opacity',
}

export const CALENDAR_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
