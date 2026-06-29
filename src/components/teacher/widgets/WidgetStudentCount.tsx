import { Users } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useAllStudents, useGroups } from '../../../lib/useGroups'

export default function WidgetStudentCount() {
  const { groups } = useGroups()
  const allStudents = useAllStudents()
  return (
    <MiniStatCard
      icon={Users} label="Учеников"
      value={allStudents.length}
      sub={`в ${groups.length} группах`}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
