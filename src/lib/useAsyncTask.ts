import { useCallback, useEffect, useRef, useState } from 'react'

import { abortable } from './abortable'

/** One in-flight action. Cancellation fences callbacks even if a service ignores abort. */
export function useAsyncTask(timeout = 30_000) {
  const active = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const cancel = useCallback(() => {
    const previous = active.current
    active.current = null
    previous?.abort(new DOMException('Cancelled', 'AbortError'))
    setBusy(false)
  }, [])
  useEffect(() => () => { const previous = active.current; active.current = null; previous?.abort() }, [])
  const run = useCallback(async <T,>(work: (signal: AbortSignal) => PromiseLike<T>, success: (value: T) => void, failure: (error: unknown) => void) => {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeout)
    try {
      const value = await abortable(Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return work(controller.signal)
      }), controller.signal)
      if (active.current === controller) success(value)
    } catch (error) {
      if (active.current === controller) failure(error)
    } finally {
      clearTimeout(timer)
      if (active.current === controller) { active.current = null; setBusy(false) }
    }
  }, [timeout])
  return { busy, run, cancel }
}
