type PageResult = { data: unknown; error: { message: string; code?: string } | null }

/** A failed large page must never turn into a partial, apparently empty queue. */
export async function journalPages<T>(
  build: (offset: number, size: number) => PromiseLike<PageResult>,
  signal: AbortSignal,
  initialSize = 500,
): Promise<T[]> {
  const all: T[] = []
  let size = initialSize
  for (let offset = 0; ;) {
    signal.throwIfAborted()
    const { data, error } = await build(offset, size)
    signal.throwIfAborted()
    if (error) {
      // PostgreSQL statement timeout: retry the SAME offset with less work.
      if (error.code === '57014' && size > 10) {
        size = Math.max(10, Math.floor(size / 2))
        continue
      }
      throw new Error(error.message)
    }
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < size) return all
    offset += rows.length
  }
}

/** Read independent pages in a bounded window. Keep the full ordered result;
 * failures in a required page reject the load, never publish a partial journal. */
export async function journalParallelPages<T>(
  build: (offset: number, size: number) => PromiseLike<PageResult>,
  signal: AbortSignal,
  size = 50,
  concurrency = 4,
): Promise<T[]> {
  if (!Number.isInteger(size) || size < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Invalid journal page window')
  }
  async function range(offset: number, count: number): Promise<T[]> {
    signal.throwIfAborted()
    const { data, error } = await build(offset, count)
    signal.throwIfAborted()
    if (!error) return (data ?? []) as T[]
    if (error.code !== '57014' || count <= 10) throw new Error(error.message)
    // Split the SAME range: smaller retries must not shift the next window.
    const leftSize = Math.max(10, Math.floor(count / 2))
    const left = await range(offset, leftSize)
    if (left.length < leftSize) return left
    return [...left, ...await range(offset + leftSize, count - leftSize)]
  }
  const all: T[] = []
  for (let offset = 0; ; offset += size * concurrency) {
    signal.throwIfAborted()
    const pages = await Promise.allSettled(Array.from({ length: concurrency }, (_, i) => range(offset + i * size, size)))
    signal.throwIfAborted()
    for (const page of pages) {
      if (page.status === 'rejected') throw page.reason
      all.push(...page.value)
      // Speculative pages beyond the end are irrelevant, including their errors.
      if (page.value.length < size) return all
    }
  }
}
