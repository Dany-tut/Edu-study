let ctx: AudioContext | null = null

function getCtx() {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  return ctx
}

export function playDing() {
  try {
    const ac = getCtx()
    const now = ac.currentTime

    // Two-oscillator bell chord: fundamental + major third
    const freqs = [1046.5, 1318.5] // C6 + E6
    freqs.forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      // Slight downward drift — natural bell decay
      osc.frequency.exponentialRampToValueAtTime(freq * 0.97, now + 0.8)

      const vol = i === 0 ? 0.28 : 0.18
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(vol, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)

      osc.start(now)
      osc.stop(now + 1.8)
    })
  } catch {
    // AudioContext blocked or unavailable — silent fallback
  }
}
