// A lost HTTP response must retry the same operation, even after reopening the editor.
export function handoutAttempt(
  ownerId: string, source: string, groupId: string, title: string, start: string,
  pending: Map<string, string>,
) {
  const key = 'iskra:handout:' + JSON.stringify([ownerId, source, groupId, title, start])
  let requestId = pending.get(key)
  try { requestId ??= sessionStorage.getItem(key) || undefined } catch { /* Tab memory remains available. */ }
  requestId ??= crypto.randomUUID()
  pending.set(key, requestId)
  try { sessionStorage.setItem(key, requestId) } catch { /* Retry in this tab. */ }
  return {
    requestId,
    confirm(response: unknown) {
      if (!response || typeof response !== 'object' || !('request_id' in response)
        || response.request_id !== requestId || !('short_id' in response)
        || typeof response.short_id !== 'string' || !response.short_id || response.short_id === source
        || !('id' in response) || typeof response.id !== 'string' || !response.id) return false
      pending.delete(key)
      try { sessionStorage.removeItem(key) } catch { /* Already confirmed. */ }
      return true
    },
  }
}
