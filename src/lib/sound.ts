// Lightweight click sound using the Web Audio API — no asset files needed.
// Lazily created on first use so we respect browser autoplay policies.
//
// ⚠️ DEPRECATED for new (mobile) code — use lib/feedback.ts instead (canon:
// tactile/blip/haptic/lockSnap/lockRelease). This module stays as-is because
// desktop components still depend on it; do NOT change its behaviour. Dup D1
// in docs/MOBILE_SPEC.md §3 — full consolidation tracked in task T9.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  return ctx
}

/** Soft, short "tick" — a quick blip with a fast decay. */
export function playClick() {
  const audio = getCtx()
  if (!audio) return
  // Some browsers start the context suspended until a user gesture.
  if (audio.state === 'suspended') audio.resume()

  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(620, now)
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.07)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + 0.13)
}

/** Short haptic-style buzz via Vibration API (mobile). */
export function vibrate(pattern: number | number[] = 18) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

/** Bright ascending "unlock" chime — two quick tones going up. */
export function playUnlock() {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === 'suspended') audio.resume()

  const now = audio.currentTime
  const master = audio.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.13, now + 0.01)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
  master.connect(audio.destination)

  ;[[0, 660], [0.12, 880]].forEach(([offset, freq]) => {
    const t = now + offset
    const osc = audio.createOscillator()
    const g = audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.2)
  })
}

/** Short soft "pop" for selecting an answer option. */
export function playPop() {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === 'suspended') audio.resume()

  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, now)
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.09)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + 0.11)
}

/** Soft transition cue: closer to a subtle phone-like vibration than a click. */
export function playTransitionDrop() {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === 'suspended') audio.resume()

  const now = audio.currentTime
  const master = audio.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.05, now + 0.02)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

  const body = audio.createOscillator()
  body.type = 'triangle'
  body.frequency.setValueAtTime(190, now)
  body.frequency.exponentialRampToValueAtTime(150, now + 0.18)

  const pulse = audio.createOscillator()
  const pulseGain = audio.createGain()
  pulse.type = 'sine'
  pulse.frequency.setValueAtTime(24, now)
  pulseGain.gain.setValueAtTime(0.012, now)
  pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

  const lowpass = audio.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(420, now)
  lowpass.Q.value = 0.55

  const amp = audio.createGain()
  amp.gain.setValueAtTime(0.75, now)

  pulse.connect(pulseGain)
  pulseGain.connect(amp.gain)
  body.connect(lowpass)
  lowpass.connect(amp)
  amp.connect(master)
  master.connect(audio.destination)

  body.start(now)
  pulse.start(now)
  body.stop(now + 0.19)
  pulse.stop(now + 0.16)
}
