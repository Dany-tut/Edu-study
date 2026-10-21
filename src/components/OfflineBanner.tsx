import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
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
 * Floating glass pill shown when the browser goes offline, so failed Supabase
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

  // Плашка внизу по центру, а не полоса сверху: верх занят навигацией.
  // На телефоне снизу нижний бар — поднимаемся над ним.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  const bottom = isPhone ? 'calc(env(safe-area-inset-bottom, 0px) + 96px)' : 24

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{
            position: 'fixed', left: 0, right: 0, bottom, zIndex: 9999,
            margin: '0 auto', width: 'max-content', maxWidth: 'calc(100vw - 32px)',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 18px 8px 8px', borderRadius: 'var(--radius-pill)',
            background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            pointerEvents: 'none',
          }}
        >
          <span style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(224,132,74,0.16)', color: '#E0844A',
          }}>
            <WifiOff size={17} strokeWidth={2.4} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.25 }}>
              {t('Нет соединения')}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.25 }}>
              {t('Часть данных может не загрузиться')}
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
