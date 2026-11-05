import { createClient, navigatorLock } from '@supabase/supabase-js'
import { diagnosticFetch } from './diagnosticFetch'
import { teacherViewFetch } from './teacherView'
import { withRequestTiming } from './platformPerformance'
import { authTransport } from './authTransport'

// Public client used from the browser. The publishable key is safe to ship —
// all access is enforced server-side by Row Level Security policies.
// Secrets (service_role / DB password) never live here; they stay server-only.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Copy .env.example → .env.local and fill them in.',
  )
}

// Steal has a victim. When a tab waits past lockAcquireTimeout it takes the
// lock by force, and the tab that held it gets «Lock … was released because
// another request stole it» (or the raw AbortError «Lock broken by another
// request with the 'steal' option») out of getUser/getSession. Nobody handles
// that: 12 unhandled rejections on the constructor on 04.11, each one a call
// whose answer was lost. Requeue once WITHOUT stealing — the call waits behind
// the stealer like any other, so there is no steal-back cascade.
function isStolenLock(e: unknown): boolean {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return /stole it|with the 'steal' option/.test(msg)
}
async function requeueStolenLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  try {
    return await navigatorLock(name, acquireTimeout, fn)
  } catch (e) {
    if (!isStolenLock(e)) throw e
    return navigatorLock(name, acquireTimeout, fn)
  }
}

// OAuth returns a one-time query code, leaving the application's hash router intact.
export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    // auth-js 2.108 only single-flights within one client by default. Share
    // its existing Auth lock across tabs using this project's storage key.
    // Every getSession (the teacher gate, each REST call) waits for this lock,
    // so a sleeping or stalled tab holding it froze the whole app on
    // «Проверяем доступ…» for the full wait. Steal after the SDK's 5s default:
    // a rare overlapping refresh is cheaper than a frozen cabinet.
    ...(typeof navigator !== 'undefined' && navigator.locks ? { lock: requeueStolenLock, lockAcquireTimeout: 5_000 } : {}),
  }, global: { fetch: withRequestTiming(diagnosticFetch(authTransport(teacherViewFetch, url), url)) },
})

// Адрес и ключ отдельно: на выгрузке страницы обычный клиент не годится —
// его fetch умирает вместе со страницей. Телеметрия досылает последнюю пачку
// сырым fetch с keepalive (см. lib/analytics.ts), и ему нужны те же URL и ключ.
export const SUPABASE_URL = url
export const SUPABASE_KEY = key
