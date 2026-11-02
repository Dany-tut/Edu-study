import MiniStatCard from './_MiniStatCard'
import type { LucideIcon } from '../../icons/appIcons'
import { motion } from 'framer-motion'
import { Users, ClipboardCheck, Clock, TrendingUp } from '../../icons/appIcons'
import { useHomeData } from '../../../lib/useHomeData'
import { mskToVietnam } from '../../../lib/utils'
import { useT } from '../../../lib/i18n'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
})

function EarningsCard({ delay }: { delay: number }) {
  const t = useT()
  return <StatCard icon={TrendingUp} label={t('За месяц')} value={t('Нет данных')} sub={t('будет позже')}
    accentBg="var(--color-yellow-soft)" accentColor="var(--color-yellow-text)" delay={delay} />
}
function StatCard({ icon, label, value, sub, accentBg, accentColor, delay }: {
  icon: LucideIcon; label: string; value: string | number; sub: string; accentBg: string; accentColor: string; delay: number
}) {
  return <motion.div {...fadeUp(delay)} className="iskra-widget" data-stat style={{ flex: '1 1 0', minWidth: 0, height: '100%' }}>
    <MiniStatCard icon={icon} label={label} value={value} sub={sub} accentBg={accentBg} accentColor={accentColor} />
  </motion.div>
}

export default function WidgetTodayStats() {
  const t = useT()
  const { groups, totalStudents, pendingCount, todaySchedule, nextLesson } = useHomeData()

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 10, width: '100%', height: '100%' }}>
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
    </div>
  )
}
