export function abortable<T>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
    if (signal.aborted) {
      // A promise may already be running; consume its eventual rejection too.
      void Promise.resolve(work).catch(() => undefined)
      abort(); return
    }
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve(work).then(value => {
      if (!signal.aborted) resolve(value)
    }, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

