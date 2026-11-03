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
        return new Response([204, 205, 304].includes(response.status) ? null : body, {
          status: response.status, statusText: response.statusText, headers: response.headers,
        })
      }), controller.signal)
    } finally { clearTimeout(timer); listeners.forEach(remove => remove()) }
  }
}
