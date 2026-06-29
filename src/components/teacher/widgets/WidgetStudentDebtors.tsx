import { AlertCircle } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents } from '../../../lib/useGroups'

export default function WidgetStudentDebtors() {
  const allStudents = useAllStudents()
  const TODAY = new Date().toISOString().split('T')[0]
  const debtors = allStudents.filter(s => s.paymentDue && s.paymentDue < TODAY).length
  return (
    <MiniStatCard
      icon={AlertCircle} label="Должников"
      value={debtors}
      sub="требуют внимания"
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
