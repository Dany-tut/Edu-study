import { motion } from 'framer-motion'
import { useState } from 'react'
import CreateTaskModal from '../../components/teacher/CreateTaskModal'
import {
  Users, ClipboardCheck, BookOpen, TrendingUp,
  Clock, CheckCircle2, Circle, Plus, Send, Download, UserPlus,
  AlertCircle, Layers, Bell, Banknote,
} from 'lucide-react'
import {
  groups, todaySchedule, pendingHomework, reminders, students,
  getTotalPendingHw,
  type ScheduleItem, type Reminder,
} from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'
import type { TeacherTask } from '../../store/teacherStore'

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
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
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
    <div style={{ fontSize: 13, fontWeight: 700, color: '#6F6F76', letterSpacing: 0.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────
const WEEKLY_EARNED = 18400
const WEEKLY_GOAL   = 25000
const MONTHLY_EARNED = 74600
const MONTHLY_GOAL   = 100000

function EarningsCard({ delay }: { delay: number }) {
  const pct = Math.min(100, Math.round((MONTHLY_EARNED / MONTHLY_GOAL) * 100))
  return (
    <motion.div {...fadeUp(delay)} style={{ flex: 1, minWidth: 0 }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6F6F76' }}>За месяц</span>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: '#FFF9CC', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} strokeWidth={2} style={{ color: '#7a6500' }} />
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 750, color: '#0B0B0D', lineHeight: 1 }}>
          {MONTHLY_EARNED.toLocaleString('ru-RU')} ₽
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            height: 5, borderRadius: 99,
            background: '#F0EEF5', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #9B6DCC, #7B3FCC)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#7a6500',
              background: '#FFF9CC', borderRadius: 8, padding: '3px 8px',
            }}>
              {pct}% цели
            </span>
            <span style={{ fontSize: 10, color: '#9A9AA2' }}>
              цель {MONTHLY_GOAL.toLocaleString('ru-RU')} ₽
            </span>
          </div>
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
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6F6F76' }}>{label}</span>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} strokeWidth={2} style={{ color: accentColor }} />
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 750, color: '#0B0B0D', lineHeight: 1, marginBottom: 6 }}>{value}</div>
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
          <Circle size={18} strokeWidth={1.8} style={{ color: '#C2C2C8' }} />
        )}
      </div>

      {/* Time */}
      <span style={{ fontSize: 13, fontWeight: 600, color: '#6F6F76', flexShrink: 0, width: 38 }}>
        {item.time}
      </span>

      {/* Group chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: item.colorSoft, borderRadius: 8, padding: '3px 9px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0D' }}>{item.groupName}</span>
      </div>

      {/* Topic */}
      <span style={{ fontSize: 13, color: '#3A3A40', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.topic}
      </span>

      {/* Student count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: '#9A9AA2' }}>
        <Users size={13} strokeWidth={1.8} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.studentCount}</span>
      </div>
    </motion.button>
  )
}

// ─── Payment block ───────────────────────────────────────────────────────────
const TODAY = '2026-06-10'

function diffDays(isoA: string, isoB: string) {
  return Math.round((new Date(isoA).getTime() - new Date(isoB).getTime()) / 86400000)
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function PaymentBlock() {
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
                  <div style={{ fontSize: 12, fontWeight: 650, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                  </div>
                  <div style={{ fontSize: 10, color: '#8A8A94' }}>{group?.name ?? ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {s.paymentAmount && (
                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{s.paymentAmount.toLocaleString('ru-RU')} ₽</div>
                  )}
                  <div style={{ fontSize: 10, color: '#8A8A94' }}>{formatDue(s.paymentDue!)}</div>
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
      borderRadius: 14, border: '1px solid #EEE', padding: '12px 14px',
      background: '#FAFAFA',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Banknote size={13} strokeWidth={2} style={{ color: '#8A8A94' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6F6F76', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Оплата
        </span>
      </div>
      <Section label="Просрочено" color="#E04848" bg="#FFF0F0" items={overdue} />
      <Section label="На этой неделе" color="#D07020" bg="#FFF5E6" items={thisWeek} />
      <Section label="В этом месяце" color="#5A7A9A" bg="#F0F5FA" items={thisMonth} />
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
const urgencyColor = { high: '#F48B91', medium: '#F8C991', low: '#C2C2C8' }
const urgencyBg = { high: '#FFE1E4', medium: '#FFE4BD', low: '#F5F5F6' }

function ReminderRow({ item, done }: { item: Reminder; done?: boolean }) {
  const Icon = done ? CheckCircle2 : reminderIcons[item.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 12,
      background: done ? '#DFF8D6' : urgencyBg[item.urgency],
      opacity: done ? 0.85 : 1,
      transition: 'background 0.25s, opacity 0.25s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: done ? 'rgba(26,122,63,0.18)' : urgencyColor[item.urgency] + '44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} strokeWidth={2} style={{ color: done ? '#1a7a3f' : urgencyColor[item.urgency] }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 650,
          color: done ? '#1a7a3f' : '#0B0B0D',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{ fontSize: 11, color: '#6F6F76', marginTop: 1 }}>{done ? 'Готово' : item.detail}</div>
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
        background: 'rgba(255,255,255,0.6)',
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
              background: '#EEDBFF', borderRadius: 8, padding: '2px 8px',
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
                background: task.done ? '#F8F7FC' : '#FDFCFF',
                border: `1px solid ${task.done ? '#EEEAF5' : '#E8E0F5'}`,
                opacity: task.done ? 0.6 : 1,
                transition: 'opacity 0.2s, background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = task.done ? '#F3F1FA' : '#F5F0FF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = task.done ? '#F8F7FC' : '#FDFCFF' }}
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
                color: task.done ? '#9A9AA2' : '#0B0B0D',
                textDecoration: task.done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {task.title || (task.typeLabel ?? 'Задача')}
              </span>

              {/* Date + time */}
              <span style={{ fontSize: 11, color: '#9A9AA2', flexShrink: 0 }}>
                {task.date}{task.time ? ` · ${task.time}` : ''}
              </span>

              {/* Remove */}
              <button
                onClick={e => { e.stopPropagation(); removeTask(task.id) }}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: '#C2C2C8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, lineHeight: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F48B91' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C2C2C8' }}
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
  const totalStudents = groups.reduce((a, g) => a + g.studentCount, 0)

  // A check-hw reminder is "done" once every submitted work for its group has a
  // verdict from the review flow. Pending count drops by what's been reviewed.
  const reviewedFor = (hw: typeof pendingHomework[number]) =>
    Math.max(hw.reviewedCount, Object.keys(reviews[hw.id] ?? {}).length)
  const pendingCount = pendingHomework.reduce((a, hw) => a + (hw.submittedCount - reviewedFor(hw)), 0)
  const reminderDone = (r: Reminder) =>
    r.type === 'check-hw' &&
    pendingHomework.some(hw => r.text.includes(hw.groupName) && reviewedFor(hw) >= hw.submittedCount)

  const nextLesson = todaySchedule.find(s => s.status === 'upcoming')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>
      {/* ── Stats row ── */}
      <section style={{ padding: '0 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <StatCard
            icon={Users} label="Студентов" value={totalStudents}
            sub={`${groups.length} группы`}
            accentBg="#DFF8D6" accentColor="#1a7a3f" delay={0.05}
          />
          <StatCard
            icon={ClipboardCheck} label="Проверить ДЗ" value={pendingCount}
            sub="ждут ревью"
            accentBg="#FFE1E4" accentColor="#c0303a" delay={0.1}
          />
          <StatCard
            icon={Clock} label="Уроков сегодня" value={todaySchedule.length}
            sub={nextLesson ? `следующий в ${nextLesson.time}` : 'все завершены'}
            accentBg="#EEDBFF" accentColor="#7B3FCC" delay={0.15}
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
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6F6F76', marginBottom: 2 }}>
                    ДЗ на проверку
                  </div>
                  {pendingHomework.map(hw => {
                    const left = hw.submittedCount - reviewedFor(hw)
                    return (
                      <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{hw.icon}</span>
                        <span style={{ flex: 1, fontSize: 12, color: '#3A3A40', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hw.groupName} — {hw.title}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: left === 0 ? '#1a7a3f' : '#F48B91',
                          background: left === 0 ? '#DFF8D6' : '#FFE1E4',
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
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7,
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 12px, black calc(100% - 20px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12px, black calc(100% - 20px), transparent 100%)',
                  paddingBlock: 8,
                }}>
                  {reminders.map(r => (
                    <ReminderRow key={r.id} item={r} done={reminderDone(r)} />
                  ))}
                  <PaymentBlock />
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
