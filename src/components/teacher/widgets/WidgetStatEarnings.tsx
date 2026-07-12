import { TrendingUp } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useT } from '../../../lib/i18n'

export default function WidgetStatEarnings() {
  const t = useT()
  return (
    <MiniStatCard
      icon={TrendingUp} label={t('За месяц')} value="—"
      sub={t('будет позже')}
      accentBg="var(--color-yellow-soft)" accentColor="var(--color-yellow-text)"
      dimmed
    />
  )
}
