/** Diagnostic labels only; client-editable and never an authorization decision. */
export function telemetrySource() {
  let qa = false
  try { qa = sessionStorage.getItem('iskra:telemetry-source') === 'qa' } catch { /* private storage */ }
  const automation = typeof navigator !== 'undefined' && (navigator.webdriver === true || /HeadlessChrome|Playwright/i.test(navigator.userAgent))
  const host = typeof location === 'undefined' ? '' : location.hostname
  return {
    event_source: qa ? 'qa' : automation ? 'automation_suspected' : 'browser_unclassified',
    app_host_kind: host === 'edu-study-app.vercel.app' || host === 'iskra-study.ru' ? 'canonical_production' : /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? 'local' : 'other_host',
  }
}
