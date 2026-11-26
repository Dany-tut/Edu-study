// DEV-стенд «ИИ-помощники» (MCP v2) на ФИКСТУРАХ: сеть Supabase подменена,
// в прод ничего не уходит. Это приёмка fixture-стенда, не полного UI с сервером
// (docs/qa/interaction-acceptance.md). Сервер и права проверяются отдельно:
// npm run check:iskra-mcp, npm run check:iskra-mcp-db.
//
//   /dev-ai-assistants.html?platform=pc|ipad|iphone|android&theme=light|dark&view=panel|consent|empty
const params = new URLSearchParams(location.search)
const platform = params.get('platform') ?? 'pc'
const UA: Record<string, string> = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
}
// Платформа определяется по UA при загрузке модуля platform.ts — подменяем
// до первого импорта приложения.
if (UA[platform]) Object.defineProperty(navigator, 'userAgent', { get: () => UA[platform] })
document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const CLAUDE = '6f2c1d0e-8a91-4c3b-9e55-0b7a1c2d3a91'
const CODEX = '0c0dec5e-2b11-4f0a-8d3e-77aa10c0de55'
const empty = params.get('view') === 'empty'

const grants = empty ? [] : [
  { client: { id: CLAUDE, name: 'Claude', uri: 'https://claude.ai' }, scopes: ['email'], granted_at: '2026-11-21T09:12:00Z' },
  { client: { id: CODEX, name: 'Codex', uri: 'https://chatgpt.com' }, scopes: ['email'], granted_at: '2026-11-18T15:40:00Z' },
]
const scopes: Record<string, { client_id: string; scopes: string[]; granted_at: string; updated_at: string; revoked_at: string | null }> = {
  [CLAUDE]: { client_id: CLAUDE, scopes: ['courses:read', 'students:read', 'progress:read', 'events:read', 'attachments:read'], granted_at: '2026-11-21T09:12:00Z', updated_at: '2026-11-21T09:12:00Z', revoked_at: null },
}
let logId = 100
const log = [
  ['list_events', 'events:read', 'ok', 3, 2], ['get_attachment', 'attachments:read', 'ok', 1, 2], ['get_lesson_answers', 'progress:read', 'ok', 1, 3],
  ['get_attachment', 'attachments:read', 'rate_limited', null, 14], ['student_summary', 'progress:read', 'ok', 1, 380], ['list_my_students', 'students:read', 'ok', 4, 381],
  ['list_events', 'events:read', 'ok', 0, 1440], ['course_progress', 'progress:read', 'ok', 1, 1442], ['list_events', 'events:read', 'ok', 12, 2880],
].map(([tool, scope, status, count, ago]) => ({ id: logId--, client_id: CLAUDE, tool, scope, status, result_count: count, created_at: minutesAgo(ago as number) }))
log.push({ id: 1, client_id: CODEX, tool: 'list_my_courses', scope: 'courses:read', status: 'ok', result_count: 6, created_at: '2026-11-19T10:00:00Z' })

const user = { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'teacher@example.com' }
const session = { user, access_token: 'stand-token' }

async function boot() {
  const { supabase, SUPABASE_URL } = await import('./lib/supabase')
  const sb = supabase as unknown as Record<string, any>
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null })
  sb.auth.getSession = () => ok({ session })
  sb.auth.getUser = () => ok({ user })
  sb.auth.onAuthStateChange = (cb: (e: string, s: unknown) => void) => { setTimeout(() => cb('SIGNED_IN', session), 0); return { data: { subscription: { unsubscribe() {} } } } }
  sb.auth.oauth = {
    listGrants: () => ok(grants),
    getAuthorizationDetails: () => ok({ authorization_id: 'stand', redirect_uri: params.get('redirect') ?? 'https://claude.ai/api/mcp/auth_callback', client: { id: CLAUDE, name: 'Claude', uri: 'https://claude.ai' }, scope: 'email' }),
  }
  sb.rpc = (fn: string, args: Record<string, unknown>) => {
    if (fn === 'is_staff') return ok(true)
    if (fn === 'mcp_set_scopes') {
      const id = String(args.p_client_id)
      scopes[id] = { client_id: id, scopes: args.p_scopes as string[], granted_at: scopes[id]?.granted_at ?? new Date().toISOString(), updated_at: new Date().toISOString(), revoked_at: null }
      return ok(args.p_scopes)
    }
    if (fn === 'mcp_revoke') {
      const id = String(args.p_client_id)
      scopes[id] = { client_id: id, scopes: [], granted_at: new Date().toISOString(), updated_at: new Date().toISOString(), revoked_at: new Date().toISOString() }
      return ok(null)
    }
    return Promise.resolve({ data: null, error: { message: 'stand: unknown rpc ' + fn } })
  }
  sb.from = (table: string) => {
    const data = table === 'mcp_grant_scopes' ? Object.values(scopes) : table === 'mcp_call_log' ? [...log].sort((a, b) => b.id - a.id) : []
    const q = { select: () => q, order: () => q, limit: () => q, abortSignal: () => q, then: (r: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(r) }
    return q
  }
  const realFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.endsWith('/functions/v1/iskra-mcp/oauth-protected-resource')) {
      return Promise.resolve(new Response(JSON.stringify({ resource: SUPABASE_URL + '/functions/v1/iskra-mcp', authorization_servers: [SUPABASE_URL + '/auth/v1'] })))
    }
    if (url.includes('/auth/v1/user/oauth/grants') && init?.method === 'DELETE') {
      const id = new URL(url).searchParams.get('client_id')
      const i = grants.findIndex(g => g.client.id === id)
      if (i >= 0) grants.splice(i, 1)
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (url.includes('/auth/v1/oauth/authorizations/')) return Promise.resolve(new Response(JSON.stringify({ redirect_url: location.href.replace('view=consent', 'view=panel') })))
    if (url.startsWith(SUPABASE_URL)) return Promise.reject(new Error('stand: network blocked ' + url))
    return realFetch(input, init)
  }

  await import('./index.css')
  const { createRoot } = await import('react-dom/client')
  const { default: ClaudeAccessCard } = await import('./components/teacher/ClaudeAccessCard')
  const { default: ConfirmHost } = await import('./components/ConfirmHost')
  const { default: OAuthConsentPage } = await import('./pages/teacher/OAuthConsentPage')
  const view = params.get('view') ?? 'panel'
  if (view === 'consent') history.replaceState(null, '', location.pathname + location.search + '&authorization_id=stand')
  document.body.style.background = 'var(--color-bg)'
  createRoot(document.getElementById('root')!).render(view === 'consent' ? <><OAuthConsentPage /><ConfirmHost /></> : <>
    <div style={{ maxWidth: platform === 'pc' || platform === 'ipad' ? 900 : undefined, margin: '0 auto', padding: 'max(16px, env(safe-area-inset-top)) 16px 24px', color: 'var(--color-text)' }}>
      <div style={{ fontSize: 22, fontWeight: 750, margin: '8px 0 4px' }}>Интеграции</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Стенд на фикстурах · {platform} · {document.documentElement.dataset.theme}</div>
      <ClaudeAccessCard />
    </div>
    <ConfirmHost />
  </>)
}
void boot()
