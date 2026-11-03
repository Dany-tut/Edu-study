// Observe only our backend. Never collect bodies, query strings, headers or tokens.
import { telemetrySource } from './telemetrySource'
let report: ((meta: Record<string, unknown>) => void) | undefined
export function setRequestReporter(sink: typeof report) { report = sink }

/** Preserve known technical auth routes, redact dynamic resource identifiers. */
export function diagnosticEndpoint(path: string): string {
  const parts = path.split('/')
  if (path.startsWith('/storage/')) return '/storage/v1'
  if (path.startsWith('/auth/v1/')) {
    const suffix = parts.slice(3).join('/')
    const known = new Set(['user', 'user/oauth/grants', 'user/identities', 'user/identities/authorize',
      'token', 'signup', 'logout', 'recover', 'verify', 'otp', 'authorize', 'callback', 'settings',
      'resend', 'reauthenticate', 'health', '.well-known/oauth-authorization-server'])
    if (known.has(suffix)) return '/auth/v1/' + suffix
    if (/^user\/(oauth\/grants|identities)\/[^/]+$/.test(suffix)) return '/auth/v1/' + parts.slice(3, -1).join('/') + '/:id'
    return '/auth/v1/:other'
  }
  if (/^\/rest\/v1\/rpc\/[a-zA-Z0-9_]+\/?$/.test(path)) return path.replace(/\/$/, '')
  if (/^\/rest\/v1\/[a-zA-Z0-9_]+\/?$/.test(path)) return path.replace(/\/$/, '')
  if (/^\/functions\/v1\/[a-zA-Z0-9_-]+\/?$/.test(path)) return path.replace(/\/$/, '')
  return '/:other'
}
function errorName(error: unknown): string {
  try { return error && typeof error === 'object' && 'name' in error ? String(error.name) : '' } catch { return '' }
}
function pageContext() {
  // A route key without query, fragment tokens or entity identifiers.
  const hash = typeof location !== 'undefined' ? location.hash : ''
  const routeNames = new Set(['#', '', 'teacher', 'homework', 'profile', 'groups', 'gradebook', 'constructor', 'courses', 'entry', 'join', 'join-teacher', 'login', 'student-login', 'lesson', 'trainer', 'en', 'ru', 'settings', 'admin', 'storage', 'finances', 'review', 'dashboard'])
  return { route: /^#\/[a-zA-Z0-9/-]*/.exec(hash)?.[0]?.split('/').slice(0, 3).map(p => routeNames.has(p) ? p : ':id').join('/') ?? '#/',
    visibility: typeof document !== 'undefined' ? document.visibilityState : 'unknown' }
}
let pageGeneration = 0
let leaving = false
let lifecycleInstalled = false
export function diagnosticFetch(base: typeof fetch, backend: string): typeof fetch {
  // A single listener pair per page, even if multiple clients wrap fetch.
  if (!lifecycleInstalled && typeof window !== 'undefined') {
    lifecycleInstalled = true
    window.addEventListener('pagehide', () => { leaving = true; pageGeneration++ })
    window.addEventListener('pageshow', () => { leaving = false; pageGeneration++ })
  }
  return async (input, init) => {
    let endpoint = ''
    try {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.origin === new URL(backend).origin && !url.pathname.includes('analytics')) endpoint = diagnosticEndpoint(url.pathname)
    } catch { /* Observability must never change request behavior. */ }
    const start = performance.now()
    const initial = pageContext()
    const generation = pageGeneration
    const source = telemetrySource()
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const emit = (status: number, event = 'api_request', detail: Record<string, unknown> = {}) => {
      if (!endpoint) return
      try { report?.({ event, endpoint, status, duration_ms: Math.round(performance.now() - start),
        method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
        online: navigator.onLine, ...source, start_route: initial.route, start_visibility: initial.visibility,
        end_route: pageContext().route, end_visibility: pageContext().visibility,
        page_changed: generation !== pageGeneration, page_leaving: leaving, signal_aborted: signal?.aborted ?? false,
        ...detail }) } catch { /* telemetry is best effort */ }
    }
    const pending = (event: string) => { if (!signal?.aborted && !leaving && pageContext().visibility === 'visible') emit(-1, event) }
    const slowTimer = endpoint ? setTimeout(() => pending('api_slow'), 8000) : undefined
    const stallTimer = endpoint ? setTimeout(() => pending('api_stalled'), 30000) : undefined
    try {
      const response = await base(input, init)
      emit(response.status, 'api_request', { outcome: response.ok ? 'success' : 'http_error' })
      return response
    } catch (error) {
      const name = errorName(error)
      const timedOut = name === 'TimeoutError' || (signal?.aborted && errorName(signal.reason) === 'TimeoutError')
      const cancelled = !timedOut && (name === 'AbortError' || signal?.aborted)
      emit(0, cancelled ? 'api_cancelled' : 'api_request', {
        outcome: cancelled ? 'cancelled' : timedOut ? 'timeout' : 'transport_error',
        error_kind: cancelled ? 'abort' : timedOut ? 'timeout' : name === 'TypeError' ? 'network' : 'unknown',
      })
      // Pagehide is correlation only, never sufficient to suppress a transport failure.
      throw error
    } finally { clearTimeout(slowTimer); clearTimeout(stallTimer) }
  }
}
