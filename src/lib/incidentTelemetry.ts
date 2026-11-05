// Diagnostic context contains technical breadcrumbs, never form values or OAuth URLs.
export const INCIDENT_EVENTS = new Set(['js_error', 'promise_rejection', 'react_crash', 'widget_crash',
  'native_crash', 'bootstrap_error', 'api_slow', 'api_stalled', 'ui_freeze', 'ui_loading_stalled', 'ui_blank', 'operation_failed', 'auth_failed', 'auth_stalled', 'resource_error'])
type Breadcrumb = { at: string; event: string; path: string | null; endpoint?: string; status?: number }
const breadcrumbs: Breadcrumb[] = []
export function rememberDiagnosticEvent(event: string, path: string | null, meta: Record<string, unknown>) {
  if (!['page_view', 'api_request', 'auth_started', 'auth_cancelled', 'auth_completed', 'login', 'logout'].includes(event)) return
  breadcrumbs.push({ at: new Date().toISOString(), event, path,
    ...(typeof meta.endpoint === 'string' ? { endpoint: meta.endpoint } : {}),
    ...(typeof meta.status === 'number' ? { status: meta.status } : {}) })
  if (breadcrumbs.length > 30) breadcrumbs.shift()
}
export function sanitizeIncidentMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const clean = (value: unknown, depth = 0): unknown => {
    if (depth > 5) return '[depth limit]'
    if (typeof value === 'string') return value.slice(0, 4000)
      .replace(/([?&](?:access_token|refresh_token|token|code|apikey|key|password)=)[^&#\s]+/gi, '$1[redacted]')
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    if (Array.isArray(value)) return value.slice(0, 30).map(v => clean(v, depth + 1))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 40)
      .map(([k, v]) => [k, /password|secret|token|authorization|cookie/i.test(k) ? '[redacted]' : clean(v, depth + 1)]))
    return value
  }
  return clean(meta) as Record<string, unknown>
}
export function incidentContext() {
  return { incident_id: crypto.randomUUID(), breadcrumbs: [...breadcrumbs],
    language: navigator.language, visibility: document.visibilityState,
    screen: `${screen.width}×${screen.height}`, pixel_ratio: window.devicePixelRatio }
}
/** Visible-window checks: sleep/background suspension must not look like a freeze. */
export function installRuntimeDiagnostics(report: (event: string, meta: Record<string, unknown>) => void) {
  let previous = performance.now()
  let wasVisible = document.visibilityState === 'visible'
  let loadingSince = 0
  let blankSince = 0
  let lastLoadingReport = -Infinity
  let lastBlankReport = -Infinity
  let lastPath = location.hash
  document.addEventListener('visibilitychange', () => { previous = performance.now(); wasVisible = false; loadingSince = 0; blankSince = 0 })
  setInterval(() => {
    const now = performance.now()
    const visible = document.visibilityState === 'visible'
    if (visible && wasVisible && now - previous > 3000 && now - previous < 60000)
      report('ui_freeze', { duration_ms: Math.round(now - previous - 1000), detection: 'event_loop_gap' })
    previous = now; wasVisible = visible
    if (!visible) return
    if (location.hash !== lastPath) { loadingSince = 0; blankSince = 0; lastPath = location.hash }
    // Explicit loading semantics only: role=status may be a permanent announcement.
    // A progressbar with aria-valuenow is a determinate meter (course progress,
    // lesson watched 40%) that stays on screen by design — not a loader. Counting
    // it reported a «stalled loader» every minute on the constructor.
    const loaders = [...document.querySelectorAll('[aria-busy="true"], [role="progressbar"]:not([aria-valuenow]), [data-diagnostic-loading="true"]')]
      .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0)
    loadingSince = loaders.length ? loadingSince || now : 0
    if (loadingSince && now - loadingSince >= 15000 && now - lastLoadingReport > 60000) {
      // Name the loader: without it the report says «something spins» and the
      // stalled widget cannot be found.
      // Optional chaining: a diagnostic must never throw out of the interval,
      // whatever the matched node turns out to be.
      const first = loaders[0] as Partial<Element> | undefined
      const cls = typeof first?.className === 'string' ? first.className : first?.getAttribute?.('class') ?? ''
      const loader = [first?.tagName?.toLowerCase(), first?.getAttribute?.('aria-label'), cls.slice(0, 60)]
        .filter(Boolean).join(' · ') || undefined
      report('ui_loading_stalled', { duration_ms: Math.round(now - loadingSince), loaders: loaders.length, loader })
      lastLoadingReport = now
    }
    const root = document.getElementById('root')
    const blank = root && !root.textContent?.trim() && !root.querySelector('canvas,video,img,svg,input')
    blankSince = blank ? blankSince || now : 0
    if (blankSince && now - blankSince >= 10000 && now - lastBlankReport > 60000) {
      report('ui_blank', { duration_ms: Math.round(now - blankSince) }); lastBlankReport = now
    }
  }, 1000)
  window.addEventListener('error', e => {
    if (e.target instanceof HTMLScriptElement || e.target instanceof HTMLLinkElement) {
      // Preserve only the asset filename; URL tokens and user paths stay private.
      const asset = e.target instanceof HTMLScriptElement ? e.target.src : e.target.href
      try { report('resource_error', { asset: new URL(asset).pathname.split('/').pop() }) } catch { /* invalid URL */ }
    }
  }, true)
}
