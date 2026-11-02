import MiniStatCard from './_MiniStatCard'
import { studentBalanceStats } from '../../../lib/studentWidgetStats'
import type { LucideIcon } from '../../icons/appIcons'
import { Users, Layers, CheckCircle2, AlertCircle } from '../../icons/appIcons'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

type StatCardProps = {
  icon: LucideIcon
  label: string
  value: number
  sub: string
  accentBg: string
  accentColor: string
}

function StatCard({ icon: Icon, label, value, sub, accentBg, accentColor }: StatCardProps) {
  return <div className="iskra-widget" data-stat style={{ flex: '1 1 0', minWidth: 0, height: '100%' }}>
    <MiniStatCard icon={Icon} label={label} value={value} sub={sub} accentBg={accentBg} accentColor={accentColor} />
  </div>
}

export default function WidgetStudentStats() {
  const t = useT()
  const students = useAllStudents()
  const { groups } = useGroups()

  const totalStudents  = students.length
  const totalGroups    = groups.length
  const { active: activeStudents, debtors: debtStudents } = studentBalanceStats(students)

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <StatCard
        icon={Users}
        label={t('Учеников')}
        value={totalStudents}
        sub={`${t('в')} ${totalGroups} ${t('группах')}`}
        accentBg="var(--color-purple-soft)"
        accentColor="var(--color-accent)"
      />
      <StatCard
        icon={Layers}
        label={t('Групп')}
        value={totalGroups}
        sub={t('активных')}
        accentBg="var(--color-blue-pill-bg, rgba(59,91,219,0.12))"
        accentColor="#3B5BDB"
      />
      <StatCard
        icon={CheckCircle2}
        label={t('Активных')}
        value={activeStudents}
        sub={t('без задолженностей')}
        accentBg="var(--color-green-soft)"
        accentColor="var(--color-green-text)"
      />
      <StatCard
        icon={AlertCircle}
        label={t('Должников')}
        value={debtStudents}
        sub={debtStudents > 0 ? t('требуют внимания') : t('всё в порядке')}
        accentBg={debtStudents > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
        accentColor={debtStudents > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
      />
    </div>
  )
}
