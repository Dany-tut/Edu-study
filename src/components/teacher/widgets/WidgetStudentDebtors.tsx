import { AlertCircle } from '../../icons/appIcons'
import MiniStatCard from './_MiniStatCard'
import { studentBalanceStats } from '../../../lib/studentWidgetStats'
import { useAllStudents } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentDebtors() {
  const t = useT()
  const allStudents = useAllStudents()
  const { debtors } = studentBalanceStats(allStudents)
  return (
    <MiniStatCard
      icon={AlertCircle} label={t('Должников')}
      value={debtors}
      sub={t('требуют внимания')}
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
