/** Shares the course writer's queue. Expiry cancels only an unstarted chapter
 * save; a late earlier write can never revive it after the UI reports expiry. */
export function enqueueChapterSave<T>(queue: {current:Promise<unknown>}, write: () => Promise<T>, waitMs = 12000): Promise<T> {
  let expired = false
  let started = false
  let timer: ReturnType<typeof setTimeout>
  const message = 'Ещё сохраняются другие изменения курса. Черновик глав сохранён — повторите сохранение.'
  const waiting = new Promise<T>((_, reject) => { timer = setTimeout(() => {
    if (!started) { expired = true; reject(new Error(message)) }
  }, waitMs) })
  const run = queue.current.catch(() => undefined).then(() => {
    if (expired) throw new Error(message)
    started = true; clearTimeout(timer)
    return write()
  })
  queue.current = run
  return Promise.race([run, waiting]).finally(() => clearTimeout(timer))
}
