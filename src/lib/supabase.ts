import { createClient } from '@supabase/supabase-js'

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

export const supabase = createClient(url, key)

// Адрес и ключ отдельно: на выгрузке страницы обычный клиент не годится —
// его fetch умирает вместе со страницей. Телеметрия досылает последнюю пачку
// сырым fetch с keepalive (см. lib/analytics.ts), и ему нужны те же URL и ключ.
export const SUPABASE_URL = url
export const SUPABASE_KEY = key
