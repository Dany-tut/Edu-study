import { TrendingUp } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'

export default function WidgetStatEarnings() {
  return (
    <MiniStatCard
      icon={TrendingUp} label="За месяц" value="—"
      sub="будет позже"
      accentBg="var(--color-yellow-soft)" accentColor="var(--color-yellow-text)"
      dimmed
    />
  )
}
