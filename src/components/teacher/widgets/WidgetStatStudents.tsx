import { Users } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'
import { useT } from '../../../lib/i18n'

export default function WidgetStatStudents() {
  const t = useT()
  const { groups, totalStudents, loading } = useHomeData()
  return (
    <MiniStatCard
      loading={loading}
      icon={Users} label={t('Студентов')} value={totalStudents}
      sub={`${t('в')} ${groups.length} ${t('группах')}`}
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
