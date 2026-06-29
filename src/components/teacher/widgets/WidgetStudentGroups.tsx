import { Layers } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useGroups } from '../../../lib/useGroups'

export default function WidgetStudentGroups() {
  const { groups } = useGroups()
  return (
    <MiniStatCard
      icon={Layers} label="Групп"
      value={groups.length}
      sub="активных"
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
