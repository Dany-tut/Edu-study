// Права, лимиты и журнал для каждого вызова инструмента MCP.
//
// Supabase OAuth Server не умеет своих scopes, поэтому права хранятся в
// public.mcp_grant_scopes по паре (учитель, client_id из JWT). Всё решает база
// (функции mcp_client_state / mcp_gate / mcp_finish, миграция
// 20261126090000): client_id берётся из подписанного токена, а не из запроса.

import { argsDigest } from './untrusted.ts'

export const SCOPES = ['courses:read', 'courses:write', 'students:read', 'progress:read', 'events:read', 'attachments:read'] as const
export type Scope = typeof SCOPES[number]

export interface Rpc { rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }

export type ClientState =
  | { state: 'active'; legacy: boolean; scopes: Scope[] }
  | { state: 'revoked' }
  | { state: 'no_client' }
  | { state: 'error' }

export async function clientState(db: Rpc): Promise<ClientState> {
  const { data, error } = await db.rpc('mcp_client_state')
  if (error || !data || typeof data !== 'object') return { state: 'error' }
  const d = data as { state?: string; legacy?: boolean; scopes?: unknown }
  if (d.state === 'revoked') return { state: 'revoked' }
  if (d.state === 'no_client') return { state: 'no_client' }
  if (d.state !== 'active') return { state: 'error' }
  const scopes = Array.isArray(d.scopes) ? d.scopes.filter((s): s is Scope => (SCOPES as readonly string[]).includes(s as string)) : []
  return { state: 'active', legacy: d.legacy === true, scopes }
}

const SCOPE_RU: Record<Scope, string> = {
  'courses:read': 'Курсы и уроки', 'courses:write': 'Черновики курсов', 'students:read': 'Ученики',
  'progress:read': 'Прогресс и ответы', 'events:read': 'Лента событий', 'attachments:read': 'Фото к ответам',
}

export type McpContent = { content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[]; isError?: boolean }

const failText = (text: string): McpContent => ({ content: [{ type: 'text', text }], isError: true })

/** Сколько записей вернул инструмент — для журнала (без содержимого). */
export function countOf(result: McpContent): number {
  if (result.isError) return 0
  const first = result.content[0]
  if (!first) return 0
  if (first.type === 'image') return 1
  try {
    const v = JSON.parse(first.text)
    if (Array.isArray(v)) return v.length
    for (const k of ['events', 'students', 'levels', 'diagnostics']) if (Array.isArray(v?.[k])) return v[k].length
    return 1
  } catch { return 1 }
}

/**
 * Обёртка инструмента: пропуск (права → отзыв → лимит → строка журнала),
 * вызов, итог в журнал. Если журнал не открылся — инструмент НЕ выполняется.
 */
export async function guarded(db: Rpc, tool: string, scope: Scope, args: unknown, run: () => Promise<McpContent>, clock = () => Date.now()): Promise<McpContent> {
  const { data, error } = await db.rpc('mcp_gate', { p_tool: tool, p_scope: scope, p_args: argsDigest(args) })
  const gate = (data ?? {}) as { allowed?: boolean; reason?: string; log_id?: number; retry_after?: number }
  if (error || (gate.allowed && typeof gate.log_id !== 'number')) return failText('Искра не смогла записать вызов в журнал, поэтому не выполнила его. Попробуйте ещё раз.')
  if (!gate.allowed) {
    switch (gate.reason) {
      case 'revoked': return failText('Доступ этого помощника к Искре отозван. Подключите его заново в Искре.')
      case 'insufficient_scope': return failText(`Нет права «${SCOPE_RU[scope]}» (${scope}). Учитель может выдать его, переподключив помощника в Искре.`)
      case 'minute': case 'day': case 'photos':
        return failText(`Лимит запросов к Искре исчерпан. Повторите через ${gate.retry_after ?? 60} с.`)
      default: return failText('Для этой операции нужен аккаунт преподавателя Искры, подключённый через OAuth.')
    }
  }
  const started = clock()
  let result: McpContent
  try {
    result = await run()
  } catch (e) {
    await db.rpc('mcp_finish', { p_log_id: gate.log_id, p_status: 'error', p_count: 0, p_ms: clock() - started })
    throw e
  }
  await db.rpc('mcp_finish', { p_log_id: gate.log_id, p_status: result.isError ? 'error' : 'ok', p_count: countOf(result), p_ms: clock() - started })
  return result
}
