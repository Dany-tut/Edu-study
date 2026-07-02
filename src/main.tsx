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
