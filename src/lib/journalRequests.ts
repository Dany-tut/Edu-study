// Preserve complete, ordered results without serializing independent ID batches.
export async function journalPages<T>(build: (offset: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, signal?: AbortSignal): Promise<T[]> {
  const all: T[] = []
  for (let offset = 0; ; offset += 500) {
    signal?.throwIfAborted()
    const { data, error } = await build(offset)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < 500) return all
  }
}

export async function journalBatches<T>(ids: string[], read: (batch: string[]) => Promise<T[]>): Promise<T[]> {
  const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, i * 100 + 100))
  const results: T[][] = new Array(batches.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(3, batches.length) }, async () => {
    while (cursor < batches.length) {
      const index = cursor++
      results[index] = await read(batches[index])
    }
  }))
  return results.flat()
}
