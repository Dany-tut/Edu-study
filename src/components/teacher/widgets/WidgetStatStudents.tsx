import { Users } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'

export default function WidgetStatStudents() {
  const { groups, totalStudents } = useHomeData()
  return (
    <MiniStatCard
      icon={Users} label="Студентов" value={totalStudents}
      sub={`в ${groups.length} группах`}
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
