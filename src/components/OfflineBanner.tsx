import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'

/**
 * Thin global banner shown when the browser goes offline, so failed Supabase
 * requests (which otherwise resolve to empty data silently) don't read as
 * "no data". Auto-hides on reconnect.
 */
export default function OfflineBanner() {
  const t = useT()
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#E0844A', color: '#fff',
      fontSize: 13, fontWeight: 600, textAlign: 'center',
      padding: '7px 12px', letterSpacing: 0.2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
    }}>
      {t('Нет соединения с интернетом — данные могут не загружаться')}
    </div>
  )
}
