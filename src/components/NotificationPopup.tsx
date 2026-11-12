import FadeText from './FadeText'
import ScrollFade from './ScrollFade'
import { viewportDropdownPosition, watchDropdownViewport } from '../lib/dropdownPosition'
import { useRef, useEffect, useState } from 'react'
import EmptyState from './EmptyState'
import CountBadge from './CountBadge'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore, followNotifAction, type Notification } from '../store/notificationsStore'
import { getStudentSession } from '../lib/studentSession'
import type { NotifType } from '../store/notificationsStore'
import { useDashboard } from '../store/dashboardStore'
import { findLessonById } from '../data/lessonContent'
import { baseLessonRef } from '../lib/extraHomework'
import { t, useT } from '../lib/i18n'
import { useMyPayment } from '../lib/paymentClaims'
import { Bell, ClipboardList, CheckCircle2, FileText, BookOpen, Brain, UserPlus, Clock, Trophy, RotateCcw, Banknote, NotebookPen, CalendarClock, CalendarX, BellOff, AudioLines } from './icons/appIcons'

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
  test_completed:       <CheckCircle2  size={16} />,
  payment_due:          <Banknote      size={16} />,
  fill_journal:         <NotebookPen   size={16} />,
  module_update:        <AudioLines    size={16} />,
  lesson_moved:         <CalendarClock size={16} />,
  lesson_cancelled:     <CalendarX     size={16} />,
}

function getIcon(type: string) {
  return (ICON_MAP as Record<string, React.ReactNode>)[type] ?? <Bell size={16} />
}

export function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)    return t('только что')
  if (diff < 3600)  return `${Math.floor(diff / 60)} ${t('мин назад')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('ч назад')}`
  return `${Math.floor(diff / 86400)} ${t('д назад')}`
}

export function NotifRow({ n, onActivate }: { n: Notification; onActivate: (n: Notification) => void }) {
  return (
    <motion.button
      whileHover={{ background: 'rgba(var(--accent-rgb), 0.07)' }}
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
        <FadeText lines={2} style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--color-text)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{n.title}</FadeText>
        <FadeText lines={3} style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{n.body}</FadeText>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>
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

/**
 * Строка уведомления → прочитано и переход туда, о чём оно. Общая для
 * колокольчика (попап) и телефонной шторки учителя: у учительских строк своё
 * действие (адрес кабинета), у ученических — урок, тест или главная.
 */
export function useNotificationActivate(onClose: () => void) {
  const markRead      = useNotificationsStore(s => s.markRead)
  const openLesson    = useDashboard(s => s.openLesson)
  const setActivePage = useDashboard(s => s.setActivePage)
  const activate = (n: Notification) => {
    if (!n.read) markRead(n.id)
    if (followNotifAction(n.action)) { onClose(); return }
    const link = n.link
    if (n.type === 'test_assigned' && link?.assignmentId && link.subject) {
      const s = getStudentSession()
      window.location.hash = `#/diagnostic?subject=${encodeURIComponent(link.subject)}&assignment=${link.assignmentId}`
        + (s ? `&sid=${s.id}&sname=${encodeURIComponent(s.name || 'Аноним')}` : '')
      onClose()
      return
    }
    // Оплата: «Счёт за…», «Оплата получена/не подтверждена» — окно «Оплата».
    if (n.type === 'payment_due' && link?.payment) {
      useMyPayment.getState().setOpen(true)
      onClose()
      return
    }
    const ref = link?.lessonRef
    if (ref) {
      const base = baseLessonRef(ref)
      if (findLessonById(base)) {
        openLesson(base)
        onClose()
        return
      }
    }
    // Перенос и отмена занятия: расписание — на главной.
    if (n.type === 'lesson_moved' || n.type === 'lesson_cancelled') {
      setActivePage('home')
      onClose()
    }
  }
  return activate
}

type Props = {
  requests?: import('../lib/desktopFriends').Contact[]
  onRequests?: () => void
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export default function NotificationPopup({ requests = [], onRequests, open, anchorRef, onClose }: Props) {
  const t = useT()
  const notifications = useNotificationsStore(s => s.notifications)
  const markAllRead   = useNotificationsStore(s => s.markAllRead)
  const popupRef      = useRef<HTMLDivElement>(null)
  const unread = notifications.filter(n => !n.read).length

  const activate = useNotificationActivate(onClose)

  const [pos, setPos] = useState<ReturnType<typeof viewportDropdownPosition> | null>(null)
  useEffect(() => {
    if (!open) { setPos(null); return }
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setPos(viewportDropdownPosition(rect, 440, 320, 12))
    }
    update()
    const unwatchViewport = watchDropdownViewport(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); unwatchViewport() }
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
        <div ref={popupRef} style={{ position: 'fixed', ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }), left: pos.left, width: pos.width, zIndex: 9100 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15, ease: [0.32, 0.72, 0, 1] } }}
          transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }}
          style={{
            width: '100%', maxHeight: pos.maxHeight, display: 'flex', flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            transformOrigin: 'top center',
            background: 'rgba(var(--glass-rgb), 0.88)',
            backdropFilter: 'var(--blur-solid)',
            WebkitBackdropFilter: 'var(--blur-solid)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 14px 10px', flexShrink: 0, gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Bell size={16} style={{ color: 'var(--color-muted)' }} />
              <FadeText style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Уведомления')}</FadeText>
              <CountBadge count={unread + requests.length} tone="danger" />
            </div>
            {unread > 0 && (
              <button data-hover="layer" onClick={markAllRead} style={{
                flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-accent)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                {t('Прочитать все')}
              </button>
            )}
          </div>

          <ScrollFade maxHeight={Math.min(380, Math.max(0, pos.maxHeight - 70))} fadeMode="mask" scrollStyle={{ padding: 6 }}>
            {requests.map(request => <button data-hover="layer" key={request.id} onClick={onRequests} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', minHeight:48, padding:'10px 14px', background:'var(--color-bg-3)', color:'var(--color-text)', border:0, borderRadius:12, textAlign:'left', cursor:'pointer' }}>
              <UserPlus size={18} style={{ flexShrink:0 }}/><span><b>@{request.handle}</b> · {t('Заявка в друзья')}</span>
            </button>)}
            {notifications.length === 0 && requests.length === 0 ? (
              <EmptyState icon={BellOff} title={t('Нет уведомлений')} style={{ background: 'transparent', border: 'none', padding: '28px 12px' }} />
            ) : notifications.map(n => <NotifRow key={n.id} n={n} onActivate={activate} />)}
          </ScrollFade>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(popup, document.body)
}
