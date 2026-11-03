// Observe only our backend. Never collect bodies, query strings, headers or tokens.
let report: ((meta: Record<string, unknown>) => void) | undefined
export function setRequestReporter(sink: typeof report) { report = sink }
export function diagnosticFetch(base: typeof fetch, backend: string): typeof fetch {
  return async (input, init) => {
    let endpoint = ''
    try {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.origin === new URL(backend).origin && !url.pathname.includes('analytics')) {
        // Only service/resource names; storage object paths and auth identities stay private.
        endpoint = url.pathname.split('/').slice(0, url.pathname.startsWith('/rest/v1/rpc/') ? 5 : 4).join('/')
        if (url.pathname.startsWith('/storage/')) endpoint = '/storage/v1'
      }
    } catch { /* Observability must never change request behavior. */ }
    const start = performance.now()
    const emit = (status: number, event = 'api_request') => {
      if (!endpoint) return
      try { report?.({ event, endpoint, status, duration_ms: Math.round(performance.now() - start),
        method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
        online: navigator.onLine }) } catch { /* telemetry is best effort */ }
    }
    const slowTimer = endpoint ? setTimeout(() => { if (document.visibilityState === 'visible') emit(-1, 'api_slow') }, 8000) : undefined
    const stallTimer = endpoint ? setTimeout(() => { if (document.visibilityState === 'visible') emit(-1, 'api_stalled') }, 30000) : undefined
    try {
      const response = await base(input, init)
      // All requests, including successes, form the denominator for error rates.
      emit(response.status)
      return response
    } catch (error) {
      // User cancellations are not service failures.
      if (!(error instanceof DOMException && error.name === 'AbortError')) emit(0)
      throw error
    } finally {
      clearTimeout(slowTimer); clearTimeout(stallTimer)
    }
  }
}
