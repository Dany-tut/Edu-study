// Opt-in diagnostics: no URLs, query values, identities, tokens or bodies.
// Keep timings local to this tab; useful for separating Auth/queue waits,
// network responses and React's subsequent table render on a slow opening.
export const performanceDiagnostics = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('perf') === '1'

type RequestTiming = { source: string; started: number; ms: number; status: number; concurrent: number; offset?: number }
const requests: RequestTiming[] = []
let active = 0

export function withRequestTiming(fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    if (!performanceDiagnostics) return fetcher(input, init)
    const url = new URL(input instanceof Request ? input.url : String(input))
    const source = url.pathname.startsWith('/rest/v1/') ? url.pathname.slice('/rest/v1/'.length)
      : url.pathname.startsWith('/auth/v1/') ? 'auth/' + url.pathname.split('/').pop() : null
    if (!source) return fetcher(input, init)
    const started = performance.now()
    const concurrent = ++active
    let status = 0
    try {
      const response = await fetcher(input, init)
      status = response.status
      return response
    } finally {
      active--
      const offset = url.searchParams.get('offset')
      const timing = { source, started: Math.round(started), ms: Math.round(performance.now() - started), status, concurrent,
        ...(offset !== null ? { offset: Number(offset) } : {}) }
      requests.push(timing)
      if (requests.length > 150) requests.shift()
      console.debug('[platform-request] ' + JSON.stringify(timing))
    }
  }
}

export function journalPaintTiming(started: number, ready: number) {
  if (!performanceDiagnostics) return
  console.debug('[journal-painted] ' + JSON.stringify({
    ms: Math.round(performance.now() - started), renderMs: Math.round(performance.now() - ready),
    requests: requests.filter(r => r.started >= started).length,
  }))
}

export function measureWork<T>(source: string, run: () => T): T {
  if (!performanceDiagnostics) return run()
  const started = performance.now()
  try { return run() } finally {
    const ms = Math.round(performance.now() - started)
    if (ms >= 20) console.debug('[platform-work] ' + JSON.stringify({ source, started: Math.round(started), ms }))
  }
}

if (performanceDiagnostics && typeof PerformanceObserver !== 'undefined') {
  console.debug('[platform-environment] ' + JSON.stringify({ width: window.innerWidth,
    touchPoints: navigator.maxTouchPoints, touchStart: 'ontouchstart' in window }))
  for (const type of ['resource', 'longtask']) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (type === 'longtask') {
          console.debug('[platform-longtask] ' + JSON.stringify({ started: Math.round(entry.startTime), ms: Math.round(entry.duration) }))
          continue
        }
        const resource = entry as PerformanceResourceTiming
        const path = new URL(resource.name).pathname
        if (!path.startsWith('/rest/v1/')) continue
        console.debug('[platform-resource] ' + JSON.stringify({ source: path.slice('/rest/v1/'.length),
          started: Math.round(resource.startTime), ms: Math.round(resource.duration), end: Math.round(resource.responseEnd),
          encodedBytes: resource.encodedBodySize, decodedBytes: resource.decodedBodySize }))
      }
    }).observe({ type, buffered: true })
  }
}
