// Двухфакторная защита для Edge Functions.
//
// Функции узнают человека по токену, а работают сервисным ключом — правила
// базы (mfa_enforce) их не касаются. Поэтому та же проверка здесь: у аккаунта
// есть подтверждённый фактор, а токен ещё без кода (aal1) — отказ.

type FactorLike = { status?: string }
type UserLike = { factors?: FactorLike[] | null } | null | undefined

function tokenClaims(authHeader: string): Record<string, unknown> | undefined {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) }
  catch { return undefined }
}
function tokenAal(authHeader: string) { return tokenClaims(authHeader)?.aal as string | undefined }

/**
 * Токен ИИ-помощника (OAuth-клиент Supabase, есть client_id). Ему можно только
 * в MCP-сервер Искры (iskra-mcp, docs/iskra-mcp.md, этап 2): функции, которые
 * после проверки пользователя действуют сервисным ключом, его не принимают.
 * Подпись здесь не проверяется — только отказ, поэтому подделка ничего не даёт.
 */
export function isAssistantToken(authHeader: string) {
  const id = tokenClaims(authHeader)?.client_id
  return typeof id === 'string' && id !== ''
}

export const ASSISTANT_TOKEN_REFUSED = { error: 'Доступ ИИ-помощника к Искре — только через MCP-сервер Искры', code: 'assistant_direct_access' }

/** true — действие делать нельзя: вход ещё не подтверждён кодом или это токен ИИ-помощника. */
export function mfaPending(user: UserLike, authHeader: string) {
  if (isAssistantToken(authHeader)) return true
  const enrolled = (user?.factors ?? []).some(f => f.status === 'verified')
  return enrolled && tokenAal(authHeader) !== 'aal2'
}

export const MFA_REQUIRED = { error: 'Подтвердите вход кодом из приложения', code: 'mfa_required' }
