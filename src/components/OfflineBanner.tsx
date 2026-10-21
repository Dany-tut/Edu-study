import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'

// Маленький файл без кеша service worker'а: если он скачался, сеть есть.
const PING_URL = '/version.json'
const RECHECK_MS = 5000

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`${PING_URL}?ping=${Date.now()}`, { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Thin global banner shown when the browser goes offline, so failed Supabase
 * requests (which otherwise resolve to empty data silently) don't read as
 * "no data". Auto-hides on reconnect.
 *
 * navigator.onLine врёт: Edge/Chrome на macOS ставят false при смене или
 * сканировании Wi-Fi и не всегда присылают обратный `online`. Поэтому флаг
 * браузера — только повод проверить настоящим запросом; пока баннер виден,
 * проверка повторяется по таймеру и при возврате на вкладку.
 */
export default function OfflineBanner() {
  const t = useT()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    const check = async () => {
      if (navigator.onLine) { if (alive) setOffline(false); return }
      const ok = await reachable()
      if (alive) setOffline(!ok)
    }
    const on = () => setOffline(false)
    const onVisible = () => { if (document.visibilityState === 'visible') void check() }
    void check()
    window.addEventListener('online', on)
    window.addEventListener('offline', check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.removeEventListener('online', on)
      window.removeEventListener('offline', check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!offline) return
    const id = window.setInterval(async () => {
      if (navigator.onLine || await reachable()) setOffline(false)
    }, RECHECK_MS)
    return () => window.clearInterval(id)
  }, [offline])

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
