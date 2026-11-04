/** Relative URL to install before hash routing starts; null leaves it intact. */
export function initialRouteTarget(location: { pathname: string; search: string; hash: string }, development = false): string | null {
  const { pathname, search, hash } = location
  const route = pathname.replace(/\/+$/, '')
  // OAuth authorization is a system pathname, not a cabinet hash route.
  // Keep its query (authorization_id/code) and only canonicalize a trailing slash.
  if (route === '/oauth/consent') return pathname === route ? null : `${route}${search}${hash}`
  if (development && route === '/journal-stand') return hash ? null : `${pathname}${search}#/teacher/gradebook`
  // DEV-стенд монтажа записи живёт вне хеш-маршрутов, как стенды виджетов.
  if (development && route === '/lesson-montage-stand') return null
  if (!route || ['/index.html', '/student-track-stand', '/student-widget-stand'].includes(route)) return null
  const rest = hash.replace(/^#\/?/, '')
  return `/${search}#${route}${rest ? '/' + rest : ''}`
}
