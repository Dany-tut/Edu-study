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

// OAuth returns a one-time query code, leaving the application's hash router intact.
export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    // auth-js 2.108 only single-flights within one client by default. Share
    // its existing Auth lock across tabs using this project's storage key.
    // Allow the SDK's 30s retry window plus one 30s transport deadline
    // before its legacy lock helper can steal a lock.
    ...(typeof navigator !== 'undefined' && navigator.locks ? { lock: navigatorLock, lockAcquireTimeout: 65_000 } : {}),
  }, global: { fetch: withRequestTiming(diagnosticFetch(authTransport(teacherViewFetch, url), url)) },
})

// Адрес и ключ отдельно: на выгрузке страницы обычный клиент не годится —
// его fetch умирает вместе со страницей. Телеметрия досылает последнюю пачку
// сырым fetch с keepalive (см. lib/analytics.ts), и ему нужны те же URL и ключ.
export const SUPABASE_URL = url
export const SUPABASE_KEY = key
