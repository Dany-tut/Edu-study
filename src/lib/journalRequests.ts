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

export async function journalBatches<T>(ids: string[], read: (batch: string[]) => Promise<T[]>, size = 100): Promise<T[]> {
  if (!Number.isInteger(size) || size < 1) throw new Error('Invalid journal batch size')
  const batches = Array.from({ length: Math.ceil(ids.length / size) }, (_, i) => ids.slice(i * size, i * size + size))
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

/** Primary keys bound the result size. Do not probe empty OFFSET pages after
 * reading an exact set of lesson IDs, particularly with rich homework JSON. */
export async function journalRowsById<T>(ids: string[], signal: AbortSignal,
  read: (ids: string[]) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T[]> {
  async function exact(batch: string[]): Promise<T[]> {
    signal.throwIfAborted()
    const { data, error } = await read(batch)
    signal.throwIfAborted()
    if (error) {
      if (error.code !== '57014' || batch.length <= 10) throw new Error(error.message)
      const mid = Math.floor(batch.length / 2)
      return [...await exact(batch.slice(0, mid)), ...await exact(batch.slice(mid))]
    }
    const rows = (data ?? []) as (T & { id: string })[]
    const byId = new Map(rows.map(row => [row.id, row]))
    if (batch.some(id => !byId.has(id))) throw new Error('Не удалось загрузить задания уроков полностью. Обновите журнал.')
    return batch.map(id => byId.get(id)!)
  }
  return journalBatches([...new Set(ids)], exact, 50)
}
