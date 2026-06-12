// Lightweight tactile + audio feedback for UI affordances. Both channels are
// best-effort: navigator.vibrate is a no-op on desktop / unsupported browsers,
// and the WebAudio blip can only sound after a user gesture — which is exactly
// when we call it (taps, expands), so the browser's autoplay policy is happy.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) ctx = new Ctor()
    // A context created before the first gesture starts suspended; resume it
    // lazily on the gesture that triggers the first sound.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Short haptic buzz. Pattern in ms (Android/mobile only; ignored elsewhere). */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

/** A soft, quick UI "blip" via a single decaying sine — no asset needed. */
export function blip(freq = 520, duration = 0.06) {
  const ac = audioCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ac.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.05, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration)
}

/** Combined sound + vibration — the default "something opened / was pressed". */
export function tactile(opts?: { freq?: number; vibrate?: number | number[] }) {
  blip(opts?.freq)
  haptic(opts?.vibrate ?? 10)
}

/**
 * Topbar fixation snap — two micro-tones (thud + click) that feel like
 * a physical latch engaging. Very soft so it stays ambient, not intrusive.
 * Paired with the CSS @keyframes topbar-snap scale micro-bounce.
 */
export function lockSnap() {
  const ac = audioCtx()
  if (ac) {
    const t = ac.currentTime
    // First tone: low thud
    const osc1 = ac.createOscillator()
    const g1   = ac.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 200
    g1.gain.setValueAtTime(0, t)
    g1.gain.linearRampToValueAtTime(0.04, t + 0.005)
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    osc1.connect(g1).connect(ac.destination)
    osc1.start(t); osc1.stop(t + 0.07)
    // Second tone: crisp click 35ms later
    const osc2 = ac.createOscillator()
    const g2   = ac.createGain()
    osc2.type = 'triangle'
    osc2.frequency.value = 380
    g2.gain.setValueAtTime(0, t + 0.035)
    g2.gain.linearRampToValueAtTime(0.03, t + 0.040)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.095)
    osc2.connect(g2).connect(ac.destination)
    osc2.start(t + 0.035); osc2.stop(t + 0.1)
  }
  haptic([6, 4, 3])
}
