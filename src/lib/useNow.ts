import { useEffect, useState } from 'react'

// Returns a Date that re-renders subscribers every `intervalMs` ms.
// Default = 30s, good enough for minute-grained UI without burning re-renders.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const sync = () => {
      clearTimeout(timer)
      setNow(new Date())
      // Calendar boundaries land on whole minutes, not 30 s after mounting.
      timer = setTimeout(sync, intervalMs - Date.now() % intervalMs + 10)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') sync() }
    sync()
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}
