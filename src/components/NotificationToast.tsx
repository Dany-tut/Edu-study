import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { ArrowRight, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'

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

// Bounce keyframes — like "something puffed into the widget"
const BUMP = {
  scale: [1, 1.045, 0.975, 1.022, 0.992, 1],
  transition: { duration: 0.5, ease: 'easeOut' },
}

function NotifRow({ n, onAction, onRead }: {
  n: Notification
  onRead: (id: string) => void
  onAction: (n: Notification) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <span style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,90,90,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>
        {ICON[n.type] ?? '🔔'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
          {n.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 1, lineHeight: 1.4 }}>
          {n.body}
        </div>
        {n.action && (
          <button onClick={() => { onRead(n.id); onAction(n) }} style={{
            marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'rgba(255,90,90,0.18)', color: '#FF5A5A',
            fontSize: 11.5, fontWeight: 700,
          }}>
            {n.action.label} <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function NotificationToastContainer() {
  const notifications = useNotificationsStore(s => s.notifications)
  const dismissLive   = useNotificationsStore(s => s.dismissLive)
  const markRead      = useNotificationsStore(s => s.markRead)
  const markAllRead   = useNotificationsStore(s => s.markAllRead)

  const live = notifications.filter(n => n.live)
  const latest = live[0]

  const [expanded, setExpanded] = useState(false)
  const controls = useAnimation()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevCountRef = useRef(0)

  // Enter animation on mount + bounce on each new notification
  useEffect(() => {
    controls.start({ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 26 } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (live.length > prevCountRef.current && live.length > 0 && prevCountRef.current > 0) {
      controls.start({ scale: [1, 1.045, 0.975, 1.022, 0.992, 1], transition: { duration: 0.5, ease: 'easeOut' } })
    }
    prevCountRef.current = live.length
  }, [live.length, controls])

  // Reset auto-dismiss timer on each new notification
  useEffect(() => {
    if (live.length === 0) { setExpanded(false); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      live.forEach(n => { dismissLive(n.id); markRead(n.id) })
      setExpanded(false)
    }, 30_000)
    return () => clearTimeout(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.length])

  function dismissAll() {
    live.forEach(n => { dismissLive(n.id); markRead(n.id) })
    setExpanded(false)
  }

  function handleAction(n: Notification) {
    dismissAll()
    if (!n.action?.page) return
    window.location.hash = `#/${n.action.page}`
  }

  const widget = (
    <AnimatePresence>
      {live.length > 0 && latest && (
        <motion.div
          key="notif-widget"
          initial={{ opacity: 0, y: -18, scale: 0.92 }}
          animate={controls}
          exit={{ opacity: 0, y: -14, scale: 0.92, transition: { duration: 0.22 } }}
          style={{
            position: 'fixed',
            top: 76,        // just below the topbar pill
            right: 24,
            width: 300,
            zIndex: 8500,
            borderRadius: 20,
            overflow: 'hidden',
            cursor: 'pointer',
            background: 'radial-gradient(ellipse at top left, rgba(255,90,90,0.22) 0%, rgba(var(--glass-rgb),0.96) 55%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,90,90,0.25)',
            boxShadow: '0 8px 32px rgba(255,90,90,0.14), 0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          {/* Top row: icon + title + count badge + controls */}
          <div
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 14px' }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
              {ICON[latest.type] ?? '🔔'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {latest.title}
              </div>
              {!expanded && (
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {latest.body}
                </div>
              )}
            </div>
            {live.length > 1 && !expanded && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff', background: '#FF5A5A',
                borderRadius: 99, padding: '2px 6px', flexShrink: 0,
              }}>
                +{live.length - 1}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--color-text-3)', display: 'flex' }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
              <button
                onClick={e => { e.stopPropagation(); dismissAll() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-3)', display: 'flex', padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Expanded: all stacked notifications */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,90,90,0.15)' }}>
                  <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {live.map((n, i) => (
                      <div key={n.id}>
                        {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />}
                        <NotifRow n={n} onRead={markRead} onAction={handleAction} />
                      </div>
                    ))}
                  </div>
                  {live.length > 1 && (
                    <button onClick={dismissAll} style={{
                      marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 10,
                      border: '1px solid rgba(255,90,90,0.2)', background: 'none', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--color-muted)',
                    }}>
                      Закрыть все
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 30s drain bar */}
          <motion.div
            key={live.length}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 30, ease: 'linear' }}
            style={{ height: 2, background: 'rgba(255,90,90,0.55)', transformOrigin: 'left' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(widget, document.body)
}
