import { Users } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentCount() {
  const t = useT()
  const { groups, loading } = useGroups()
  const allStudents = useAllStudents()
  return (
    <MiniStatCard
      loading={loading}
      icon={Users} label={t('Учеников')}
      value={allStudents.length}
      sub={`${t('в')} ${groups.length} ${t('группах')}`}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
