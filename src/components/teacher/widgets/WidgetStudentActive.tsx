import { CheckCircle2 } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents } from '../../../lib/useGroups'

export default function WidgetStudentActive() {
  const allStudents = useAllStudents()
  const active = allStudents.filter(s => !s.paymentDue || new Date(s.paymentDue) >= new Date()).length
  return (
    <MiniStatCard
      icon={CheckCircle2} label="Активных"
      value={active}
      sub="без задолженностей"
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
