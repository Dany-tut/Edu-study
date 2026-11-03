/** Preserve crash schema while excluding content-bearing fields and URL credentials. */
export function redactCrashEvent<T extends object>(event: T): T {
  return JSON.parse(JSON.stringify(event, (key, value) => {
    if (['user','request','extra','breadcrumbs','attachments'].includes(key)) return undefined
    if (typeof value !== 'string') return value
    return value.replace(/([?&#](?:access_token|refresh_token|token|code|apikey|key|password)=)[^&#\s]+/gi, '$1[redacted]')
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
  })) as T
}
