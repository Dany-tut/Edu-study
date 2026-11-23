/** Bounded dashboard work; a rejected request never strands other sections. */
export type AnalyticsLoadTask = {
  id: string
  run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>
  apply: (data: unknown) => void
}
export async function loadAnalyticsSections(tasks: AnalyticsLoadTask[], current: () => boolean,
  settled: (id: string, error: string | null) => void, concurrency = 2) {
  let next = 0
  async function worker() {
    while (current() && next < tasks.length) {
      const task = tasks[next++]
      let message: string | null = null
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const result = await Promise.race([
          task.run(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out')), 20_000) }),
        ])
        if (!current()) return
        if (result.error) message = result.error.message
        else task.apply(result.data)
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      }
      finally { if (timer !== undefined) clearTimeout(timer) }
      if (current()) settled(task.id, message)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
}
