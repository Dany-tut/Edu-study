import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, ArrowRight } from 'lucide-react'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'
import { useTeacher } from '../store/teacherStore'
import { useDashboard } from '../store/dashboardStore'

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

// Bounce-in: widget "gets hit" by the notification
const toastVariants = {
  hidden: { opacity: 0, x: 60, scale: 0.88 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: 'spring', stiffness: 420, damping: 26, mass: 0.9 },
  },
  bump: {
    scale: [1, 1.04, 0.98, 1.02, 0.99, 1],
    transition: { duration: 0.45, ease: 'easeOut' },
  },
  exit: {
    opacity: 0, x: 60, scale: 0.88,
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  },
}

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded:  { height: 'auto', opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
}

function Toast({ notif, onDismiss }: { notif: Notification; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [bump, setBump]         = useState(false)
  const markRead    = useNotificationsStore(s => s.markRead)
  const setTeacherPage = useTeacher(s => s.setActivePage)
  const setStudentPage = useDashboard(s => s.setActivePage)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-dismiss after 30s
  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(), 30_000)
    return () => clearTimeout(timerRef.current)
  }, [onDismiss])

  // Bump animation shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setBump(true), 80)
    return () => clearTimeout(t)
  }, [])

  function handleAction() {
    if (!notif.action) return
    markRead(notif.id)
    onDismiss()
    const page = notif.action.page
    if (!page) return
    // Try teacher pages first, then student
    const teacherPages = ['home','groups','homework','gradebook','constructor','homework-create','lesson-editor']
    if (teacherPages.includes(page)) setTeacherPage(page as Parameters<typeof setTeacherPage>[0])
    else setStudentPage(page as Parameters<typeof setStudentPage>[0])
  }

  function handleClick() {
    setExpanded(e => !e)
    markRead(notif.id)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onDismiss(), 8_000)
  }

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate={bump ? 'bump' : 'visible'}
      exit="exit"
      onClick={handleClick}
      style={{
        width: 300,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        // Red radial gradient — adapts to dark/light via CSS vars
        background: 'radial-gradient(ellipse at top left, rgba(255,90,90,0.18) 0%, rgba(var(--glass-rgb),0.96) 60%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,90,90,0.22)',
        boxShadow: '0 8px 32px rgba(255,90,90,0.12), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
          {ICON[notif.type] ?? '🔔'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notif.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notif.body}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-3)', padding: 2, flexShrink: 0, display: 'flex' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Expanded action */}
      <AnimatePresence>
        {expanded && notif.action && (
          <motion.div
            variants={expandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 12px',
              borderTop: '1px solid rgba(255,90,90,0.12)',
              paddingTop: 10,
            }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 10 }}>
                {notif.body}
              </p>
              <button
                onClick={e => { e.stopPropagation(); handleAction() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,90,90,0.18)',
                  color: '#FF5A5A', fontSize: 13, fontWeight: 700,
                }}
              >
                {notif.action.label}
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar — 30s drain */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 30, ease: 'linear' }}
        style={{
          height: 2, background: 'rgba(255,90,90,0.5)',
          transformOrigin: 'left', borderRadius: 0,
        }}
      />
    </motion.div>
  )
}

// Container — renders all live notifications stacked
export default function NotificationToastContainer() {
  const notifications = useNotificationsStore(s => s.notifications)
  const dismissLive   = useNotificationsStore(s => s.dismissLive)
  const markRead      = useNotificationsStore(s => s.markRead)

  const live = notifications.filter(n => n.live)

  function dismiss(id: string) {
    dismissLive(id)
    markRead(id)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 9000, pointerEvents: 'none',
    }}>
      <AnimatePresence mode="sync">
        {live.map(n => (
          <motion.div key={n.id} style={{ pointerEvents: 'auto' }}>
            <Toast notif={n} onDismiss={() => dismiss(n.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
