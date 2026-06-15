import { useEffect, useState } from 'react'

// Single 1024px breakpoint shared across the app. Desktop = width >= 1024.
// Mirrors the original local hook in DashboardPage so behaviour is identical;
// new mobile-only code imports this instead of re-declaring it.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
