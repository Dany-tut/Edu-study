import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'
import { Bell } from 'lucide-react'

const ICON: Record<string, string> = {
  homework_assigned:    '📚',
  homework_graded:      '✅',
  homework_submitted:   '📝',
  lesson_unlocked:      '🔓',
  quiz_available:       '🧠',
  student_joined:       '👤',
  deadline_approaching: '⏰',
  achievement:          '🏆',
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)    return 'только что'
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

function NotifRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  return (
    <motion.button
      whileHover={{ background: 'rgba(155,109,255,0.07)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onRead(n.id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: n.read ? 'transparent' : 'rgba(255,90,90,0.05)',
        borderRadius: 12, transition: 'background 0.15s',
      }}
    >
      {/* Icon circle */}
      <span style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: n.read ? 'rgba(var(--glass-rgb),0.4)' : 'rgba(255,90,90,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        {ICON[n.type] ?? '🔔'}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: n.read ? 500 : 700,
          color: 'var(--color-text)', lineHeight: 1.25,
        }}>
          {n.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>
          {n.body}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 3 }}>
          {timeAgo(n.createdAt)}
        </div>
      </div>

      {/* Unread dot */}
      <AnimatePresence>
        {!n.read && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#FF5A5A', flexShrink: 0, marginTop: 4,
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

type Props = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export default function NotificationPopup({ open, anchorRef, onClose }: Props) {
  const notifications = useNotificationsStore(s => s.notifications)
  const markRead      = useNotificationsStore(s => s.markRead)
  const markAllRead   = useNotificationsStore(s => s.markAllRead)
  const popupRef      = useRef<HTMLDivElement>(null)
  const unread        = notifications.filter(n => !n.read).length

  // Position relative to the bell button
  const getPos = () => {
    if (!anchorRef.current) return { top: 60, right: 24 }
    const r = anchorRef.current.getBoundingClientRect()
    return { top: r.bottom + 10, right: window.innerWidth - r.right }
  }
  const pos = open ? getPos() : { top: 0, right: 0 }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!popupRef.current?.contains(e.target as Node) &&
          !anchorRef.current?.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.88, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: -8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            width: 320,
            zIndex: 9100,
            borderRadius: 20,
            overflow: 'hidden',
            background: 'rgba(var(--glass-rgb), 0.92)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: 'var(--shadow-modal-sm)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 14px 10px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bell size={15} style={{ color: 'var(--color-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                Уведомления
              </span>
              {unread > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  background: '#FF5A5A', borderRadius: 99, padding: '1px 6px',
                }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--color-accent)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 6px' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 0', textAlign: 'center',
                color: 'var(--color-muted)', fontSize: 13,
              }}>
                Нет уведомлений
              </div>
            ) : (
              notifications.map(n => (
                <NotifRow key={n.id} n={n} onRead={markRead} />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
