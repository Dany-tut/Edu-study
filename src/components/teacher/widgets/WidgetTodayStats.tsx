import { motion } from 'framer-motion'
import { Users, ClipboardCheck, Clock, TrendingUp } from 'lucide-react'
import { useHomeData } from '../../../lib/useHomeData'
import { mskToVietnam } from '../../../lib/utils'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] },
})

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
      padding: 20,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

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

export default function WidgetTodayStats() {
  const { groups, totalStudents, pendingCount, todaySchedule, nextLesson } = useHomeData()

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 14, width: '100%' }}>
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
          sub={nextLesson ? `следующий в ${nextLesson.time} МСК (${mskToVietnam(nextLesson.time)} ВН)` : 'все завершены'}
          accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)" delay={0.15}
        />
        <EarningsCard delay={0.2} />
      </div>
    </div>
  )
}
