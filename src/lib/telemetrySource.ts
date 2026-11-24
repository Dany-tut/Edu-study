// Приложение само уходит на перезагрузку (обновление версии, лечение чанка):
// снимает воркер, чистит кеши и вызывает reload(). Safari при этом рвёт все
// запросы в полёте с «Load failed» — до pagehide, поэтому page_leaving их не
// ловил. 24.11.2026 одна вкладка дала 120 «transport_error» и 68 resource_error
// за секунду до перезагрузки на новую версию. Это не сбой сети и не баг экрана:
// причина известна точно, потому что перезагрузку начали мы.
let appReloading = false
export function markAppReloading() { appReloading = true }
// Ручная перезагрузка (⌘R/F5) и уход со страницы рвут запросы так же — и тоже
// до pagehide: 24.11.2026 админ нажал ⌘R, и за 6 мс до session_start легли
// 8 transport_error и db_error. beforeunload приходит раньше разрыва. Его
// могут отменить (окно «Покинуть страницу?» у черновика) — тогда через 3 с
// живая страница снимает флаг, и настоящие сбои снова пишутся.
let unloadTimer: ReturnType<typeof setTimeout> | undefined
export function installUnloadMarker() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeunload', () => {
    appReloading = true
    clearTimeout(unloadTimer)
    unloadTimer = setTimeout(() => { appReloading = false }, 3000)
  })
}
export function isAppReloading() { return appReloading }

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
