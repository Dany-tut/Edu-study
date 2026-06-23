import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, ChevronDown, ChevronUp, ClipboardList, CheckCircle2, FileText, BookOpen, Brain, UserPlus, Clock, Trophy, Bell, RotateCcw, Banknote, NotebookPen } from 'lucide-react'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'
import { getContrastColor } from '../lib/utils'
import type { NotifType } from '../store/notificationsStore'

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

// Color accent per notification type: [accentHex, bgAlpha]
const TYPE_COLOR: Record<string, string> = {
  student_joined:       '#786AD7',
  achievement:          '#786AD7',
  lesson_unlocked:      '#786AD7',
  quiz_available:       '#786AD7',
  homework_assigned:    '#F59E0B',
  deadline_approaching: '#F59E0B',
  payment_due:          '#F59E0B',
  homework_graded:      '#3FCC8A',
  homework_submitted:   '#3FCC8A',
  hw_graded:            '#3FCC8A',
  hw_submitted:         '#3FCC8A',
  hw_returned:          '#F59E0B',
  test_assigned:        '#786AD7',
  fill_journal:         '#F59E0B',
}
function getColor(type: string): string {
  return TYPE_COLOR[type] ?? '#FF5A5A'
}

function dedupBody(body: string): string {
  const parts = body.split(' · ')
  if (parts.length === 2 && parts[0].trim() === parts[1].trim()) return parts[0].trim()
  return body
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FF5A5A',
      }}>
        {getIcon(n.type)}
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

  const live    = notifications.filter(n => n.live)
  const latest  = live[0]

  const [expanded, setExpanded]   = useState(false)
  const [bounceKey, setBounceKey] = useState(0)
  const prevLenRef = useRef(0)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Bounce inner wrapper key on each NEW notification
  useEffect(() => {
    if (live.length > prevLenRef.current && prevLenRef.current > 0) {
      setBounceKey(k => k + 1)
    }
    prevLenRef.current = live.length
  }, [live.length])

  // 30 s auto-dismiss — reset when new notification arrives
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
      {live.length > 0 && latest && (() => {
        const accent = getColor(latest.type)
        const hexToRgb = (h: string) => {
          const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
          return `${r},${g},${b}`
        }
        const rgb = hexToRgb(accent)
        return (
        // Outer: handles enter / exit only — no y movement to avoid flash
        <motion.div
          key="notif-widget"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          style={{
            position: 'fixed',
            top: 76,
            right: 24,
            width: 300,
            zIndex: 8500,
            pointerEvents: 'auto',
          }}
        >
          {/* Inner: bounces on key change when new notification arrives */}
          <motion.div
            key={bounceKey}
            initial={{ scale: bounceKey > 0 ? 1.04 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              cursor: 'pointer',
              background: `radial-gradient(ellipse at top left, rgba(${rgb},0.18) 0%, rgba(var(--glass-rgb),0.96) 55%)`,
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: `1px solid rgba(${rgb},0.22)`,
              boxShadow: `0 8px 32px rgba(${rgb},0.12), 0 2px 10px rgba(0,0,0,0.08)`,
            }}
          >
            {/* Top row */}
            <div
              onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `rgba(${rgb},0.14)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent,
              }}>
                {getIcon(latest.type)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {latest.title}
                </div>
                {!expanded && (
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dedupBody(latest.body)}
                  </div>
                )}
              </div>
              {live.length > 1 && !expanded && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: getContrastColor(accent), background: accent,
                  borderRadius: 99, padding: '2px 6px', flexShrink: 0,
                }}>
                  +{live.length - 1}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
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

            {/* Expanded list */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 14px 14px', borderTop: `1px solid rgba(${rgb},0.15)`, paddingTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {live.map((n, i) => (
                        <div key={n.id}>
                          {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />}
                          <NotifRow n={n} onRead={markRead} onAction={handleAction} />
                        </div>
                      ))}
                    </div>
                    {live.length > 1 && (
                      <button onClick={dismissAll} style={{
                        marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 10,
                        border: `1px solid rgba(${rgb},0.2)`, background: 'none', cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 600, color: 'var(--color-muted)',
                      }}>
                        Закрыть все
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 30 s drain bar */}
            <motion.div
              key={`drain-${live.length}`}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 30, ease: 'linear' }}
              style={{ height: 2, background: `rgba(${rgb},0.5)`, transformOrigin: 'left' }}
            />
          </motion.div>
        </motion.div>
        )
      })()}
    </AnimatePresence>
  )

  return createPortal(widget, document.body)
}
