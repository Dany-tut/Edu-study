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
