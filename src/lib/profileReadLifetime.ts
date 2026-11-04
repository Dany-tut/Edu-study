// Profile reads belong to the open card. A page restored from the back/forward
// cache keeps its React tree, so restart its reads after a persisted pageshow.
export function profileReadLifetime(read: (signal: AbortSignal) => void) {
  let controller = new AbortController()
  const stop = () => controller.abort()
  const restore = (event: PageTransitionEvent) => {
    if (event.persisted && controller.signal.aborted) {
      controller = new AbortController()
      read(controller.signal)
    }
  }
  window.addEventListener('pagehide', stop)
  window.addEventListener('pageshow', restore)
  read(controller.signal)
  return () => {
    window.removeEventListener('pagehide', stop)
    window.removeEventListener('pageshow', restore)
    stop()
  }
}
