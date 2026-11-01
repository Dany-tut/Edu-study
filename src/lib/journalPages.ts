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
