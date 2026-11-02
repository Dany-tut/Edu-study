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
    <MiniStatCard widgetId="student-debtors"
      icon={AlertCircle} label={t('Минус по занятиям')}
      value={debtors}
      sub={t('требуют внимания')}
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
