import { abortable } from './abortable'

// Only fresh sessions being committed by an explicit login are fenced here.
// An abandoned login must not later persist its session or emit SIGNED_IN.
const commits = new Map<string, AbortSignal>()
const exchanges = new Map<string, AbortSignal>()
export function fenceAuthCode(code: string, signal: AbortSignal) {
  exchanges.set(code, signal)
  return () => { if (exchanges.get(code) === signal) exchanges.delete(code) }
}
export function fenceAuthCommit(token: string, signal: AbortSignal) {
  commits.set(token, signal)
  return () => { if (commits.get(token) === signal) commits.delete(token) }
}

// Сессию стирает только сам сервер Auth, а не сбой по дороге к нему.
//
// auth-js на любой «неповторяемой» ошибке обновления токена удаляет сессию
// (_removeSession → SIGNED_OUT) — учитель вылетает посреди работы. Повторяемыми
// он считает только сеть и 502/503/504/52x. Но 20.11 база Auth минуту отвечала
// 500 («failed to connect … supabase_auth_admin»), прокси РФ может вернуть
// HTML-страницу или 404/429 — всё это для SDK «токен плохой». Здесь такие
// ответы на refresh превращаются в 503: SDK оставляет сессию и повторит через
// тик автообновления. Настоящий отказ (400/401/403 с JSON-кодом GoTrue:
// refresh_token_not_found, refresh_token_already_used, session_not_found…)
// проходит как есть — отозванную сессию держать нельзя.
export function isRefreshRequest(url: URL, method: string | undefined): boolean {
  return (method ?? 'GET').toUpperCase() === 'POST' && url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token'
}
export function isGenuineRefreshRejection(status: number, body: ArrayBuffer): boolean {
  if (status !== 400 && status !== 401 && status !== 403) return false
  try {
    const data = JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown> | null
    return !!data && typeof data === 'object' && (typeof data.error_code === 'string' || typeof data.code === 'string' || typeof data.error === 'string')
  } catch { return false }
}

export function authTransport(base: typeof fetch, backend: string, operation?: AbortSignal): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.origin !== new URL(backend).origin || !url.pathname.startsWith('/auth/v1/')) return base(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    const token = headers.get('authorization')?.replace(/^Bearer /i, '') ?? ''
    let exchange: AbortSignal | undefined
    try { if (typeof init?.body === 'string') exchange = exchanges.get(JSON.parse(init.body).auth_code) } catch { /* Other Auth requests have no code. */ }
    const controller = new AbortController()
    const sources = [operation, exchange, commits.get(token), init?.signal, input instanceof Request ? input.signal : undefined].filter((s): s is AbortSignal => !!s)
    const listeners = sources.map(signal => {
      const cancel = () => controller.abort(signal.reason)
      if (signal.aborted) cancel()
      else signal.addEventListener('abort', cancel, { once: true })
      return () => signal.removeEventListener('abort', cancel)
    })
    const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 30_000)
    try {
      controller.signal.throwIfAborted()
      return await abortable(Promise.resolve(base(input, { ...init, signal: controller.signal })).then(async response => {
        controller.signal.throwIfAborted()
        // Keep the deadline active through the JSON body, not just response headers.
        const body = await abortable(response.arrayBuffer(), controller.signal)
        controller.signal.throwIfAborted()
        if (!response.ok && isRefreshRequest(url, init?.method ?? (input instanceof Request ? input.method : undefined)) && !isGenuineRefreshRejection(response.status, body)) {
          console.warn('[auth] refresh failed transiently, keeping session', response.status)
          return new Response(JSON.stringify({ code: 'transient_refresh_failure', msg: `Auth ${response.status}` }), {
            status: 503, statusText: 'Service Unavailable', headers: { 'content-type': 'application/json' },
          })
        }
        return new Response([204, 205, 304].includes(response.status) ? null : body, {
          status: response.status, statusText: response.statusText, headers: response.headers,
        })
      }), controller.signal)
    } finally { clearTimeout(timer); listeners.forEach(remove => remove()) }
  }
}
