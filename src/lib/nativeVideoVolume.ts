/** Lazy audio gain: ordinary playback keeps the browser's original audio path. */
export class NativeVideoVolume {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private ready: Promise<void> | null = null
  private level = 1
  private disposed = false

  constructor(private video: HTMLVideoElement) {}

  isFor(video: HTMLVideoElement): boolean { return this.video === video }

  async setLevel(level: number, muted: boolean): Promise<void> {
    this.level = Math.max(0, Math.min(1.5, level))
    this.video.volume = Math.min(1, this.level)
    this.video.muted = muted || this.level === 0
    if (this.level > 1 && !this.ready) this.ready = this.connect()
    if (this.ready) await this.ready
    if (this.disposed) return
    if (this.context && this.gain) {
      this.gain.gain.setTargetAtTime(Math.max(1, this.level), this.context.currentTime, .015)
    }
  }

  private async connect(): Promise<void> {
    const context = new AudioContext()
    this.context = context
    // Resume in the volume-slider gesture, before rerouting the media element.
    await context.resume()
    if (this.disposed) return
    const gain = context.createGain()
    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -2
    limiter.knee.value = 0
    limiter.ratio.value = 12
    limiter.attack.value = .003
    limiter.release.value = .15
    const source = context.createMediaElementSource(this.video)
    source.connect(gain).connect(limiter).connect(context.destination)
    this.gain = gain
    this.limiter = limiter
  }

  async resume(): Promise<void> { await this.context?.resume() }

  dispose(): void {
    this.disposed = true
    this.gain?.disconnect()
    this.limiter?.disconnect()
    void this.context?.close().catch(() => {})
  }
}
