import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import './lib/pwaInstall' // register beforeinstallprompt listener ASAP (fires once)

// ── PostHog — после первого кадра, отдельным чанком ──────────────────────────
//
// Библиотека весит ~200 КБ и в главном чанке стояла впереди приложения: её
// нужно было скачать и выполнить до того, как человек увидит хоть что-то.
// Ничего срочного она не делает — первый pageview спокойно уходит на пару
// сотен миллисекунд позже. Переходы, случившиеся до загрузки, копятся в
// очереди, чтобы ни один не потерялся.
const phKey = import.meta.env.VITE_POSTHOG_KEY
if (phKey) {
  const pending: string[] = []
  const path = () => window.location.hash || '/'
  let track = (p: string) => { pending.push(p) }
  const onHash = () => track(path())
  window.addEventListener('hashchange', onHash)
  track(path())

  const boot = () => {
    void import('posthog-js').then(({ default: posthog }) => {
      posthog.init(phKey, {
        api_host: 'https://eu.i.posthog.com',
        capture_pageview: false, // управляем вручную через hashchange
        session_recording: { maskAllInputs: true },
      })
      track = p => posthog.capture('$pageview', { path: p })
      for (const p of pending.splice(0)) track(p)
    }).catch(() => { /* аналитика не обязана взлететь */ })
  }
  // requestIdleCallback есть не везде (в Safari до 18 — нет), поэтому таймер
  // как запасной путь: важно лишь не соревноваться с первой отрисовкой.
  if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 3000 })
  else setTimeout(boot, 1200)
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
    const el = e.target as Element | Document
    if (!el || !(el instanceof Element)) return
    el.classList.add('is-scrolling')
    const prev = timers.get(el)
    if (prev) clearTimeout(prev)
    timers.set(el, setTimeout(() => { el.classList.remove('is-scrolling') }, 800))
  }, { capture: true, passive: true })
})()

// Пословный словарь (см. lexicon.ts) грузится отдельным чанком и нужен на
// уроке, в карточках и в тренажёре — то есть почти всем, но не для первого
// кадра. Просим его на простое: к моменту, когда ученик откроет урок, он уже
// на месте, а первую отрисовку он не задержал.
;(() => {
  const warm = () => { void import('./lib/lexicon').then(m => m.ensureGloss()).catch(() => { /**/ }) }
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 5000 })
  else setTimeout(warm, 2000)
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineBanner />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
