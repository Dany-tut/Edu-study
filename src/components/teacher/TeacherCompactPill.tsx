import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import {
  ChevronLeft, ChevronRight, BookOpen, ClipboardList, BarChart2, PenLine,
  X, ArrowRight, UserPlus, CheckCircle2, FileText, Brain, Banknote, NotebookPen,
  Bell, Clock, RotateCcw, Trophy,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useHomework } from '../../lib/useHomework'
import { useScheduleToday } from '../../lib/useScheduleToday'
import { useJournalPending } from '../../lib/useGroups'
import { tactile } from '../../lib/feedback'
import { mskToVietnam, getContrastColor } from '../../lib/utils'
import { useNotificationsStore, type Notification } from '../../store/notificationsStore'

const TOPBAR_H = 60
const COLLAPSED_H = TOPBAR_H
const PILL_WIDTH = 320


const META: Record<number, { kicker: string; accent: string }> = {
  0: { kicker: 'Сегодня',    accent: 'var(--color-accent)' },
  1: { kicker: 'Расписание', accent: '#2D6BE0' },
  2: { kicker: 'Журнал',     accent: '#C47800' },
  3: { kicker: 'Заработок',  accent: '#1E9E63' },
  4: { kicker: 'Действия',   accent: '#E07B00' },
}

const MORPH = { type: 'spring' as const, stiffness: 360, damping: 32, mass: 0.7 }

const swipeVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '40%' : '-40%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-40%' : '40%', opacity: 0 }),
}

// ── Shared pill content layout ─────────────────────────────────────────────
function PillContent({
  avatar, kicker, title, detail, action, expanded,
}: {
  avatar: React.ReactNode
  kicker: string
  title: string
  detail: React.ReactNode
  action?: React.ReactNode
  expanded: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '9px 24px 14px 9px', width: '100%', boxSizing: 'border-box',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
      }}>
        {avatar}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3,
          textTransform: 'uppercase', color: 'var(--color-text-3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {kicker}
        </span>
        <span style={{
          fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {title}
        </span>
        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: 4, fontSize: 12.5, fontWeight: 450, color: 'var(--color-text-2)',
            lineHeight: 1.4, overflow: 'hidden', willChange: 'opacity',
          }}
        >
          {detail}
        </motion.div>
      </div>

      {action && (
        <div style={{ flexShrink: 0, alignSelf: 'flex-start', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  )
}

// ── Widget 0: Pending homework ─────────────────────────────────────────────
function PendingHwPreview({ expanded }: { expanded: boolean }) {
  const setActivePage = useTeacher(s => s.setActivePage)
  const reviews = useTeacher(s => s.reviews)
  const { homework: allHomework } = useHomework()

  const homework = allHomework.map(hw => {
    const r = reviews[hw.id]
    return r ? { ...hw, reviewedCount: Math.max(hw.reviewedCount, Object.keys(r).length) } : hw
  })
  const toCheck = homework.reduce((a, hw) => a + Math.max(0, hw.submittedCount - hw.reviewedCount), 0)
  const onReview = homework.filter(hw => hw.submittedCount - hw.reviewedCount > 0).length

  return (
    <PillContent
      avatar={
        <div style={{
          width: '100%', height: '100%',
          background: toCheck > 0
            ? 'var(--grad-purple)'
            : 'linear-gradient(135deg, #A8ECC0, #2A7D4F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 800,
        }}>
          {toCheck > 0 ? toCheck : '✓'}
        </div>
      }
      kicker="Сегодня · домашки"
      title={toCheck > 0 ? `${toCheck} работ ждут проверки` : 'Всё проверено — красавец!'}
      expanded={expanded}
      action={toCheck > 0 ? (
        <button
          onClick={e => { e.stopPropagation(); tactile(); setActivePage('homework') }}
          style={{
            padding: 6, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: 'none', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PenLine size={18} strokeWidth={2} />
        </button>
      ) : undefined}
      detail={
        toCheck > 0 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <StatBadge label="Заданий" value={`${onReview}`} color="var(--color-peach-text)" bg="var(--color-peach-soft)" />
            <StatBadge label="Работ" value={`${toCheck}`} color="var(--color-purple-text)" bg="var(--color-purple-soft)" />
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
            Сданные работы появятся здесь автоматически.
          </span>
        )
      }
    />
  )
}

// Small two-line stat badge used inside the pending-homework widget detail.
function StatBadge({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 12, padding: '7px 10px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color, letterSpacing: 0.2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)', marginTop: 1 }}>{value}</div>
    </div>
  )
}

// ── Widget 1: Today's schedule ─────────────────────────────────────────────
function SchedulePreview({ expanded }: { expanded: boolean }) {
  const { schedule: todaySchedule } = useScheduleToday()
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const upcoming = todaySchedule.filter(s => {
    const [h, m] = s.time.split(':').map(Number)
    return h * 60 + m >= nowMin
  })
  const next = upcoming[0] ?? todaySchedule[0]

  return (
    <PillContent
      avatar={
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #7BB2F9, #2D6BE0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <BookOpen size={18} />
        </div>
      }
      kicker="Расписание · сегодня"
      title={next ? `${next.time} МСК (${mskToVietnam(next.time)} ВН) · ${next.groupName}` : 'Занятий больше нет'}
      expanded={expanded}
      detail={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {todaySchedule.slice(0, 3).map((s, i) => {
            const [h, m] = s.time.split(':').map(Number)
            const past = h * 60 + m < nowMin
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: past ? 0.45 : 1,
              }}>
                <span style={{
                  display: 'flex', flexDirection: 'column', lineHeight: 1.1,
                  width: 52, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-blue-pill-text)' }}>{s.time}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-3)' }}>{mskToVietnam(s.time)} ВН</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>{s.groupName}</span>
                {s.topic && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10.5, color: 'var(--color-text-3)',
                    flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{s.topic}</span>
                )}
              </div>
            )
          })}
          {todaySchedule.length > 3 && (
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              + ещё {todaySchedule.length - 3} занятий
            </span>
          )}
        </div>
      }
    />
  )
}

// ── Widget 2: Lessons awaiting grades + attendance ─────────────────────────
function PendingGradesPreview({ expanded }: { expanded: boolean }) {
  const pendingJournals = useJournalPending(null)
  const setActivePage = useTeacher(s => s.setActivePage)
  const next = pendingJournals[0]

  const openGradebook = () => setActivePage('gradebook')

  return (
    <PillContent
      avatar={
        <div style={{
          width: '100%', height: '100%',
          background: pendingJournals.length > 0
            ? 'linear-gradient(135deg, #FFC979, #C47800)'
            : 'linear-gradient(135deg, #A8ECC0, #2A7D4F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <ClipboardList size={18} />
        </div>
      }
      kicker={pendingJournals.length > 0 ? `Журнал · ${pendingJournals.length} не заполнено` : 'Журнал · за урок'}
      title={next ? `${next.title} · ${next.scopeName}` : 'Все уроки заполнены'}
      expanded={expanded}
      detail={
        pendingJournals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
              Нужно заполнить журнал:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingJournals.slice(0, 5).map(p => (
                <button
                  key={p.scheduleId}
                  onClick={e => { e.stopPropagation(); tactile(); openGradebook() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    padding: '7px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'rgba(196,120,0,0.12)',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, width: 52, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C47800' }}>{p.date.slice(5).replace('-', '.')}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-3)' }}>{p.timeStart.slice(0,5)}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.scopeName}
                    </span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.scopeName}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
            Все журналы заполнены — отличная работа!
          </span>
        )
      }
    />
  )
}

// ── Widget 3: Weekly earnings ──────────────────────────────────────────────
function EarningsPreview({ expanded }: { expanded: boolean }) {
  return (
    <PillContent
      avatar={
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #6EE7A0, #1E9E63)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <BarChart2 size={18} />
        </div>
      }
      kicker="Заработок · неделя"
      title="Нет данных"
      expanded={expanded}
      detail={
        <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
          Данные о заработке появятся здесь позже.
        </span>
      }
    />
  )
}

// ── Live-notification card (replaces the old standalone toast) ─────────────
// When a realtime notification arrives while the teacher is on the platform it
// briefly takes over the pill, then auto-expires back to the rotating widgets.
const NOTIF_ICON: Record<string, React.ReactNode> = {
  homework_assigned:    <ClipboardList size={18} />,
  homework_graded:      <CheckCircle2  size={18} />,
  homework_submitted:   <FileText      size={18} />,
  lesson_unlocked:      <BookOpen      size={18} />,
  quiz_available:       <Brain         size={18} />,
  student_joined:       <UserPlus      size={18} />,
  deadline_approaching: <Clock         size={18} />,
  achievement:          <Trophy        size={18} />,
  hw_returned:          <RotateCcw     size={18} />,
  hw_graded:            <CheckCircle2  size={18} />,
  hw_submitted:         <FileText      size={18} />,
  test_assigned:        <Brain         size={18} />,
  test_completed:       <CheckCircle2  size={18} />,
  payment_due:          <Banknote      size={18} />,
  fill_journal:         <NotebookPen   size={18} />,
}
const NOTIF_COLOR: Record<string, string> = {
  student_joined: '#786AD7', achievement: '#786AD7', lesson_unlocked: '#786AD7',
  quiz_available: '#786AD7', test_assigned: '#786AD7',
  homework_assigned: '#F59E0B', deadline_approaching: '#F59E0B', payment_due: '#F59E0B',
  hw_returned: '#F59E0B', fill_journal: '#F59E0B',
  homework_graded: '#3FCC8A', homework_submitted: '#3FCC8A', hw_graded: '#3FCC8A',
  hw_submitted: '#3FCC8A', test_completed: '#3FCC8A',
}
const notifIcon = (t: string) => NOTIF_ICON[t] ?? <Bell size={18} />
const notifColor = (t: string) => NOTIF_COLOR[t] ?? 'var(--color-accent)'

function dedupBody(body: string): string {
  const parts = body.split(' · ')
  if (parts.length === 2 && parts[0].trim() === parts[1].trim()) return parts[0].trim()
  return body
}

function NotifPreview({ latest, extra, onAction, onClose }: {
  latest: Notification
  extra: number
  onAction: () => void
  onClose: () => void
}) {
  const accent = notifColor(latest.type)
  return (
    <PillContent
      expanded
      avatar={
        <div style={{
          width: '100%', height: '100%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          {notifIcon(latest.type)}
        </div>
      }
      kicker="Уведомление"
      title={latest.title}
      detail={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={{
            color: 'var(--color-text-2)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {dedupBody(latest.body)}
          </span>
          {latest.action && (
            <button onClick={onAction} style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: `${typeof accent === 'string' && accent.startsWith('#') ? accent : 'var(--color-accent)'}22`,
              color: accent, fontSize: 11.5, fontWeight: 700,
            }}>
              {latest.action.label} <ArrowRight size={11} />
            </button>
          )}
        </div>
      }
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {extra > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: getContrastColor(accent.startsWith('#') ? accent : '#786AD7'),
              background: accent, borderRadius: 99, padding: '2px 6px',
            }}>
              +{extra}
            </span>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-3)', display: 'flex', padding: 2,
          }}>
            <X size={14} />
          </button>
        </div>
      }
    />
  )
}

function PreviewById({ widgetId, expanded }: { widgetId: number; expanded: boolean }) {
  switch (widgetId) {
    case 0: return <PendingHwPreview expanded={expanded} />
    case 1: return <SchedulePreview expanded={expanded} />
    case 2: return <PendingGradesPreview expanded={expanded} />
    case 3: return <EarningsPreview expanded={expanded} />
    case 4: return <QuickActionsWidget expanded={expanded} />
    default: return <PendingHwPreview expanded={expanded} />
  }
}

// ── Widget 4: Quick-action pills ──────────────────────────────────────────
function QuickActionsWidget({ expanded: _expanded }: { expanded: boolean }) {
  const setActivePage = useTeacher(s => s.setActivePage)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const actions = [
    { icon: BookOpen,      label: 'Создать урок', bg: 'var(--color-green-soft)', iconColor: '#2A9D5C', page: 'lesson-editor'   as const },
    { icon: ClipboardList, label: 'Создать ДЗ',   bg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', page: 'homework-create' as const },
    { icon: BarChart2,     label: 'Статистика',   bg: 'var(--color-peach-soft)', iconColor: '#C47800', page: 'gradebook'       as const },
  ]
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '8px', width: '100%', boxSizing: 'border-box', height: COLLAPSED_H,
      }}
    >
      {actions.map(({ icon: Icon, label, bg, iconColor, page }, i) => {
        const hovered = hoveredIdx === i
        return (
          <button
            key={label}
            onClick={() => { tactile(); setActivePage(page) }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              flex: 1, alignSelf: 'stretch',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: hovered ? 4 : 0,
              borderRadius: 22, border: 'none',
              cursor: 'pointer',
              background: bg,
              color: iconColor,
              overflow: 'hidden',
              transition: 'gap 0.18s ease',
            }}
          >
            <Icon
              size={hovered ? 14 : 18}
              strokeWidth={2.2}
              style={{ transition: 'all 0.18s ease', flexShrink: 0 }}
            />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.1,
              whiteSpace: 'nowrap', lineHeight: 1,
              maxHeight: hovered ? 14 : 0,
              opacity: hovered ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.18s ease, opacity 0.18s ease',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main pill ──────────────────────────────────────────────────────────────
export default function TeacherCompactPill() {
  const reviews = useTeacher(s => s.reviews)
  const { homework: allHomework } = useHomework()
  const hasHwToCheck = allHomework.some(hw => {
    const reviewed = Object.keys(reviews[hw.id] ?? {}).length
    return hw.submittedCount - Math.max(hw.reviewedCount, reviewed) > 0
  })

  const WIDGETS = hasHwToCheck ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]
  const total = WIDGETS.length

  const [[idx, dir], setIdx] = useState<[number, number]>([0, 0])
  const [expanded, setExpanded] = useState(false)
  const [dotsVisible, setDotsVisible] = useState(false)
  const [hovering, setHovering] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false)
  const measureRef = useRef<HTMLDivElement>(null)
  const [expandedH, setExpandedH] = useState(COLLAPSED_H * 3)

  // ── Live notifications: take over the pill, then auto-expire ──────────────
  const notifications = useNotificationsStore(s => s.notifications)
  const dismissLive   = useNotificationsStore(s => s.dismissLive)
  const markRead      = useNotificationsStore(s => s.markRead)
  const live   = notifications.filter(n => n.live)
  const latest = live[0]
  const [showNotif, setShowNotif] = useState(false)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLiveLen = useRef(0)
  const notifActive = showNotif && !!latest

  // Show whenever a NEW live notification arrives; hide once none remain.
  useEffect(() => {
    if (live.length > prevLiveLen.current) setShowNotif(true)
    if (live.length === 0) setShowNotif(false)
    prevLiveLen.current = live.length
  }, [live.length])

  const clearLive = () => { live.forEach(n => { dismissLive(n.id); markRead(n.id) }) }

  // 30 s auto-expire — same lifetime the old toast used.
  useEffect(() => {
    if (!notifActive) return
    notifTimer.current = setTimeout(() => { clearLive(); setShowNotif(false) }, 30_000)
    return () => { if (notifTimer.current) clearTimeout(notifTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifActive, live.length])

  const dismissNotif = () => { clearLive(); setShowNotif(false) }
  const handleNotifAction = () => {
    const page = latest?.action?.page
    dismissNotif()
    if (page) window.location.hash = page.startsWith('#') ? page : `#/${page}`
  }

  const widgetId = WIDGETS[idx]

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => { const h = el.scrollHeight; if (h > 0) setExpandedH(h) }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widgetId, expanded, notifActive])

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
  }, [])

  useEffect(() => {
    if (!expanded) {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
      return
    }
    collapseTimer.current = setTimeout(() => setExpanded(false), 5000)
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [expanded])

  const bumpCollapse = () => {
    if (!expanded) return
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), 5000)
  }

  const revealDots = () => { if (hideTimer.current) clearTimeout(hideTimer.current); setDotsVisible(true) }
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setDotsVisible(false), 1100)
  }

  const goTo = (next: number, direction: number) => {
    if (expanded) return
    const wrapped = ((next % total) + total) % total
    if (wrapped === idx) return
    setIdx([wrapped, direction])
    revealDots(); scheduleHide()
  }

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (expanded) return
    const swipe = info.offset.x + info.velocity.x * 120
    const moved = Math.abs(info.offset.x) > 4
    if (moved) {
      draggedRef.current = true
      setTimeout(() => { draggedRef.current = false }, 0)
    }
    if (swipe < -60) goTo(idx + 1, 1)
    else if (swipe > 60) goTo(idx - 1, -1)
    scheduleHide()
  }

  const handleClick = () => {
    if (draggedRef.current) return
    setExpanded(e => { tactile(); return !e })
  }

  const accent = META[widgetId]?.accent ?? 'var(--color-accent)'

  return (
    <motion.div
      ref={rootRef}
      onClick={notifActive ? handleNotifAction : handleClick}
      onPointerDownCapture={bumpCollapse}
      onMouseMove={bumpCollapse}
      onMouseEnter={() => { setHovering(true); revealDots() }}
      onMouseLeave={() => { setHovering(false); scheduleHide() }}
      animate={{ height: (expanded || notifActive) ? expandedH : COLLAPSED_H }}
      transition={MORPH}
      style={{
        position: 'relative',
        width: PILL_WIDTH,
        borderRadius: 30,
        cursor: 'pointer',
        // Collapsed → light glass (lives in the glass top-bar). Expanded / live
        // notification → nearly opaque, otherwise the page card it grows over
        // bleeds through the blur as a horizontal seam.
        background: (expanded || notifActive) ? 'rgba(var(--glass-rgb), 0.96)' : 'rgba(var(--glass-rgb), 0.5)',
        transition: 'background 0.2s ease',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-pill)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Measurement layer */}
      <div ref={measureRef} style={{ width: '100%', position: 'relative' }}>
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          {notifActive
            ? <NotifPreview latest={latest} extra={live.length - 1} onAction={() => {}} onClose={() => {}} />
            : <PreviewById widgetId={widgetId} expanded={expanded} />}
        </div>

        <motion.div
          drag={(expanded || notifActive) ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={revealDots}
          onDragEnd={onDragEnd}
          style={{ position: 'absolute', inset: 0, width: '100%', overflow: 'hidden' }}
        >
          <AnimatePresence custom={dir} initial={false}>
            <motion.div
              key={notifActive ? 'notif' : widgetId}
              custom={dir}
              variants={swipeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: 'spring', stiffness: 520, damping: 38 }, opacity: { duration: 0.14, ease: 'easeOut' } }}
              style={{ position: 'absolute', inset: 0, width: '100%' }}
            >
              {notifActive
                ? <NotifPreview latest={latest} extra={live.length - 1} onAction={handleNotifAction} onClose={dismissNotif} />
                : <PreviewById widgetId={widgetId} expanded={expanded} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Hover chevrons */}
      {!expanded && !notifActive && total > 1 && (
        <>
          {[
            { side: 'left' as const, label: 'Предыдущий', dir: -1 },
            { side: 'right' as const, label: 'Следующий', dir: 1 },
          ].map(({ side, label, dir: d }) => (
            <button
              key={side}
              type="button"
              aria-label={label}
              onClick={e => { e.stopPropagation(); goTo(idx + d, d) }}
              style={{
                position: 'absolute',
                [side]: 4,
                top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: '50%',
                border: 'none',
                background: 'rgba(var(--glass-rgb), 0.85)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-2)', cursor: 'pointer',
                opacity: hovering ? 1 : 0,
                transition: 'opacity 0.18s ease',
                pointerEvents: hovering ? 'auto' : 'none',
              }}
            >
              {d < 0 ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          ))}
        </>
      )}

      {/* Dots */}
      {!expanded && !notifActive && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5"
          style={{ bottom: 4, opacity: dotsVisible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{
              width: i === idx ? 14 : 4, height: 4, borderRadius: 999,
              background: i === idx ? accent : 'var(--color-text-4)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          ))}
        </div>
      )}

      {/* Live-notification 30 s drain bar */}
      {notifActive && (
        <motion.div
          key={`drain-${live.length}`}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 30, ease: 'linear' }}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
            background: `${notifColor(latest.type)}80`, transformOrigin: 'left',
          }}
        />
      )}
    </motion.div>
  )
}
