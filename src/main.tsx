import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
