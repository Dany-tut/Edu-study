/** Collapse only consecutive, not-yet-started autosaves of the same entity.
 * The active write is immutable. Any explicit write on the shared chain is a
 * barrier (publication, chapter edit, leaving the editor): never reorder it.
 * Superseded callers await the replacement's actual result, including failure.
 */
export function createLatestSave<T, R>(chain: { current: Promise<unknown> }) {
  type Task = { key: string; value: T; write: (value: T) => Promise<R>; started: boolean; promise: Promise<R> }
  let pending: Task | null = null
  return (key: string, value: T, write: (value: T) => Promise<R>): Promise<R> => {
    if (pending && !pending.started && pending.key === key && chain.current === pending.promise) {
      pending.value = value
      pending.write = write
      return pending.promise
    }
    let task: Task
    const start = () => {
      task.started = true
      if (pending === task) pending = null
      return task.write(task.value)
    }
    const promise = chain.current.then(start, start)
    task = { key, value, write, started: false, promise }
    pending = task
    chain.current = promise
    return promise
  }
}
