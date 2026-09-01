import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import { recoverFromChunkError } from './lib/chunkError'
import { guardStylesheet } from './lib/cssGuard'
import './lib/pillProbe' // ВРЕМЕННО: замер шапки на устройстве, снять после разбора
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
// hashed filename no longer exists → white screen. Recover by force-reloading
// ONCE to pull the fresh index.html and its current chunk hashes. Приметы и
// гард от цикла живут в lib/chunkError (тот же список читает WidgetBoundary).
;(() => {
  const recover = (msg: string) => { void recoverFromChunkError(msg) }
  // preventDefault() здесь НЕ вызывается, хотя соблазн есть: событие cancelable,
  // и отмена гасит красную ошибку в консоли. Но у Vite отменённый preloadError
  // означает «ошибку обработали» — `baseModule().catch(handlePreloadError)`
  // возвращает undefined, и промис import() РЕЗОЛВИТСЯ пустотой вместо отказа.
  // Дальше на месте вызова получаем `Cannot read properties of undefined
  // (reading 'COURSE_SUMMARY')` вместо честного «чанк не доехал», а retryImport
  // не срабатывает вовсе: его .catch по резолву не зовётся.
  window.addEventListener('vite:preloadError', (e) => {
    recover(String((e as unknown as { payload?: { message?: string } }).payload?.message ?? 'dynamically imported module'))
  })
  window.addEventListener('error', (e) => recover(String(e?.message ?? '')))
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason
    recover(String(r instanceof Error ? r.message : r ?? ''))
  })
})()

// Пропавший CSS ошибок не даёт: страница живая, но без единого стиля.
// Отдельный сторож — см. lib/cssGuard.
guardStylesheet()

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
//
// ТОЛЬКО ученику. Чанк весит 933 КБ (≈300 КБ сжатым) и качается почти секунду —
// замер на проде. Гостю на лендинге и учителю в кабинете он не нужен ни на
// одном экране, а канал делит с теми запросами, которые нужны.
;(() => {
  const hasStudent = (() => {
    try { return !!localStorage.getItem('student_session') } catch { return false }
  })()
  if (!hasStudent) return
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
