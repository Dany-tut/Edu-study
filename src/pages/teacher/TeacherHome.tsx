import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import CreateTaskModal from '../../components/teacher/CreateTaskModal'
import {
  Users, ClipboardCheck, BookOpen, TrendingUp,
  Clock, CheckCircle2, Plus, Send, Download, UserPlus,
  AlertCircle, Layers, Bell, Banknote, ChevronRight, X as XIcon,
} from 'lucide-react'
import type { ScheduleItem, Reminder, Group, Student } from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'
import { useTheme } from '../../store/themeStore'
import type { TeacherTask } from '../../store/teacherStore'
import { useGroups, useAllStudents, useJournalPending } from '../../lib/useGroups'
import { useHomework, useHardSubmissions } from '../../lib/useHomework'
import { supabase } from '../../lib/supabase'
import { getOwnerId } from '../../lib/owner'
import { mskToVietnam } from '../../lib/utils'
import { usePersistentState, clearDrafts } from '../../lib/useDraft'
import { useLang, useT, t } from '../../lib/i18n'

const SPRING = { type: 'spring', stiffness: 340, damping: 30 } as const
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] },
})

// ─── Glass card shell ──────────────────────────────────────────────────────
function Card({
  children, style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.15)',
        padding: 20,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function EarningsCard({ delay }: { delay: number }) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const [amount, setAmount] = useState<number | null>(null)
  const [payments, setPayments] = useState(0)
  useEffect(() => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    ;(async () => {
    supabase
      .from('payments')
      .select('amount')
      .eq('teacher_id', await getOwnerId())
      .gte('paid_at', from)
      .lte('paid_at', to)
      .then(({ data }) => {
        if (!data) return
        setPayments(data.length)
        setAmount(data.reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0))
      })
    })()
  }, [])

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 })} ${t('тыс')} ₽` : `${n} ₽`

  return (
    <motion.div {...fadeUp(delay)} style={{ flex: 1, minWidth: 0 }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{t('За месяц')}</span>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'var(--color-yellow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} strokeWidth={2} style={{ color: 'var(--color-yellow-text)' }} />
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 750, color: amount != null ? 'var(--color-text)' : 'var(--color-text-3)', lineHeight: 1, marginBottom: 6 }}>
          {amount != null ? fmt(amount) : '—'}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: amount != null ? 'var(--color-yellow-text)' : 'var(--color-text-3)',
          background: amount != null ? 'var(--color-yellow-soft)' : 'var(--color-bg-4)',
          borderRadius: 8, padding: '3px 8px', alignSelf: 'flex-start',
        }}>
          {amount != null ? `${payments} ${t('оплат')}` : t('загрузка...')}
        </div>
      </Card>
    </motion.div>
  )
}

function StatCard({
  icon: Icon, label, value, sub, accentBg, accentColor, delay,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub: string; accentBg: string; accentColor: string; delay: number
}) {
  return (
    <motion.div {...fadeUp(delay)} style={{ flex: 1, minWidth: 0 }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{label}</span>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} strokeWidth={2} style={{ color: accentColor }} />
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1, marginBottom: 6 }}>{value}</div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: accentColor,
          background: accentBg, borderRadius: 8, padding: '3px 8px',
          alignSelf: 'flex-start',
        }}>
          {sub}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Schedule row ───────────────────────────────────────────────────────────
// Current wall-clock in Moscow (lessons are stored in МСК), as "HH:MM".
function nowMskHHMM(): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date())
  } catch {
    return new Date().toTimeString().slice(0, 5)
  }
}

// One stop on the day's timeline. The left rail draws the connecting line + status dot;
// `isFirst`/`isLast` trim the line so it doesn't dangle past the ends.
function ScheduleRow({ item, isFirst, isLast }: { item: ScheduleItem; isFirst: boolean; isLast: boolean }) {
  const t = useT()
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const isLive = item.status === 'live'
  const isDone = item.status === 'completed'

  // Dot rendered inside the rail; line color leans on the group accent for live/upcoming.
  const dot = isDone ? (
    <CheckCircle2 size={17} strokeWidth={2.2} style={{ color: 'var(--color-green-text)', background: 'var(--color-bg)', borderRadius: '50%' }} />
  ) : isLive ? (
    <span style={{ position: 'relative', display: 'flex' }}>
      <span style={{ width: 13, height: 13, borderRadius: '50%', background: item.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${item.color} 28%, transparent)` }} />
      <span style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: item.color, opacity: 0.35, animation: 'ping 1.4s infinite' }} />
    </span>
  ) : (
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-bg)', border: `2px solid ${item.color}` }} />
  )

  const liveBg = isLive ? `color-mix(in srgb, ${item.color} 9%, transparent)` : 'transparent'
  const hoverBg = isLive ? `color-mix(in srgb, ${item.color} 22%, var(--color-bg-3))` : 'var(--color-bg-3)'

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={() => openLessonEditor(item.id)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = liveBg }}
      style={{
        width: '100%', display: 'flex', alignItems: 'stretch', gap: 12,
        padding: '8px 12px 8px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: liveBg,
        textAlign: 'left', transition: 'background 0.15s', position: 'relative',
        opacity: isDone ? 0.62 : 1,
      }}
    >
      {/* Rail: connecting line + status dot */}
      <div style={{ position: 'relative', width: 22, flexShrink: 0, alignSelf: 'stretch' }}>
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 2,
          top: isFirst ? 'calc(50% - 2px)' : 0,
          bottom: isLast ? 'calc(50% - 2px)' : 0,
          background: 'var(--color-border-medium)',
        }} />
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex' }}>
          {dot}
        </span>
      </div>

      {/* Time — МСК primary, Vietnam (студент Галя) below */}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, flexShrink: 0, width: 62, alignSelf: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: isLive ? 'var(--color-text)' : 'var(--color-text-2)' }}>
          {item.time}{item.endTime ? `–${item.endTime}` : ''}
        </span>
        {item.time && (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)' }}>
            {mskToVietnam(item.time)} {t('ВН')}
          </span>
        )}
      </span>

      {/* Main: group chip + subject/topic line */}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, alignSelf: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `color-mix(in srgb, ${item.color} 16%, transparent)`,
            borderRadius: 8, padding: '3px 9px', flexShrink: 0, maxWidth: '100%',
          }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.groupName}</span>
          </span>
          {isLive && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: item.color, letterSpacing: 0.3, flexShrink: 0 }}>
              {t('ИДЁТ СЕЙЧАС')}
            </span>
          )}
        </span>
        {(item.subject || item.topic || item.lessonNumber > 0) && (
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[item.subject, item.lessonNumber > 0 ? `${t('Урок')} ${item.lessonNumber}` : '', item.topic].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>

      {/* Student count */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: 'var(--color-text-3)', alignSelf: 'center' }}>
        <Users size={13} strokeWidth={1.8} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.studentCount}</span>
      </span>
    </motion.button>
  )
}

// Thin divider that marks the current moment between finished and upcoming lessons.
function NowMarker({ time }: { time: string }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 12px 2px 4px' }}>
      <div style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red-text)', boxShadow: '0 0 0 3px var(--color-red-soft)' }} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: 'var(--color-red-text)', flexShrink: 0 }}>
        {t('СЕЙЧАС')} · {time}
      </span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--color-red-soft), transparent)' }} />
    </div>
  )
}

// ─── Payment block ───────────────────────────────────────────────────────────
function diffDays(isoA: string, isoB: string) {
  return Math.round((new Date(isoA).getTime() - new Date(isoB).getTime()) / 86400000)
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function PaymentBlock({ students, groups }: { students: Student[]; groups: Group[] }) {
  const t = useT()
  const TODAY = new Date().toISOString().split('T')[0]
  const withPayment = students.filter(s => s.paymentDue)
  if (!withPayment.length) return null

  const overdue  = withPayment.filter(s => diffDays(s.paymentDue!, TODAY) < 0)
  const thisWeek = withPayment.filter(s => { const d = diffDays(s.paymentDue!, TODAY); return d >= 0 && d <= 7 })
  const thisMonth = withPayment.filter(s => { const d = diffDays(s.paymentDue!, TODAY); return d > 7 && d <= 31 })

  const Section = ({ label, color, bg, items }: { label: string; color: string; bg: string; items: typeof withPayment }) => {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map(s => {
            const group = groups.find(g => g.id === s.groupId)
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 10, background: bg,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color,
                }}>
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{group?.name ?? ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {s.paymentAmount && (
                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{s.paymentAmount.toLocaleString('ru-RU')} ₽</div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{formatDue(s.paymentDue!)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 14, border: '1px solid var(--color-border)', padding: '12px 14px',
      background: 'var(--color-bg-4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Banknote size={13} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('Оплата')}
        </span>
      </div>
      <Section label={t('Просрочено')} color="#E04848" bg="var(--color-red-soft)" items={overdue} />
      <Section label={t('На этой неделе')} color="#D07020" bg="var(--color-peach-soft)" items={thisWeek} />
      <Section label={t('В этом месяце')} color="#5A7A9A" bg="var(--color-bg-3)" items={thisMonth} />
    </div>
  )
}

// ─── Reminder row ───────────────────────────────────────────────────────────
const reminderIcons: Record<Reminder['type'], React.ElementType> = {
  'check-hw': ClipboardCheck,
  'fill-widget': Layers,
  'make-trainer': BookOpen,
  'send-push': Bell,
  'payment-debt': Banknote,
  'fill-journal': Clock,
}
// Warm "amber" reminder accent — единая тёплая гамма напоминаний (чуть горячее
// для high-срочности), как iOS-стопки со стеклом. Оплата — исключение: всегда
// голубо-синяя гамма (чуть насыщённее при просрочке), вне зависимости от срочности.
const reminderAccent = (item: Pick<Reminder, 'type' | 'urgency'>) => {
  if (item.type === 'payment-debt') return item.urgency === 'high' ? '#1E7FE0' : '#33A1E8'
  return item.urgency === 'high' ? '#EC6A3C' : item.urgency === 'low' ? '#E0A93F' : '#F0901A'
}

// Text shown on the high-urgency badge — spells out *why* it's flagged.
const urgencyLabel = (type: Reminder['type']) =>
  type === 'payment-debt' ? t('Просрочено')
  : type === 'fill-journal' ? t('Не заполнен')
  : type === 'check-hw' ? t('Давно ждёт')
  : t('Срочно')

function ReminderRow({ item, done, onAction, style: styleOverride }: { item: Reminder; done?: boolean; onAction?: () => void; style?: React.CSSProperties }) {
  const t = useT()
  const Icon = done ? CheckCircle2 : reminderIcons[item.type]
  // Кликабельно только пока есть куда вести и дело не закрыто.
  const clickable = !done && !!onAction
  const accent = done ? 'var(--color-green-text)' : reminderAccent(item)
  return (
    <motion.div
      onClick={clickable ? onAction : undefined}
      whileTap={clickable ? { scale: 0.99 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 18,
        background: done ? 'var(--color-green-soft)' : 'rgba(var(--glass-rgb), 0.62)',
        backdropFilter: 'blur(10px) saturate(135%)',
        WebkitBackdropFilter: 'blur(10px) saturate(135%)',
        border: `1px solid ${done ? 'transparent' : 'var(--color-border-medium)'}`,
        boxShadow: done ? 'none' : '0 10px 26px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.16)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.25s',
        ...styleOverride,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: done ? 'rgba(74,222,128,0.18)' : `color-mix(in srgb, ${accent} 18%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={2.2} style={{ color: accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: done ? 'var(--color-green-text)' : 'var(--color-text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{
            fontSize: 12, fontWeight: 500, marginTop: 2,
            color: done ? 'var(--color-green-text)' : 'var(--color-text-3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {done ? t('Готово') : item.detail}
          </div>
        )}
      </div>
      {!done && item.urgency === 'high' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          padding: '3px 9px 3px 7px', borderRadius: 999,
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          color: accent, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          <AlertCircle size={12} strokeWidth={2.4} />
          {urgencyLabel(item.type)}
        </span>
      )}
      {clickable && (
        <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
      )}
    </motion.div>
  )
}

// ─── iOS-style stacked group ────────────────────────────────────────────────
const stackTypeLabel: Record<Reminder['type'], string> = {
  'check-hw': 'ДЗ на проверку',
  'fill-journal': 'Журнал',
  'payment-debt': 'Оплата',
  'fill-widget': 'Виджет',
  'make-trainer': 'Тренажёр',
  'send-push': 'Уведомление',
}

// One shared timeline for the WHOLE collapse, so the three motions read as one:
//   (1) the open list fading out, (2) this group's height shrinking,
//   (3) the stacks below rising to fill the gap.
// The ease is deliberately gentle-in / smooth-out (NOT ease-out-quint) — a
// front-loaded curve makes the lower stacks shoot up early and overrun the
// still-visible folding cards. With one matched duration + ease, a sibling is
// only ~50% risen when a card is ~50% faded, so nothing leaps over unfinished
// motion. Bump the duration here to make the whole fold slower/faster.
const COLLAPSE = {
  height: { type: 'spring' as const, stiffness: 300, damping: 44 },
  opacity: { duration: 0.2, ease: 'easeOut' as const },
}

function ReminderGroupStack({ items, getAction, isDone }: {
  items: Reminder[]
  getAction: (r: Reminder) => (() => void) | undefined
  isDone: (r: Reminder) => boolean
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const dark = useTheme(s => s.dark)
  const collapseColor = dark ? 'var(--color-text-3)' : 'var(--color-text-4)'

  if (items.length === 1) {
    return <ReminderRow item={items[0]} done={isDone(items[0])} onAction={getAction(items[0])} />
  }

  const front = items[0]
  const accent = reminderAccent(front)
  const behind = Math.min(items.length - 1, 2)

  return (
    // The two views (collapsed stack / expanded list) share ONE grid cell so they
    // overlap and crossfade in place — the front card morphs into the first row.
    // Each view animates its real `height` (auto ↔ 0), so the container's height
    // genuinely shrinks frame-by-frame in normal flow; the stacks below are pushed
    // up by that reflow in true lockstep — they can't outrun the fold the way they
    // did when popLayout yanked the list out of flow instantly.
    <div style={{ display: 'grid' }}>
    <AnimatePresence initial={false}>
      {!expanded ? (
        <motion.div
          key="stack"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={COLLAPSE}
          onClick={() => setExpanded(true)}
          style={{
            gridArea: '1 / 1', alignSelf: 'start',
            overflow: 'hidden', cursor: 'pointer',
            // No paddingBottom here — padding lives inside the content div so
            // at height:0 the element contributes exactly 0px to flow (no jump).
          }}
        >
          {/* Ghosts are in normal flow (not absolute) so overflow:hidden
              clips them smoothly as height animates. z-index controls layering. */}
          <div>
            {/* Front card */}
            <div style={{ position: 'relative', zIndex: 3 }}>
              <ReminderRow item={front} done={isDone(front)} onAction={undefined} style={{ paddingRight: 48, background: 'rgba(var(--glass-rgb), 0.80)', backdropFilter: 'blur(10px) saturate(140%)', WebkitBackdropFilter: 'blur(10px) saturate(140%)' }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
                pointerEvents: 'none', zIndex: 1,
                background: `radial-gradient(70% 46% at 50% 100%, color-mix(in srgb, ${accent} 13%, transparent), transparent 70%)`,
              }} />
              <div style={{
                position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)',
                minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13,
                background: accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 750, lineHeight: 1, pointerEvents: 'none',
                boxShadow: `0 4px 12px color-mix(in srgb, ${accent} 50%, transparent)`,
              }}>
                {items.length}
              </div>
            </div>
            {/* Ghost 1 — pulls up 3px so it kisses the front card bottom */}
            <div style={{
              height: 18, marginTop: -3, marginLeft: 11, marginRight: 11,
              position: 'relative', zIndex: 2,
              background: `color-mix(in srgb, ${accent} 14%, rgba(var(--glass-rgb), 0.55))`,
              backdropFilter: 'blur(9px) saturate(135%)',
              WebkitBackdropFilter: 'blur(9px) saturate(135%)',
              borderStyle: 'solid', borderWidth: '0 1px 1px 1px', borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
              borderRadius: '0 0 16px 16px',
            }} />
            {/* Ghost 2 — behind ghost 1; ghost1 ends 15px below front, ghost2 target
                is 9px below front → offset = 9-15 = -6 from ghost1 bottom */}
            {behind >= 2 && (
              <div style={{
                height: 18, marginTop: -6, marginLeft: 22, marginRight: 22,
                position: 'relative', zIndex: 1,
                background: `color-mix(in srgb, ${accent} 10%, rgba(var(--glass-rgb), 0.5))`,
                backdropFilter: 'blur(9px) saturate(135%)',
                WebkitBackdropFilter: 'blur(9px) saturate(135%)',
                borderStyle: 'solid', borderWidth: '0 1px 1px 1px', borderColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
                borderRadius: '0 0 16px 16px',
              }} />
            )}
            {/* Spacer preserves visual gap below ghosts */}
            <div style={{ height: behind >= 2 ? 5 : 7 }} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={COLLAPSE}
          style={{
            gridArea: '1 / 1', alignSelf: 'start',
            overflow: 'hidden',
            // No paddingBottom on motion div — moved inside so height:0 = 0px in flow.
          }}
        >
          <div style={{ paddingBottom: 16 }}>
            <div
              onClick={() => setExpanded(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 10px 6px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                {t(stackTypeLabel[front.type])} · {items.length}
              </span>
              <span style={{ fontSize: 11, color: collapseColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                {t('Свернуть')} <ChevronRight size={11} style={{ transform: 'rotate(-90deg)' }} />
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((r, i) => {
                const next = items[i + 1]
                const nAccent = !isDone(r) && next && isDone(next) ? 'var(--color-green-text)' : undefined
                return (
                  <div key={r.id} style={{ position: 'relative' }}>
                    <ReminderRow item={r} done={isDone(r)} onAction={getAction(r)} />
                    {nAccent && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: '2%', right: '2%', height: 32,
                        pointerEvents: 'none', opacity: 0.6,
                        background: `radial-gradient(80% 100% at 50% 100%, color-mix(in srgb, ${nAccent} 20%, transparent), transparent 70%)`,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  )
}

// ─── Activity row ───────────────────────────────────────────────────────────
// ─── Quick action button ────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, bg, color, onClick,
}: { icon: React.ElementType; label: string; bg: string; color: string; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, padding: '12px 8px', borderRadius: 16, border: 'none', cursor: 'pointer',
        background: bg, transition: 'opacity 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: 'rgba(var(--glass-rgb), 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} strokeWidth={2} style={{ color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 650, color, textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </motion.button>
  )
}

// ─── Task row ────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onRemove, onClick }: {
  task: TeacherTask
  onToggle: () => void
  onRemove: () => void
  onClick: () => void
}) {
  const t = useT()
  const rowRef = useRef<HTMLDivElement>(null)
  const [showDelete, setShowDelete] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return
    setShowDelete(e.clientX - rect.left > rect.width * 0.75)
  }

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 12,
        background: task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
        border: 'none',
        opacity: task.done ? 0.6 : 1,
        transition: 'opacity 0.2s, background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-4)' : 'var(--color-bg-3)' }}
      onMouseLeave={e => { setShowDelete(false); (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)' }}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${task.done ? 'var(--color-accent)' : '#C4B0F0'}`,
          background: task.done ? 'var(--color-accent)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {task.done && <CheckCircle2 size={11} strokeWidth={3} style={{ color: '#fff' }} />}
      </button>

      {task.typeLabel && task.typeBg && task.typeColor && (
        <span style={{
          fontSize: 11, fontWeight: 650,
          background: task.typeBg, color: task.typeColor,
          borderRadius: 8, padding: '2px 8px', flexShrink: 0,
        }}>
          {task.typeLabel}
        </span>
      )}

      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500,
        color: task.done ? 'var(--color-text-3)' : 'var(--color-text)',
        textDecoration: task.done ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {(task.title || (task.typeLabel ?? t('Задача'))).replace(/@/g, '')}
      </span>

      <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>
        {task.date}{task.time ? ` · ${task.time}` : ''}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={e => {
          const rect = rowRef.current?.getBoundingClientRect()
          if (!rect) return
          setShowDelete((e as React.MouseEvent).clientX - rect.left > rect.width * 0.75)
        }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: 'none', background: 'none', cursor: 'pointer',
          color: '#F48B91', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: showDelete ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: showDelete ? 'auto' : 'none',
        }}
      >
        <XIcon size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ─── My Tasks block ─────────────────────────────────────────────────────────
function MyTasksBlock() {
  const t = useT()
  const tasks = useTeacher(s => s.tasks)
  const toggleTask = useTeacher(s => s.toggleTask)
  const removeTask = useTeacher(s => s.removeTask)
  const updateTask = useTeacher(s => s.updateTask)
  // Persisted so an open edit modal (and its draft) re-opens after a reload.
  const [editingTask, setEditingTask] = usePersistentState<TeacherTask | null>('createTask.editingHome', null)
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)
  // Задача про карточку ученика ведёт в саму карточку, а не в модалку правки:
  // «Заполнить карточку: Анна · Японский», после которой карточку ищут руками в
  // Группах, — это не задача, а напоминание о поиске.
  const openTask = (task: TeacherTask) => {
    if (task.studentId && task.groupId) openStudentDashboard(task.studentId, task.groupId)
    else setEditingTask(task)
  }
  const [tasksAtTop, setTasksAtTop] = useState(true)
  const [tasksAtBottom, setTasksAtBottom] = useState(false)

  if (!tasks.length) return null

  const pending = tasks.filter(t => !t.done)
  const done    = tasks.filter(t => t.done)
  const allTasks = [...pending, ...done]
  const needsScroll = allTasks.length > 5
  const ROW_H = 37
  const GAP = 5
  const listMaxH = 5 * ROW_H + 4 * GAP
  const topFade = tasksAtTop ? 'black 0%' : 'transparent 0%, black 10px'
  const botFade = tasksAtBottom ? 'black 100%' : 'black calc(100% - 18px), transparent 100%'
  const tasksMask = needsScroll ? `linear-gradient(to bottom, ${topFade}, ${botFade})` : undefined

  return (
    <>
    {editingTask && (
      <CreateTaskModal
        initialTask={editingTask}
        onClose={() => { setEditingTask(null); clearDrafts('createTask.') }}
        onSave={saved => {
          updateTask(editingTask.id, {
            typeId: saved.type?.id ?? null,
            typeLabel: saved.type?.label ?? null,
            typeBg: saved.type?.bg ?? null,
            typeColor: saved.type?.textColor ?? null,
            title: saved.title,
            date: saved.date,
            time: saved.time,
            comment: saved.comment,
          })
          setEditingTask(null)
        }}
      />
    )}
    <motion.div {...fadeUp(0.26)}>
      <Card>
        <CardTitle>
          <CheckCircle2 size={14} strokeWidth={2} />
          {t('Мои задачи')}
          {pending.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
              background: 'var(--color-purple-soft)', borderRadius: 8, padding: '2px 8px',
            }}>
              {pending.length}
            </span>
          )}
        </CardTitle>
        <div
          className="no-scrollbar"
          onScroll={needsScroll ? e => {
            const el = e.currentTarget
            setTasksAtTop(el.scrollTop < 4)
            setTasksAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
          } : undefined}
          style={{
            display: 'flex', flexDirection: 'column', gap: GAP,
            ...(needsScroll ? {
              maxHeight: listMaxH, overflowY: 'auto',
              maskImage: tasksMask, WebkitMaskImage: tasksMask,
            } : {}),
          }}
        >
          {allTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onRemove={() => removeTask(task.id)}
              onClick={() => openTask(task)}
            />
          ))}
        </div>
      </Card>
    </motion.div>
    </>
  )
}

// ─── Overlay scrollbar ──────────────────────────────────────────────────────
// Native bar hidden via `.no-scrollbar`; a thin thumb is drawn as an absolutely
// positioned sibling that floats ON TOP of the content (never reserves a gutter,
// so it can't push the layout). Hidden at rest, fades in on hover or while
// scrolling. Render `thumb` as a sibling of the scroll element inside a
// position:relative parent; feed scroll/hover events back in.
function useOverlayThumb() {
  const [m, setM] = useState({ st: 0, sh: 0, ch: 0 })
  const [hover, setHover] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function update(el: HTMLElement) {
    setM(prev => (prev.st === el.scrollTop && prev.sh === el.scrollHeight && prev.ch === el.clientHeight
      ? prev : { st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight }))
  }
  function onScroll(el: HTMLElement) {
    update(el)
    setScrolling(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setScrolling(false), 900)
  }

  const inset = 4
  const overflowing = m.sh > m.ch + 1
  const trackH = Math.max(0, m.ch - inset * 2)
  const thumbH = trackH > 0 ? Math.max(24, (m.ch / m.sh) * trackH) : 0
  const maxScroll = m.sh - m.ch
  const thumbTop = inset + (maxScroll > 0 ? (m.st / maxScroll) * (trackH - thumbH) : 0)

  const thumb = overflowing ? (
    <div style={{
      position: 'absolute', top: thumbTop, right: 2, width: 5, height: thumbH,
      borderRadius: 999, background: 'var(--scroll-thumb)', pointerEvents: 'none', zIndex: 3,
      transition: 'opacity 0.2s ease', opacity: hover || scrolling ? 1 : 0,
    }} />
  ) : null

  return { update, onScroll, setHover, thumb }
}

// ─── Reminders scrollable container ─────────────────────────────────────────
function RemindersScroll({ reminders, reminderAction, reminderDone, allStudents, groups }: {
  reminders: Reminder[]
  reminderAction: (r: Reminder) => (() => void) | undefined
  reminderDone: (r: Reminder) => boolean
  allStudents: any[]
  groups: any[]
}) {
  const [atBottom, setAtBottom] = useState(false)
  const { update, onScroll, setHover, thumb } = useOverlayThumb()

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
    onScroll(el)
  }

  const topFade = 'transparent 0%, black 12px'
  const botFade = atBottom ? 'black 100%' : 'black calc(100% - 20px), transparent 100%'
  const mask = `linear-gradient(to bottom, ${topFade}, ${botFade})`

  return (
    <>
    <div
      ref={el => { if (el) update(el) }}
      onScroll={handleScroll}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="no-scrollbar"
      style={{
        position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 10,
        maskImage: mask, WebkitMaskImage: mask,
        // slim inline padding still leaves room for each row's drop-shadow + stack
        // ghosts (not clipped by overflowX:hidden) but lets the stacks run wider
        paddingBlock: 8, paddingLeft: 4, paddingRight: 12,
      }}
    >
      {Object.values(
        reminders.reduce((acc, r) => {
          ;(acc[r.type] ??= []).push(r)
          return acc
        }, {} as Record<string, Reminder[]>)
      )
        .map(group => [...group].sort((a, b) => Number(reminderDone(a)) - Number(reminderDone(b))))
        .sort((a, b) => Number(a.every(reminderDone)) - Number(b.every(reminderDone)))
        .map(group => (
          <ReminderGroupStack
            key={group[0].type}
            items={group}
            getAction={reminderAction}
            isDone={reminderDone}
          />
        ))}
    </div>
    {thumb}
    </>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function TeacherHome() {
  const t = useT()
  const { setActivePage, openGradebook } = useTeacher()
  const openHardReview = useTeacher(s => s.openHardReview)
  const openHomeworkReview = useTeacher(s => s.openHomeworkReview)
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)
  const { groups } = useGroups()
  const { homework: allHomework } = useHomework()
  const { submissions: hardSubs } = useHardSubmissions()
  const allStudents = useAllStudents()

  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([])
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('schedule_lessons')
      .select('*, groups(name, icon, color, color_soft, students(count))')
      .eq('date', today)
      .order('time_start')
      .then(({ data }) => {
        if (!data) return
        // schedule_lessons has no owner column, so scope to THIS teacher's own
        // groups / students — otherwise a new teacher sees every lesson globally.
        const myGroupIds = new Set(groups.map(g => g.id))
        const myStudentIds = new Set(allStudents.map(a => a.id))
        const mine = data.filter((s: any) =>
          (s.group_id && myGroupIds.has(String(s.group_id))) ||
          (s.student_id && myStudentIds.has(String(s.student_id)))
        )
        setTodaySchedule(mine.map((s: any) => {
          // Rows scoped to a single student (group_id null) have no group join.
          const stu = s.student_id ? allStudents.find(a => a.id === s.student_id) : null
          return {
            id: String(s.id),
            groupId: s.group_id ?? null,
            studentId: s.student_id ?? null,
            groupName: s.groups?.name ?? stu?.name ?? '',
            icon: s.groups?.icon ?? '👤',
            time: (s.time_start ?? '').slice(0, 5),
            endTime: (s.time_end ?? '').slice(0, 5),
            topic: s.lesson_title ?? '',
            lessonNumber: s.lesson_number ?? 0,
            subject: s.subject ?? '',
            status: (s.status ?? 'upcoming') as ScheduleItem['status'],
            studentCount: s.groups?.students?.[0]?.count ?? (stu ? 1 : 0),
            color: s.groups?.color ?? 'var(--color-purple)',
            colorSoft: s.groups?.color_soft ?? 'var(--color-bg-3)',
          }
        }))
      })
  }, [groups, allStudents])

  const pendingJournals = useJournalPending(null)
  const pendingHomework = allHomework.filter(hw => hw.status === 'active')
  const totalStudents = groups.reduce((a, g) => a + g.studentCount, 0)
  const TODAY = new Date().toISOString().split('T')[0]

  // Обычное И сложное ДЗ теперь оба живут в lesson_progress; reviewedCount у hw
  // считается из него (см. useHomework). Свежая сдача = 'submitted' до проверки.
  const pendingHard = hardSubs.filter(s => s.status === 'submitted')
  const pendingCount =
    pendingHomework.reduce((a, hw) => a + Math.max(0, hw.submittedCount - hw.reviewedCount), 0) +
    pendingHard.length

  const reminders: Reminder[] = [
    ...pendingHomework.filter(hw => hw.submittedCount > 0).map(hw => ({
      id: `hw-${hw.id}`,
      type: 'check-hw' as Reminder['type'],
      text: `${t('Проверить ДЗ')} — ${hw.groupName}`,
      detail: `${hw.submittedCount} ${t('из')} ${hw.totalCount} ${t('сдали')}`,
      urgency: 'high' as Reminder['urgency'],
    })),
    ...pendingHard.map(s => ({
      id: `hard-${s.id}`,
      type: 'check-hw' as Reminder['type'],
      text: `${t('Сложное ДЗ')} — ${s.studentName.split(' ')[0]}`,
      detail: s.lessonTitle,
      urgency: 'high' as Reminder['urgency'],
    })),
    ...allStudents.filter(s => s.paymentDue && diffDays(s.paymentDue, TODAY) <= 7).map(s => ({
      id: `pay-${s.id}`,
      type: 'payment-debt' as Reminder['type'],
      text: `${t('Оплата')} — ${s.name.split(' ')[0]}`,
      detail: s.paymentAmount ? `${s.paymentAmount.toLocaleString('ru-RU')} ₽` : '',
      urgency: (diffDays(s.paymentDue!, TODAY) < 0 ? 'high' : 'medium') as Reminder['urgency'],
    })),
    ...pendingJournals.map(p => ({
      id: `journal-${p.scheduleId}`,
      type: 'fill-journal' as Reminder['type'],
      text: `${t('Журнал')} — ${p.scopeName}`,
      detail: `${p.date.slice(5).replace('-', '.')} · ${p.title}`,
      urgency: 'medium' as Reminder['urgency'],
    })),
  ]

  const reminderDone = (r: Reminder) =>
    r.type === 'check-hw' &&
    pendingHomework.some(hw => r.text.includes(hw.groupName) && hw.reviewedCount >= hw.submittedCount)

  // Куда ведёт напоминание — по префиксу id (см. формирование reminders выше):
  // hard- → проверка сложного ДЗ, hw- → проверка обычного ДЗ, pay- → карточка ученика, journal- → Журнал.
  const reminderAction = (r: Reminder): (() => void) | undefined => {
    if (r.id.startsWith('hard-')) { const id = r.id.slice(5); return () => openHardReview(id) }
    if (r.id.startsWith('hw-')) { const id = r.id.slice(3); return () => openHomeworkReview(id) }
    if (r.id.startsWith('journal-')) { const sid = r.id.slice(8); return () => openGradebook(sid) }
    if (r.id.startsWith('pay-')) {
      const sid = r.id.slice(4)
      const stu = allStudents.find(s => s.id === sid)
      return stu ? () => openStudentDashboard(sid, stu.groupId) : undefined
    }
    return undefined
  }

  const schedThumb = useOverlayThumb()

  const nextLesson = todaySchedule.find(s => s.status === 'upcoming')
  const doneCount = todaySchedule.filter(s => s.status === 'completed').length
  // "Сейчас" sits before the first upcoming lesson — but only when something has already
  // finished and nothing is live (a live row already signals the present moment).
  const firstUpcomingIdx = todaySchedule.findIndex(s => s.status === 'upcoming')
  const hasLive = todaySchedule.some(s => s.status === 'live')
  const nowMarkerIndex = !hasLive && firstUpcomingIdx > 0 ? firstUpcomingIdx : -1

  return (
    // Scroll container lifted to viewport top — content scrolls under the topbar
    // progressive-blur strip (same recipe as student DashboardPage panels).
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0, marginTop: -100, paddingTop: 100, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      {/* ── Stats row ── */}
      <section style={{ padding: '16px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <StatCard
            icon={Users} label={t('Студентов')} value={totalStudents}
            sub={`${groups.length} ${t('группы')}`}
            accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)" delay={0.05}
          />
          <StatCard
            icon={ClipboardCheck} label={t('Проверить ДЗ')} value={pendingCount}
            sub={t('ждут ревью')}
            accentBg="var(--color-red-soft)" accentColor="var(--color-red-text)" delay={0.1}
          />
          <StatCard
            icon={Clock} label={t('Уроков сегодня')} value={todaySchedule.length}
            sub={nextLesson ? `${t('следующий в')} ${nextLesson.time} ${t('МСК')} (${mskToVietnam(nextLesson.time)} ${t('ВН')})` : t('все завершены')}
            accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)" delay={0.15}
          />
          <EarningsCard delay={0.2} />
        </div>
      </section>

      {/* ── Main content ── */}
      <main style={{
        flex: 1, minHeight: 0,
        padding: '16px 32px 28px',
        display: 'flex', gap: 16,
        overflow: 'hidden',
      }}>

        {/* Left column: schedule + activity */}
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Today's schedule */}
          <motion.div {...fadeUp(0.22)} style={{ flex: 1, minHeight: 0 }}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardTitle>
                <Clock size={14} strokeWidth={2} />
                {t('Расписание сегодня')}
                {todaySchedule.length > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0 }}>
                    <span style={{ color: 'var(--color-green-text)' }}>{doneCount} {t('провед.')}</span>
                    <span style={{ color: 'var(--color-text-4)' }}>·</span>
                    <span style={{ color: 'var(--color-accent)' }}>{todaySchedule.length - doneCount} {t('впереди')}</span>
                  </span>
                )}
              </CardTitle>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <div
                  ref={el => { if (el) schedThumb.update(el) }}
                  onScroll={e => schedThumb.onScroll(e.currentTarget)}
                  onMouseEnter={() => schedThumb.setHover(true)}
                  onMouseLeave={() => schedThumb.setHover(false)}
                  className="no-scrollbar"
                  style={{
                  position: 'absolute', inset: 0,
                  overflowY: 'auto', overflowX: 'hidden',
                  display: 'flex', flexDirection: 'column', gap: 1,
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 20px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 20px), transparent 100%)',
                  paddingBlock: 6, paddingLeft: 0, paddingRight: 12,
                }}>
                  {todaySchedule.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-4)', padding: '24px 0' }}>
                      <Clock size={26} strokeWidth={1.5} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Сегодня уроков нет')}</span>
                    </div>
                  ) : todaySchedule.map((item, i) => (
                    <div key={item.id}>
                      {i === nowMarkerIndex && <NowMarker time={nowMskHHMM()} />}
                      <ScheduleRow item={item} isFirst={i === 0} isLast={i === todaySchedule.length - 1} />
                    </div>
                  ))}
                </div>
                {schedThumb.thumb}
              </div>
            </Card>
          </motion.div>

          <MyTasksBlock />

        </div>

        {/* Right column: reminders + quick actions */}
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Reminders */}
          <motion.div {...fadeUp(0.18)} style={{ flex: 1, minHeight: 0 }}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardTitle>
                <AlertCircle size={14} strokeWidth={2} />
                {t('Напоминания')}
              </CardTitle>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <RemindersScroll
                  reminders={reminders}
                  reminderAction={reminderAction}
                  reminderDone={reminderDone}
                  allStudents={allStudents}
                  groups={groups}
                />
              </div>
            </Card>
          </motion.div>

        </div>
      </main>

      {/* Ping animation for live indicator */}
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
