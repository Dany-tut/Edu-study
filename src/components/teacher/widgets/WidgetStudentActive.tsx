import { CheckCircle2 } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentActive() {
  const t = useT()
  const allStudents = useAllStudents()
  const active = allStudents.filter(s => !s.paymentDue || new Date(s.paymentDue) >= new Date()).length
  return (
    <MiniStatCard
      icon={CheckCircle2} label={t('Активных')}
      value={active}
      sub={t('без задолженностей')}
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
