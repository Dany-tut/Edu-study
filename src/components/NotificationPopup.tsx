import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'
import type { NotifType } from '../store/notificationsStore'
import { useDashboard } from '../store/dashboardStore'
import { findLessonById } from '../data/lessonContent'
import { Bell, ClipboardList, CheckCircle2, FileText, BookOpen, Brain, UserPlus, Clock, Trophy, RotateCcw, Banknote, NotebookPen } from 'lucide-react'

const ICON_MAP: Record<NotifType, React.ReactNode> = {
  homework_assigned:    <ClipboardList size={16} />,
  homework_graded:      <CheckCircle2  size={16} />,
  homework_submitted:   <FileText      size={16} />,
  lesson_unlocked:      <BookOpen      size={16} />,
  quiz_available:       <Brain         size={16} />,
  student_joined:       <UserPlus      size={16} />,
  deadline_approaching: <Clock         size={16} />,
  achievement:          <Trophy        size={16} />,
  hw_returned:          <RotateCcw     size={16} />,
  hw_graded:            <CheckCircle2  size={16} />,
  hw_submitted:         <FileText      size={16} />,
  test_assigned:        <Brain         size={16} />,
  payment_due:          <Banknote      size={16} />,
  fill_journal:         <NotebookPen   size={16} />,
}

function getIcon(type: string) {
  return (ICON_MAP as Record<string, React.ReactNode>)[type] ?? <Bell size={16} />
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)    return 'только что'
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

function NotifRow({ n, onActivate }: { n: Notification; onActivate: (n: Notification) => void }) {
  return (
    <motion.button
      whileHover={{ background: 'rgba(155,109,255,0.07)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onActivate(n)}
      style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: n.read ? 'transparent' : 'rgba(255,90,90,0.05)',
        borderRadius: 12, transition: 'background 0.15s',
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: n.read ? 'rgba(var(--glass-rgb),0.4)' : 'rgba(255,90,90,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: n.read ? 'var(--color-muted)' : '#FF5A5A',
      }}>
        {getIcon(n.type)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--color-text)', lineHeight: 1.25 }}>
          {n.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>
          {n.body}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 3 }}>
          {timeAgo(n.createdAt)}
        </div>
      </div>
      <AnimatePresence>
        {!n.read && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF5A5A', flexShrink: 0, marginTop: 4 }}
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
  const openLesson    = useDashboard(s => s.openLesson)
  const popupRef      = useRef<HTMLDivElement>(null)
  const listRef       = useRef<HTMLDivElement>(null)
  const unread        = notifications.filter(n => !n.read).length
  const [fadeTop, setFadeTop]       = useState(false)
  const [fadeBottom, setFadeBottom] = useState(false)

  const updateFades = () => {
    const el = listRef.current
    if (!el) return
    setFadeTop(el.scrollTop > 4)
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }
  useEffect(() => {
    if (open) setTimeout(updateFades, 50)
  }, [open, notifications.length])

  // Click a row → mark read, then deep-link to its lesson (if any) and close.
  const activate = (n: Notification) => {
    if (!n.read) markRead(n.id)
    const ref = n.link?.lessonRef
    if (ref) {
      const base = ref.endsWith('-hard') ? ref.slice(0, -5) : ref
      if (findLessonById(base)) {
        openLesson(base)
        onClose()
      }
    }
  }

  // Capture position at open time (avoids transform issues on parent)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useEffect(() => {
    if (!open) { setPos(null); return }
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const popupWidth = 320
    const idealLeft = r.left - 10
    const clampedLeft = Math.min(
      Math.max(8, idealLeft),
      window.innerWidth - popupWidth - 8
    )
    setPos({ top: r.bottom + 10, left: clampedLeft })
  }, [open, anchorRef])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!popupRef.current?.contains(e.target as Node) &&
          !anchorRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  const popup = (
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.88, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: -8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 320,
            zIndex: 9100,
            borderRadius: 20,
            overflow: 'hidden',
            background: 'rgba(var(--glass-rgb), 0.88)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 14px 10px',
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
              <button onClick={markAllRead} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--color-accent)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Прочитать все
              </button>
            )}
          </div>

          {/* List with top/bottom scroll fades */}
          <div style={{ position: 'relative' }}>
            {fadeTop && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 2, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.92) 0%, transparent 100%)',
              }} />
            )}
            <div
              ref={listRef}
              className="no-scrollbar"
              onScroll={updateFades}
              style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 6px' }}
            >
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                  Нет уведомлений
                </div>
              ) : (
                notifications.map(n => <NotifRow key={n.id} n={n} onActivate={activate} />)
              )}
            </div>
            {fadeBottom && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 2, pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.92) 0%, transparent 100%)',
              }} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(popup, document.body)
}
