// Keep the operation ID until the caller has read and accepted the result.
// sessionStorage scopes uncertain acknowledgements to the actor and this tab.
const operations = new Map<string, string>()
const inflight = new Map<string, Promise<unknown>>()

export function runCourseCopy<T>(actor: string, source: string, target: string, action: (requestId: string) => Promise<T>): Promise<T> {
  const key = 'iskra.copy.' + JSON.stringify([actor, source, target])
  const running = inflight.get(key)
  if (running) return running as Promise<T>
  let id = operations.get(key)
  try { id ??= sessionStorage.getItem(key) ?? undefined } catch { /* Memory covers this mount. */ }
  const requestId = id ?? crypto.randomUUID()
  operations.set(key, requestId)
  try { sessionStorage.setItem(key, requestId) } catch { /* Storage can be unavailable. */ }
  const pending = Promise.resolve().then(() => action(requestId)).then(result => {
    operations.delete(key)
    try { sessionStorage.removeItem(key) } catch { /* Storage can be unavailable. */ }
    return result
  }).finally(() => inflight.delete(key))
  inflight.set(key, pending)
  return pending
}
