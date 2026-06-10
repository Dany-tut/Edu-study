import { motion } from 'framer-motion'
import {
  Users, ClipboardCheck, BookOpen, TrendingUp,
  Clock, CheckCircle2, Circle, Plus, Send, Download, UserPlus,
  AlertCircle, Layers, Bell,
} from 'lucide-react'
import {
  groups, todaySchedule, pendingHomework, reminders, recentActivity,
  students, getTotalPendingHw, getAvgScore,
  type ScheduleItem, type Reminder, type RecentActivity,
} from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'

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
        <div style={{ fontSize: 36, fontWeight: 750, color: '#0B0B0D', lineHeight: 1 }}>{value}</div>
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
  const { setActivePage } = useTeacher()
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.025)' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => setActivePage('groups')}
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
        display: 'flex', alignItems: 'center', gap: 6,
        background: item.colorSoft, borderRadius: 8, padding: '3px 9px', flexShrink: 0,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
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

// ─── Reminder row ───────────────────────────────────────────────────────────
const reminderIcons: Record<Reminder['type'], React.ElementType> = {
  'check-hw': ClipboardCheck,
  'fill-widget': Layers,
  'make-trainer': BookOpen,
  'send-push': Bell,
}
const urgencyColor = { high: '#F48B91', medium: '#F8C991', low: '#C2C2C8' }
const urgencyBg = { high: '#FFE1E4', medium: '#FFE4BD', low: '#F5F5F6' }

function ReminderRow({ item }: { item: Reminder }) {
  const Icon = reminderIcons[item.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 12,
      background: urgencyBg[item.urgency],
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: urgencyColor[item.urgency] + '44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} strokeWidth={2} style={{ color: urgencyColor[item.urgency] }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{ fontSize: 11, color: '#6F6F76', marginTop: 1 }}>{item.detail}</div>
        )}
      </div>
      {item.urgency === 'high' && (
        <AlertCircle size={13} strokeWidth={2} style={{ color: '#F48B91', flexShrink: 0 }} />
      )}
    </div>
  )
}

// ─── Activity row ───────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: RecentActivity }) {
  const initials = item.studentName.split(' ').slice(0, 2).map(w => w[0]).join('')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, hsl(264 60% 78%), hsl(278 58% 65%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 700,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.studentName}
          <span style={{ color: '#9A9AA2', fontWeight: 500 }}> · {item.groupName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#6F6F76' }}>{item.detail}</div>
      </div>
      <span style={{ fontSize: 10, color: '#9A9AA2', flexShrink: 0 }}>{item.time}</span>
    </div>
  )
}

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

// ─── Main component ─────────────────────────────────────────────────────────
export default function TeacherHome() {
  const { setActivePage } = useTeacher()
  const totalStudents = groups.reduce((a, g) => a + g.studentCount, 0)
  const pendingCount = getTotalPendingHw(pendingHomework)
  const avgScore = getAvgScore(students)
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
          <StatCard
            icon={TrendingUp} label="Средний балл" value={avgScore}
            sub="по всем группам"
            accentBg="#FFF9CC" accentColor="#7a6500" delay={0.2}
          />
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
                  {pendingHomework.map(hw => (
                    <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: hw.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: '#3A3A40', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hw.groupName} — {hw.title}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#F48B91',
                        background: '#FFE1E4', borderRadius: 6, padding: '1px 7px',
                      }}>
                        {hw.submittedCount - hw.reviewedCount} непров.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Recent activity */}
          <motion.div {...fadeUp(0.28)}>
            <Card>
              <CardTitle>
                <TrendingUp size={14} strokeWidth={2} />
                Последняя активность
              </CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivity.map(item => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            </Card>
          </motion.div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
                {reminders.map(r => (
                  <ReminderRow key={r.id} item={r} />
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Quick actions */}
          <motion.div {...fadeUp(0.24)}>
            <Card>
              <CardTitle>
                <Plus size={14} strokeWidth={2.2} />
                Быстрые действия
              </CardTitle>
              <div style={{ display: 'flex', gap: 8 }}>
                <QuickAction
                  icon={ClipboardCheck} label="Выдать ДЗ"
                  bg="#DFF8D6" color="#1a7a3f"
                  onClick={() => setActivePage('homework')}
                />
                <QuickAction
                  icon={UserPlus} label="Добавить студента"
                  bg="#EEDBFF" color="#7B3FCC"
                  onClick={() => setActivePage('groups')}
                />
                <QuickAction
                  icon={Send} label="Пуш / СМС"
                  bg="#FFE4BD" color="#8B4900"
                />
                <QuickAction
                  icon={Download} label="Экспорт"
                  bg="#F5F5F6" color="#3A3A40"
                  onClick={() => setActivePage('gradebook')}
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
