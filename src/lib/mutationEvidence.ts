// HTTP success alone is insufficient for a write scoped by RLS or a stale ID.
export type ObservedMutation = 'create_homework' | 'update_homework' | 'close_homework' | 'review_hard_homework'
export function mutationAcknowledged(operation: ObservedMutation, result: { data: unknown; error: unknown }, report: (event: string, meta: Record<string, unknown>) => void) {
  const saved = Array.isArray(result.data) ? result.data.length > 0 : result.data !== null && result.data !== undefined
  if (!result.error && saved) return true
  try { report('operation_failed', { operation, reason: result.error ? 'server_error' : 'no_rows_updated' }) } catch { /* best effort */ }
  return false
}
export const missingMutationRow = () => ({ message: 'Изменение не сохранено. Обновите данные и повторите.', code: 'NO_ROWS_UPDATED', details: '', hint: '' })
