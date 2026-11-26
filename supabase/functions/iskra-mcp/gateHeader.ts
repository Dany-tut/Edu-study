// Этап 2: токен ИИ-помощника работает с базой ТОЛЬКО через эту функцию.
//
// OAuth-токен Supabase — обычный JWT учителя. Без защиты помощник мог бы
// ходить с ним в REST напрямую, в обход прав, лимитов и журнала MCP. Поэтому
// фильтр запросов PostgREST (public.mfa_pre_request → private.mcp_request_allowed,
// миграция 20261126120000) отклоняет любой запрос с `client_id` в токене, если
// в нём нет заголовка `x-iskra-mcp-key` с секретом этой функции. Секрет знает
// только функция (переменная ISKRA_MCP_GATE_KEY); в базе хранится его sha256.
//
// Клиент Supabase создаёт @supabase/server, своих заголовков он не принимает,
// поэтому заголовок добавляется на уровне fetch — и только к запросам в REST и
// Storage этого же проекта. Наружу секрет не уходит.

export const GATE_HEADER = 'x-iskra-mcp-key'

export function withGateHeader(base: typeof fetch, apiUrl: string, key: string): typeof fetch {
  const api = apiUrl.replace(/\/+$/, '')
  if (!key || !api) return base
  const targets = [`${api}/rest/v1/`, `${api}/storage/v1/`]
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!targets.some(t => url.startsWith(t))) return base(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set(GATE_HEADER, key)
    return base(input, { ...init, headers })
  }) as typeof fetch
}

/** Подключить один раз при загрузке функции. */
export function installGateHeader() {
  const key = Deno.env.get('ISKRA_MCP_GATE_KEY') ?? ''
  const api = Deno.env.get('SUPABASE_URL') ?? ''
  globalThis.fetch = withGateHeader(globalThis.fetch.bind(globalThis), api, key)
}
