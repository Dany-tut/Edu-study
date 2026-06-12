let ctx: AudioContext | null = null

function getCtx() {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  return ctx
}

function drop(ac: AudioContext, startAt: number, freq: number, vol: number) {
  const master = ac.createGain()
  master.gain.setValueAtTime(0.0001, startAt)
  master.gain.exponentialRampToValueAtTime(vol, startAt + 0.018)
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22)
  master.connect(ac.destination)

  const body = ac.createOscillator()
  body.type = 'triangle'
  body.frequency.setValueAtTime(freq, startAt)
  body.frequency.exponentialRampToValueAtTime(freq * 0.78, startAt + 0.22)

  const lowpass = ac.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(480, startAt)
  lowpass.Q.value = 0.5

  body.connect(lowpass)
  lowpass.connect(master)
  body.start(startAt)
  body.stop(startAt + 0.23)
}

export function playDing() {
  try {
    const ac = getCtx()
    if (ac.state === 'suspended') ac.resume()
    const now = ac.currentTime
    drop(ac, now,        260, 0.11)   // first knock
    drop(ac, now + 0.13, 220, 0.07)   // softer echo
  } catch {
    // AudioContext blocked or unavailable — silent fallback
  }
}
