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
import { useT } from '../../lib/i18n'

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
  enter: (dir: number) => ({ x: dir > 0 ? '30%' : '-30%', opacity: 0 }),
  center: { x: '0%', opacity: 1, position: 'relative' as const },
  exit: (dir: number) => ({ x: dir > 0 ? '-30%' : '30%', opacity: 0, position: 'absolute' as const, top: 0, left: 0, width: '100%' }),
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
          initial={false}
          animate={{ maxHeight: expanded ? 200 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{
            marginTop: 4, fontSize: 12.5, fontWeight: 450,
            color: 'var(--color-text-2)', lineHeight: 1.4, overflow: 'hidden',
            maxHeight: expanded ? 200 : 0,
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
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)
  const { homework } = useHomework()

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
      kicker={t('Сегодня · домашки')}
      title={toCheck > 0 ? `${toCheck} ${t('работ ждут проверки')}` : t('Всё проверено — красавец!')}
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
            <StatBadge label={t('Заданий')} value={`${onReview}`} color="var(--color-peach-text)" bg="var(--color-peach-soft)" />
            <StatBadge label={t('Работ')} value={`${toCheck}`} color="var(--color-purple-text)" bg="var(--color-purple-soft)" />
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
            {t('Сданные работы появятся здесь автоматически.')}
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
  const t = useT()
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
      kicker={t('Расписание · сегодня')}
      title={next ? `${next.time} ${t('МСК')} (${mskToVietnam(next.time)} ${t('ВН')}) · ${next.groupName}` : t('Занятий больше нет')}
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
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-3)' }}>{mskToVietnam(s.time)} {t('ВН')}</span>
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
              + {t('ещё')} {todaySchedule.length - 3} {t('занятий')}
            </span>
          )}
        </div>
      }
    />
  )
}

// ── Widget 2: Lessons awaiting grades + attendance ─────────────────────────
function PendingGradesPreview({ expanded }: { expanded: boolean }) {
  const t = useT()
  const pendingJournals = useJournalPending(null)
  const openGradebook = useTeacher(s => s.openGradebook)
  const next = pendingJournals[0]

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
      kicker={pendingJournals.length > 0 ? `${t('Журнал')} · ${pendingJournals.length} ${t('не заполнено')}` : t('Журнал · за урок')}
      title={next ? `${next.title} · ${next.scopeName}` : t('Все уроки заполнены')}
      expanded={expanded}
      detail={
        pendingJournals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
              {t('Нужно заполнить журнал:')}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingJournals.slice(0, 5).map(p => (
                <button
                  key={p.scheduleId}
                  onClick={e => { e.stopPropagation(); tactile(); openGradebook(p.scheduleId) }}
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
            {t('Все журналы заполнены — отличная работа!')}
          </span>
        )
      }
    />
  )
}

// ── Widget 3: Weekly earnings ──────────────────────────────────────────────
function EarningsPreview({ expanded }: { expanded: boolean }) {
  const t = useT()
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
      kicker={t('Заработок · неделя')}
      title={t('Нет данных')}
      expanded={expanded}
      detail={
        <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4 }}>
          {t('Данные о заработке появятся здесь позже.')}
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
  const t = useT()
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
      kicker={t('Уведомление')}
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
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const actions = [
    { icon: BookOpen,      label: t('Создать урок'), bg: 'var(--color-green-soft)', iconColor: '#2A9D5C', page: 'lesson-editor'   as const },
    { icon: ClipboardList, label: t('Создать ДЗ'),   bg: 'var(--color-purple-soft)', iconColor: 'var(--color-accent)', page: 'homework-create' as const },
    { icon: BarChart2,     label: t('Статистика'),   bg: 'var(--color-peach-soft)', iconColor: '#C47800', page: 'gradebook'       as const },
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
  const t = useT()
  const { homework: allHomework } = useHomework()
  const hasHwToCheck = allHomework.some(hw => hw.submittedCount - hw.reviewedCount > 0)

  const WIDGETS = hasHwToCheck ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]
  const total = WIDGETS.length

  const [[idx, dir], setIdx] = useState<[number, number]>([0, 0])
  const [expanded, setExpanded] = useState(false)
  const [hovering, setHovering] = useState(false)
  // Phase-driven visibility for staged animation
  const [blurOn,    setBlurOn]    = useState(false)
  const [dotsOn,    setDotsOn]    = useState(false)
  const [contentOn, setContentOn] = useState(true)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseTimers   = useRef<ReturnType<typeof setTimeout>[]>([])
  const mountedRef    = useRef(false)
  const rootRef       = useRef<HTMLDivElement>(null)
  const measureRef    = useRef<HTMLDivElement>(null)
  const draggedRef    = useRef(false)
  const [expandedH, setExpandedH] = useState(COLLAPSED_H * 3)

  // ── Live notifications ─────────────────────────────────────────────────────
  const notifications = useNotificationsStore(s => s.notifications)
  const dismissLive   = useNotificationsStore(s => s.dismissLive)
  const markRead      = useNotificationsStore(s => s.markRead)
  const live   = notifications.filter(n => n.live)
  const latest = live[0]
  const [showNotif, setShowNotif] = useState(false)
  const notifTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLiveLen   = useRef(0)
  const notifActive   = showNotif && !!latest

  useEffect(() => {
    if (live.length > prevLiveLen.current) setShowNotif(true)
    if (live.length === 0) setShowNotif(false)
    prevLiveLen.current = live.length
  }, [live.length])

  const clearLive = () => { live.forEach(n => { dismissLive(n.id); markRead(n.id) }) }

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

  // Measure expanded height via off-screen fixed div
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => { const h = el.scrollHeight; if (h > 0) setExpandedH(h) }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widgetId, notifActive])

  const clearPhase = () => { phaseTimers.current.forEach(clearTimeout); phaseTimers.current = [] }
  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms); phaseTimers.current.push(t)
  }

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    clearPhase()
  }, [])

  const isOpen = expanded || notifActive

  // ── Staged animation phases ───────────────────────────────────────────────
  // Collapse: content out → width shrinks → height shrinks → blur in → dots in → blur out
  // Expand:   dots out → blur in → height grows → width grows → blur out → content in
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    clearPhase()
    setDotsOn(false)
    setBlurOn(false)
    setContentOn(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Auto-collapse after 5 s
  useEffect(() => {
    if (!expanded) { if (collapseTimer.current) clearTimeout(collapseTimer.current); return }
    collapseTimer.current = setTimeout(() => triggerCollapse(), 5000)
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // Close on outside click
  useEffect(() => {
    if (!expanded) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) triggerCollapse()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const bumpCollapse = () => {
    if (!expanded) return
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => triggerCollapse(), 5000)
  }

  const triggerExpand = () => {
    tactile()
    setExpanded(true)
  }

  const triggerCollapse = () => {
    tactile()
    setExpanded(false)
  }

  const goTo = (next: number, direction: number) => {
    if (expanded) return
    const wrapped = ((next % total) + total) % total
    if (wrapped === idx) return
    setIdx([wrapped, direction])
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
  }

  const handleClick = () => {
    if (draggedRef.current) return
    if (expanded || notifActive) triggerCollapse()
    else triggerExpand()
  }

  const accent = META[widgetId]?.accent ?? 'var(--color-accent)'

  // Collapsed pill dimensions (compact summary state)
  const DOT_H = COLLAPSED_H
  const dotsW = PILL_WIDTH

  // Width is fixed at PILL_WIDTH — only height animates
  const pillTransition = {
    height:       { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 },
    borderRadius: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  }

  return (
    <>
      {/* Off-screen measurement layer */}
      <div
        ref={measureRef}
        style={{
          position: 'fixed', top: 0, left: -9999, width: PILL_WIDTH,
          visibility: 'hidden', pointerEvents: 'none', zIndex: -1,
        }}
      >
        {notifActive
          ? <NotifPreview latest={latest} extra={live.length - 1} onAction={() => {}} onClose={() => {}} />
          : <PreviewById widgetId={widgetId} expanded />}
      </div>

      <motion.div
        ref={rootRef}
        onClick={notifActive ? handleNotifAction : handleClick}
        onPointerDownCapture={bumpCollapse}
        onMouseMove={bumpCollapse}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        initial={{ width: PILL_WIDTH, height: COLLAPSED_H, borderRadius: 30 }}
        animate={{
          width:  PILL_WIDTH,
          height: isOpen ? expandedH : COLLAPSED_H,
          borderRadius: 30,
        }}
        transition={pillTransition}
        style={{
          position: 'relative',
          cursor: 'pointer',
          background: 'rgba(var(--glass-rgb), 0.75)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: 'var(--shadow-pill)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Blur morph overlay — driven by blurOn phase ── */}
        <motion.div
          animate={{ opacity: blurOn ? 1 : 0 }}
          transition={{ duration: blurOn ? 0.10 : 0.28, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
            backdropFilter: 'blur(18px) saturate(200%)',
            WebkitBackdropFilter: 'blur(18px) saturate(200%)',
            background: 'rgba(var(--glass-rgb), 0.55)',
          }}
        />

        {/* ── Dots (visible when collapsed, driven by dotsOn phase) ── */}
        <motion.div
          animate={{ opacity: dotsOn ? 1 : 0 }}
          transition={{ duration: dotsOn ? 0.24 : 0.08, ease: 'easeOut' }}
          onClick={isOpen ? undefined : handleClick}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              onClick={e => { e.stopPropagation(); if (!isOpen) goTo(i, i > idx ? 1 : -1) }}
              animate={{ width: i === idx ? 14 : 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                display: 'block', height: 4, borderRadius: 999,
                background: i === idx ? accent : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          ))}
        </motion.div>

        {/* ── Expanded content — driven by contentOn phase ── */}
        <motion.div
          animate={{ opacity: contentOn ? 1 : 0 }}
          transition={{ duration: contentOn ? 0.24 : 0.08, ease: 'easeOut' }}
          style={{ pointerEvents: contentOn ? 'auto' : 'none' }}
        >
          <motion.div
            drag={isOpen ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            style={{ width: '100%', overflow: 'hidden' }}
          >
            <AnimatePresence custom={dir} initial={false}>
              <motion.div
                key={notifActive ? 'notif' : widgetId}
                custom={dir}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: 'spring', stiffness: 520, damping: 38 }, opacity: { duration: 0.12, ease: 'easeInOut' } }}
                style={{ width: '100%' }}
              >
                {notifActive
                  ? <NotifPreview latest={latest} extra={live.length - 1} onAction={handleNotifAction} onClose={dismissNotif} />
                  : <PreviewById widgetId={widgetId} expanded={expanded} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Hover chevrons — only in compact (non-expanded) state */}
          {!notifActive && total > 1 && !expanded && (
            <>
              {[
                { side: 'left' as const, label: t('Предыдущий'), d: -1 },
                { side: 'right' as const, label: t('Следующий'), d: 1 },
              ].map(({ side, label, d }) => (
                <button
                  key={side}
                  type="button"
                  aria-label={label}
                  onClick={e => { e.stopPropagation(); goTo(idx + d, d) }}
                  style={{
                    position: 'absolute', [side]: 4,
                    top: '50%', transform: 'translateY(-50%)',
                    width: 22, height: 22, borderRadius: '50%', border: 'none',
                    background: 'rgba(var(--glass-rgb), 0.85)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-2)', cursor: 'pointer',
                    opacity: hovering ? 1 : 0, transition: 'opacity 0.18s ease',
                    pointerEvents: hovering ? 'auto' : 'none',
                  }}
                >
                  {d < 0 ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              ))}
            </>
          )}
        </motion.div>

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
    </>
  )
}
