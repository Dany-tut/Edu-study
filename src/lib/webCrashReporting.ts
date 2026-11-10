import { Capacitor } from '@capacitor/core'
import { redactCrashEvent } from './crashEventPrivacy'

/*
 * Sentry для веба (проект iskra-web в организации iskra-b9, регион EU).
 *
 * Свой сбор падений (analytics_events → Stata, «Проблемы» в админке) остаётся
 * как есть. Sentry добавляет группировку одинаковых ошибок, историю по
 * версиям и письма о новых.
 *
 * DSN — публичный ключ отправки: он всё равно виден в коде сайта, секрета в
 * нём нет. Работает только на проде и превью Vercel: localhost и QA-стенды
 * квоту не тратят. В нативном приложении — свой проект (nativeCrashReporting).
 *
 * Личные данные не уходят: sendDefaultPii выключен, без breadcrumbs и
 * трассировки, а beforeSend прогоняет событие через redactCrashEvent
 * (убирает user/request/extra, токены, JWT и почты).
 *
 * SDK грузится отдельным чанком после загрузки страницы, чтобы не утяжелять
 * старт. Ошибки до этого момента ловит собственная аналитика.
 */
const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)
  ?? 'https://981646c4808164d724ed815afdba3d04@o4512368290168832.ingest.de.sentry.io/4512368339386448'
// Боевые домены: исходный Vercel и российский iskra-study.ru (миграция домена,
// docs/infra/domain-migration.md). Оба считаем production.
const PROD_HOSTS = ['edu-study-app.vercel.app', 'iskra-study.ru']
const isProdHost = (h: string) => PROD_HOSTS.includes(h)

type Sentry = typeof import('@sentry/react')
let sentry: Sentry | null = null
const pending: Array<{ error: unknown; componentStack: string }> = []

function eventSource(): 'qa' | 'automation_suspected' | 'browser_unclassified' {
  try { if (sessionStorage.getItem('iskra:telemetry-source') === 'qa') return 'qa' } catch { /**/ }
  if (navigator.webdriver || /HeadlessChrome|Playwright/i.test(navigator.userAgent)) return 'automation_suspected'
  return 'browser_unclassified'
}

async function start() {
  try {
    const mod = await import('@sentry/react')
    mod.init({
      dsn: DSN,
      release: __APP_VERSION__,
      environment: isProdHost(location.hostname) ? 'production' : 'preview',
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      // Шум, который уже обработан самим приложением или не наш:
      // устаревший чанк после деплоя лечится перезагрузкой, сетевые обрывы
      // и наши таймауты показываются пользователю как ошибка сохранения.
      ignoreErrors: [
        /ResizeObserver loop/,
        /Failed to fetch dynamically imported module/,
        /Importing a module script failed/,
        /error loading dynamically imported module/,
        /^TypeError: (Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)$/,
        /^(AbortError|TimeoutError)\b/,
      ],
      initialScope: { tags: { event_source: eventSource(), app_host_kind: isProdHost(location.hostname) ? 'canonical_production' : 'preview' } },
      beforeSend(event, hint) {
        if (hint.attachments) hint.attachments = []
        return redactCrashEvent(event)
      },
    })
    sentry = mod
    for (const p of pending.splice(0)) capture(p.error, p.componentStack)
  } catch { /* отчёты не должны мешать работе приложения */ }
}

export function initWebCrashReporting() {
  if (!DSN || Capacitor.isNativePlatform()) return
  const host = location.hostname
  if (!isProdHost(host) && !host.endsWith('.vercel.app')) return
  const go = () => { void start() }
  const idle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 1500))
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
}

function capture(error: unknown, componentStack: string) {
  sentry?.withScope(scope => {
    scope.setTag('boundary', 'page')
    if (componentStack) scope.setContext('react', { componentStack: componentStack.slice(0, 1500) })
    sentry?.captureException(error)
  })
}

/** Падение рендера из ErrorBoundary: глобальные обработчики его не видят. */
export function reportRenderCrash(error: unknown, componentStack: string) {
  try {
    if (sentry) capture(error, componentStack)
    else if (pending.length < 5) pending.push({ error, componentStack })
  } catch { /**/ }
}
