import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import CreateTaskModal from '../../components/teacher/CreateTaskModal'
import {
  Users, ClipboardCheck, BookOpen, TrendingUp,
  Clock, CheckCircle2, Circle, Plus, Send, Download, UserPlus,
  AlertCircle, Layers, Bell, Banknote,
} from 'lucide-react'
import type { ScheduleItem, Reminder, Group, Student } from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'
import type { TeacherTask } from '../../store/teacherStore'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import { useHomework } from '../../lib/useHomework'
import { supabase } from '../../lib/supabase'

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
  return (
    <motion.div {...fadeUp(delay)} style={{ flex: 1, minWidth: 0 }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>За месяц</span>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'var(--color-yellow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} strokeWidth={2} style={{ color: 'var(--color-yellow-text)' }} />
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 750, color: 'var(--color-text-3)', lineHeight: 1, marginBottom: 6 }}>
          Нет данных
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)',
          background: 'var(--color-bg-4)', borderRadius: 8, padding: '3px 8px',
          alignSelf: 'flex-start',
        }}>
          будет позже
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
function ScheduleRow({ item }: { item: ScheduleItem }) {
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.025)' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => openLessonEditor(item.id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'transparent', textAlign: 'left', transition: 'background 0.15s',
      }}
    >
      {/* Status dot */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        {item.status === 'completed' ? (
          <CheckCircle2 size={18} strokeWidth={2} style={{ color: '#6EE7A0' }} />
        ) : item.status === 'live' ? (
          <>
            <Circle size={18} strokeWidth={2} style={{ color: '#C58BFF' }} />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(197,139,255,0.3)', animation: 'ping 1.4s infinite',
            }} />
          </>
        ) : (
          <Circle size={18} strokeWidth={1.8} style={{ color: 'var(--color-text-4)' }} />
        )}
      </div>

      {/* Time */}
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', flexShrink: 0, width: 38 }}>
        {item.time}
      </span>

      {/* Group chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: item.colorSoft, borderRadius: 8, padding: '3px 9px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{item.groupName}</span>
      </div>

      {/* Topic */}
      <span style={{ fontSize: 13, color: 'var(--color-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.topic}
      </span>

      {/* Student count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: 'var(--color-text-3)' }}>
        <Users size={13} strokeWidth={1.8} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.studentCount}</span>
      </div>
    </motion.button>
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
          Оплата
        </span>
      </div>
      <Section label="Просрочено" color="#E04848" bg="var(--color-red-soft)" items={overdue} />
      <Section label="На этой неделе" color="#D07020" bg="var(--color-peach-soft)" items={thisWeek} />
      <Section label="В этом месяце" color="#5A7A9A" bg="var(--color-bg-3)" items={thisMonth} />
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
}
const urgencyColor = { high: '#F48B91', medium: '#F8C991', low: 'var(--color-text-4)' }
const urgencyBg = { high: 'var(--color-red-soft)', medium: 'var(--color-peach-soft)', low: 'var(--color-bg)' }

function ReminderRow({ item, done }: { item: Reminder; done?: boolean }) {
  const Icon = done ? CheckCircle2 : reminderIcons[item.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 12,
      background: done ? 'var(--color-green-soft)' : urgencyBg[item.urgency],
      opacity: done ? 0.85 : 1,
      transition: 'background 0.25s, opacity 0.25s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: done ? 'rgba(74,222,128,0.18)' : urgencyColor[item.urgency] + '44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} strokeWidth={2} style={{ color: done ? 'var(--color-green-text)' : urgencyColor[item.urgency] }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 650,
          color: done ? 'var(--color-green-text)' : 'var(--color-text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>{done ? 'Готово' : item.detail}</div>
        )}
      </div>
      {!done && item.urgency === 'high' && (
        <AlertCircle size={13} strokeWidth={2} style={{ color: '#F48B91', flexShrink: 0 }} />
      )}
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

// ─── My Tasks block ─────────────────────────────────────────────────────────
function MyTasksBlock() {
  const tasks = useTeacher(s => s.tasks)
  const toggleTask = useTeacher(s => s.toggleTask)
  const removeTask = useTeacher(s => s.removeTask)
  const updateTask = useTeacher(s => s.updateTask)
  const [editingTask, setEditingTask] = useState<TeacherTask | null>(null)

  if (!tasks.length) return null

  const pending = tasks.filter(t => !t.done)
  const done    = tasks.filter(t => t.done)

  return (
    <>
    {editingTask && (
      <CreateTaskModal
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
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
          Мои задачи
          {pending.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 11, fontWeight: 700, color: '#7B3FCC',
              background: 'var(--color-purple-soft)', borderRadius: 8, padding: '2px 8px',
            }}>
              {pending.length}
            </span>
          )}
        </CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[...pending, ...done].map(task => (
            <div
              key={task.id}
              onClick={() => setEditingTask(task)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 12,
                background: task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
                border: `1px solid ${task.done ? 'var(--color-border-soft)' : 'var(--color-border-medium)'}`,
                opacity: task.done ? 0.6 : 1,
                transition: 'opacity 0.2s, background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-5)' : 'var(--color-purple-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)' }}
            >
              {/* Checkbox */}
              <button
                onClick={e => { e.stopPropagation(); toggleTask(task.id) }}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${task.done ? '#7B3FCC' : '#C4B0F0'}`,
                  background: task.done ? '#7B3FCC' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {task.done && <CheckCircle2 size={11} strokeWidth={3} style={{ color: '#fff' }} />}
              </button>

              {/* Type pill */}
              {task.typeLabel && task.typeBg && task.typeColor && (
                <span style={{
                  fontSize: 11, fontWeight: 650,
                  background: task.typeBg, color: task.typeColor,
                  borderRadius: 8, padding: '2px 8px', flexShrink: 0,
                }}>
                  {task.typeLabel}
                </span>
              )}

              {/* Title */}
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 500,
                color: task.done ? 'var(--color-text-3)' : 'var(--color-text)',
                textDecoration: task.done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {task.title || (task.typeLabel ?? 'Задача')}
              </span>

              {/* Date + time */}
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>
                {task.date}{task.time ? ` · ${task.time}` : ''}
              </span>

              {/* Remove */}
              <button
                onClick={e => { e.stopPropagation(); removeTask(task.id) }}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--color-text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, lineHeight: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F48B91' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-4)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
    </>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function TeacherHome() {
  const { setActivePage } = useTeacher()
  const reviews = useTeacher(s => s.reviews)
  const { groups } = useGroups()
  const { homework: allHomework } = useHomework()
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
        setTodaySchedule(data.map((s: any) => ({
          id: String(s.id),
          groupId: s.group_id,
          groupName: s.groups?.name ?? '',
          icon: s.groups?.icon ?? '📚',
          time: (s.time_start ?? '').slice(0, 5),
          endTime: (s.time_end ?? '').slice(0, 5),
          topic: s.lesson_title ?? '',
          lessonNumber: s.lesson_number ?? 0,
          subject: s.subject ?? '',
          status: (s.status ?? 'upcoming') as ScheduleItem['status'],
          studentCount: s.groups?.students?.[0]?.count ?? 0,
          color: s.groups?.color ?? '#9B6DFF',
          colorSoft: s.groups?.color_soft ?? 'var(--color-bg-3)',
        })))
      })
  }, [groups])

  const pendingHomework = allHomework.filter(hw => hw.status === 'active')
  const totalStudents = groups.reduce((a, g) => a + g.studentCount, 0)
  const TODAY = new Date().toISOString().split('T')[0]

  const reviewedFor = (hwId: string) => Object.keys(reviews[hwId] ?? {}).length
  const pendingCount = pendingHomework.reduce((a, hw) => a + Math.max(0, hw.submittedCount - reviewedFor(hw.id)), 0)

  const reminders: Reminder[] = [
    ...pendingHomework.filter(hw => hw.submittedCount > 0).map(hw => ({
      id: `hw-${hw.id}`,
      type: 'check-hw' as Reminder['type'],
      text: `Проверить ДЗ — ${hw.groupName}`,
      detail: `${hw.submittedCount} из ${hw.totalCount} сдали`,
      urgency: 'high' as Reminder['urgency'],
    })),
    ...allStudents.filter(s => s.paymentDue && diffDays(s.paymentDue, TODAY) <= 7).map(s => ({
      id: `pay-${s.id}`,
      type: 'payment-debt' as Reminder['type'],
      text: `Оплата — ${s.name.split(' ')[0]}`,
      detail: s.paymentAmount ? `${s.paymentAmount.toLocaleString('ru-RU')} ₽` : '',
      urgency: (diffDays(s.paymentDue!, TODAY) < 0 ? 'high' : 'medium') as Reminder['urgency'],
    })),
  ]

  const reminderDone = (r: Reminder) =>
    r.type === 'check-hw' &&
    pendingHomework.some(hw => r.text.includes(hw.groupName) && reviewedFor(hw.id) >= hw.submittedCount)

  const nextLesson = todaySchedule.find(s => s.status === 'upcoming')

  return (
    // Scroll container lifted to viewport top — content scrolls under the topbar
    // progressive-blur strip (same recipe as student DashboardPage panels).
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0, marginTop: -100, paddingTop: 100, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      {/* ── Stats row ── */}
      <section style={{ padding: '0 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <StatCard
            icon={Users} label="Студентов" value={totalStudents}
            sub={`${groups.length} группы`}
            accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)" delay={0.05}
          />
          <StatCard
            icon={ClipboardCheck} label="Проверить ДЗ" value={pendingCount}
            sub="ждут ревью"
            accentBg="var(--color-red-soft)" accentColor="var(--color-red-text)" delay={0.1}
          />
          <StatCard
            icon={Clock} label="Уроков сегодня" value={todaySchedule.length}
            sub={nextLesson ? `следующий в ${nextLesson.time}` : 'все завершены'}
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
                Расписание сегодня
              </CardTitle>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {todaySchedule.map(item => (
                  <ScheduleRow key={item.id} item={item} />
                ))}
              </div>
              {/* Pending HW summary */}
              {pendingHomework.length > 0 && (
                <div style={{
                  marginTop: 14, paddingTop: 12,
                  borderTop: '1px solid var(--color-border-soft)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', marginBottom: 2 }}>
                    ДЗ на проверку
                  </div>
                  {pendingHomework.map(hw => {
                    const left = Math.max(0, hw.submittedCount - reviewedFor(hw.id))
                    const grp = groups.find(g => g.id === hw.groupId)
                    return (
                      <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{grp?.icon ?? '📋'}</span>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hw.groupName} — {hw.title}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: left === 0 ? 'var(--color-green-text)' : '#F48B91',
                          background: left === 0 ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                          borderRadius: 6, padding: '1px 7px',
                        }}>
                          {left === 0 ? 'готово ✓' : `${left} непров.`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
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
                Напоминания
              </CardTitle>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column', gap: 7,
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 12px, black calc(100% - 20px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12px, black calc(100% - 20px), transparent 100%)',
                  paddingBlock: 8,
                }}>
                  {reminders.map(r => (
                    <ReminderRow key={r.id} item={r} done={reminderDone(r)} />
                  ))}
                  <PaymentBlock students={allStudents} groups={groups} />
                </div>
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
