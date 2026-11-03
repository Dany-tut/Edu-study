import { Users } from '../../icons/appIcons'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentCount() {
  const t = useT()
  const { groups, loading } = useGroups()
  const allStudents = useAllStudents()
  return (
    <MiniStatCard widgetId="student-count"
      loading={loading}
      icon={Users} label={t('Карточек учеников')}
      value={allStudents.length}
      sub={`${t('в')} ${groups.length} ${t('группах')}`}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
