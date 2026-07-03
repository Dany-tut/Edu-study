import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'

const phKey = import.meta.env.VITE_POSTHOG_KEY
if (phKey) {
  posthog.init(phKey, {
    api_host: 'https://eu.i.posthog.com',
    capture_pageview: false, // управляем вручную через hashchange
    session_recording: { maskAllInputs: true },
  })
  // Трекаем hash-переходы как pageview
  const trackPage = () => posthog.capture('$pageview', { path: window.location.hash || '/' })
  trackPage()
  window.addEventListener('hashchange', trackPage)
}

// After a new deploy, a client running the old HTML asks for a JS chunk whose
// hashed filename no longer exists → "Failed to fetch dynamically imported
// module" / "error loading dynamically imported module" → white screen. Recover
// by force-reloading ONCE (guarded via sessionStorage so we never loop) to pull
// the fresh index.html and its current chunk hashes.
;(() => {
  const RELOAD_KEY = 'chunk_reload_at'
  const isChunkError = (msg: string) =>
    /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i.test(msg)
  const recover = (msg: string) => {
    if (!isChunkError(msg)) return
    let last = 0
    try { last = Number(sessionStorage.getItem(RELOAD_KEY) || '0') } catch { /**/ }
    // Only reload if we haven't just done so (avoid an infinite reload loop when
    // the chunk is genuinely gone rather than merely stale).
    if (Date.now() - last < 10_000) return
    try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())) } catch { /**/ }
    window.location.reload()
  }
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault()
    recover(String((e as unknown as { payload?: { message?: string } }).payload?.message ?? 'dynamically imported module'))
  })
  window.addEventListener('error', (e) => recover(String(e?.message ?? '')))
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason
    recover(String(r instanceof Error ? r.message : r ?? ''))
  })
})()

// Global scroll-aware scrollbar: show thumb only while scrolling, hide after idle.
;(() => {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
  window.addEventListener('scroll', e => {
    const el = e.target as Element
    if (!el || el === document) return
    el.classList.add('is-scrolling')
    const prev = timers.get(el)
    if (prev) clearTimeout(prev)
    timers.set(el, setTimeout(() => { el.classList.remove('is-scrolling') }, 800))
  }, { capture: true, passive: true })
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineBanner />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
