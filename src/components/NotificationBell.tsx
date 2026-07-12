import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useNotificationsStore } from '../store/notificationsStore'
import { playDing } from '../lib/playDing'
import { useT } from '../lib/i18n'

// Ring keyframe: swing like a real bell then settle
const ringVariants = {
  idle:    { rotate: 0,   scale: 1,    color: 'var(--color-muted)' },
  ringing: {
    rotate: [0, -22, 22, -18, 18, -12, 12, -6, 6, 0],
    scale:  [1, 1.18, 1.18, 1.15, 1.15, 1.1, 1.1, 1.05, 1.05, 1.12],
    color:  ['var(--color-muted)', '#FF5A5A', '#FF5A5A', '#FF7A5A', '#FF7A5A', '#FF9060', '#FF9060', '#FF7A5A', '#FF7A5A', '#FF5A5A'],
    transition: { duration: 0.7, ease: 'easeInOut' },
  },
  // After ring: stays glowing (sticker state)
  sticker: {
    rotate: [0, -4, 4, -4, 4, 0],
    scale: 1.12,
    color: '#FF5A5A',
    transition: { rotate: { repeat: Infinity, duration: 2.4, ease: 'easeInOut', repeatDelay: 1.5 }, scale: { duration: 0 }, color: { duration: 0 } },
  },
}

type Props = {
  size?: number
  hoverBg?: string
  /** Called when bell is clicked so parent can open popup */
  onClick?: () => void
}

export default function NotificationBell({ size = 16, hoverBg = 'rgba(155,109,255,0.14)', onClick }: Props) {
  const t = useT()
  const notifications   = useNotificationsStore(s => s.notifications)
  const dismissLive     = useNotificationsStore(s => s.dismissLive)
  const unread          = notifications.filter(n => !n.read).length
  const prevLiveId      = useRef<string | null>(null)

  const [bellState, setBellState] = useState<'idle' | 'ringing' | 'sticker'>('idle')

  // Watch for new live notifications
  useEffect(() => {
    const live = notifications.find(n => n.live)
    if (!live || live.id === prevLiveId.current) return
    prevLiveId.current = live.id
    setBellState('ringing')
    playDing()
    // After ring animation completes, settle to sticker state
    const t = setTimeout(() => setBellState('sticker'), 750)
    return () => clearTimeout(t)
  }, [notifications])

  function handleClick() {
    setBellState('idle')
    onClick?.()
  }

  return (
    <motion.button
      whileHover={{ scale: 1.08, backgroundColor: hoverBg }}
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
      aria-label={t('Уведомления')}
      style={{
        position: 'relative',
        width: 36, height: 44, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', background: 'none', border: 'none',
        flexShrink: 0,
      }}
    >
      {/* Bell icon — animated */}
      <motion.span
        variants={ringVariants}
        animate={bellState}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: 'top center' }}
      >
        <Bell size={size} strokeWidth={bellState !== 'idle' ? 2.2 : 1.8} />
      </motion.span>

      {/* Glow halo when ringing/sticker */}
      <AnimatePresence>
        {bellState !== 'idle' && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.22, scale: 1.6 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle, #FF5A5A 0%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Unread dot */}
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key="dot"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 7, height: 7, borderRadius: '50%',
              background: '#FF5A5A',
              border: '1.5px solid var(--color-bg)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
