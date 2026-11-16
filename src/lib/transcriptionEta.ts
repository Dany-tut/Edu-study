/** Recent measured throughput for one job/stage/phase. Never extrapolate media duration. */
export type ProgressSample = { current: number; total: number; unit: string; phase?: string }
export class TranscriptionEta {
  private key = ''
  private points: { at: number; current: number }[] = []
  observe(key: string, metric: ProgressSample | undefined, at: number) {
    const identity = `${key}:${metric?.unit}:${metric?.total}:${metric?.phase ?? ''}`
    if (identity !== this.key || (metric && this.points.length && metric.current < this.points[this.points.length - 1].current)) {
      this.key = identity; this.points = []
    }
    if (!metric || !Number.isFinite(metric.current) || !(metric.total > 0)) return
    if (!this.points.length || this.points[this.points.length - 1].current !== metric.current) this.points.push({at, current:metric.current})
    // Average a rolling window rather than letting slow model setup dominate the entire job.
    while (this.points.length > 2 && this.points[1].at < at - 60_000) this.points.shift()
  }
  remaining(metric: ProgressSample | undefined, now: number, key?: string): number | undefined {
    if (key !== undefined && `${key}:${metric?.unit}:${metric?.total}:${metric?.phase ?? ''}` !== this.key) return
    if (!metric || !(metric.total > 0) || this.points.length < 3) return
    const first = this.points[0], last = this.points[this.points.length - 1]
    if (last.at - first.at < 10_000 || now - last.at > 20_000 || last.current <= first.current) return
    const speed = (last.current - first.current) / ((last.at - first.at) / 1000)
    return Math.max(0, (metric.total - metric.current) / speed)
  }
}
