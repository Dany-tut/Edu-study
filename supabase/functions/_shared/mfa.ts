// Двухфакторная защита для Edge Functions.
//
// Функции узнают человека по токену, а работают сервисным ключом — правила
// базы (mfa_enforce) их не касаются. Поэтому та же проверка здесь: у аккаунта
// есть подтверждённый фактор, а токен ещё без кода (aal1) — отказ.

type FactorLike = { status?: string }
type UserLike = { factors?: FactorLike[] | null } | null | undefined

function tokenAal(authHeader: string) {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal as string | undefined }
  catch { return undefined }
}

/** true — вход ещё не подтверждён кодом, действие делать нельзя. */
export function mfaPending(user: UserLike, authHeader: string) {
  const enrolled = (user?.factors ?? []).some(f => f.status === 'verified')
  return enrolled && tokenAal(authHeader) !== 'aal2'
}

export const MFA_REQUIRED = { error: 'Подтвердите вход кодом из приложения', code: 'mfa_required' }
