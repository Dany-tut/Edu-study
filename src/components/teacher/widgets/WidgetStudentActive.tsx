import { CheckCircle2 } from '../../icons/appIcons'
import MiniStatCard from './_MiniStatCard'
import { studentBalanceStats } from '../../../lib/studentWidgetStats'
import { useAllStudents } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentActive() {
  const t = useT()
  const allStudents = useAllStudents()
  const { active } = studentBalanceStats(allStudents)
  return (
    <MiniStatCard
      icon={CheckCircle2} label={t('Активных')}
      value={active}
      sub={t('без задолженностей')}
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
