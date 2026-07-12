import { AlertCircle } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentDebtors() {
  const t = useT()
  const allStudents = useAllStudents()
  const TODAY = new Date().toISOString().split('T')[0]
  const debtors = allStudents.filter(s => s.paymentDue && s.paymentDue < TODAY).length
  return (
    <MiniStatCard
      icon={AlertCircle} label={t('Должников')}
      value={debtors}
      sub={t('требуют внимания')}
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
